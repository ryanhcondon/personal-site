// The splicer is the only code here that can corrupt the site's source, so the
// cases that matter are the ones where it should REFUSE rather than guess.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listRegions, findRegion, readRegion, replaceRegion } from '../lib/regions.js';

test('reads a region and leaves every other byte alone', () => {
  const html = `<p data-edit="a">old</p>\n<p>untouched</p>`;
  assert.equal(readRegion(html, 'a'), 'old');
  assert.equal(replaceRegion(html, 'a', 'new'), `<p data-edit="a">new</p>\n<p>untouched</p>`);
});

test('nested elements of the same name do not end the region early', () => {
  const html = `<div data-edit="a">one <div>two</div> three</div><div>after</div>`;
  assert.equal(readRegion(html, 'a'), 'one <div>two</div> three');
  assert.equal(replaceRegion(html, 'a', 'X'), `<div data-edit="a">X</div><div>after</div>`);
});

test("a '>' inside an attribute value does not terminate the tag", () => {
  const html = `<p data-edit="a" title="1 > 0">body</p>`;
  assert.equal(readRegion(html, 'a'), 'body');
});

test('a close tag inside a comment is ignored', () => {
  const html = `<div data-edit="a">x<!-- </div> -->y</div>`;
  assert.equal(readRegion(html, 'a'), 'x<!-- </div> -->y');
});

test('a void element inside the region does not unbalance it', () => {
  const html = `<p data-edit="a">a<br>b<img src="x.png">c</p>`;
  assert.equal(readRegion(html, 'a'), 'a<br>b<img src="x.png">c');
});

test('links inside a region survive a read', () => {
  const html = `<p data-edit="a">see <a href="https://x.com" target="_blank">this</a>.</p>`;
  assert.equal(readRegion(html, 'a'), 'see <a href="https://x.com" target="_blank">this</a>.');
});

test('an unknown id reads as null and refuses to write', () => {
  const html = `<p data-edit="a">x</p>`;
  assert.equal(readRegion(html, 'nope'), null);
  assert.throws(() => replaceRegion(html, 'nope', 'y'), /no region called/);
});

test('a duplicated id is refused rather than guessed at', () => {
  const html = `<p data-edit="a">one</p><p data-edit="a">two</p>`;
  assert.throws(() => findRegion(html, 'a'), /appears 2 times/);
});

test('an unclosed tag is refused rather than swallowing the rest of the file', () => {
  const html = `<div data-edit="a">forever`;
  assert.throws(() => findRegion(html, 'a'), /unclosed <div>/);
});

test('a void or self-closing element cannot be a region', () => {
  assert.throws(() => findRegion(`<br data-edit="a">`, 'a'), /cannot hold editable content/);
  assert.throws(() => findRegion(`<div data-edit="a"/>`, 'a'), /self-closing/);
});

test('an id that looks like a regex is matched literally', () => {
  const html = `<p data-edit="a.b">x</p><p data-edit="axb">y</p>`;
  assert.equal(readRegion(html, 'a.b'), 'x');
});

test('listRegions reports ids in source order', () => {
  assert.deepEqual(listRegions(`<p data-edit="b">1</p><p data-edit="a">2</p>`), ['b', 'a']);
});

// The real files are the case that actually matters.
for (const file of ['index.html', 'portfolio.html']) {
  test(`every region in ${file} round-trips unchanged`, () => {
    const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const ids = listRegions(html);
    for (const id of ids) {
      assert.equal(replaceRegion(html, id, readRegion(html, id)), html,
        `${id} did not round-trip`);
    }
  });
}
