// The serialiser's job is that a list survives a round trip unchanged, and that
// an edit changes only the lines it should.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItems, canonicalList } from '../lib/lists.js';
import { sanitize } from '../lib/sanitize.js';

test('parses a flat list', () => {
  const items = parseItems('<li>one</li><li>two</li>');
  assert.deepEqual(items.map((i) => i.html), ['one', 'two']);
});

test('parses a nested list', () => {
  const items = parseItems('<li>a<ul><li>a1</li><li>a2</li></ul></li><li>b</li>');
  assert.equal(items.length, 2);
  assert.equal(items[0].html, 'a');
  assert.deepEqual(items[0].children.map((i) => i.html), ['a1', 'a2']);
  assert.deepEqual(items[1].children, []);
});

test('emits one item per line at the given indent', () => {
  const out = canonicalList('<li>one</li><li>two</li>', 8);
  assert.equal(out, '\n            <li>one</li>\n            <li>two</li>\n        ');
});

test('an added bullet adds exactly one line', () => {
  const before = canonicalList('<li>one</li><li>two</li>', 8);
  const after = canonicalList('<li>one</li><li>two</li><li>three</li>', 8);
  assert.equal(after.split('\n').length, before.split('\n').length + 1);
});

test('editing a word changes exactly one line', () => {
  const before = canonicalList('<li>one</li><li>two</li><li>three</li>', 8).split('\n');
  const after = canonicalList('<li>one</li><li>TWO</li><li>three</li>', 8).split('\n');
  const diff = before.map((l, i) => (l === after[i] ? null : i)).filter((i) => i !== null);
  assert.equal(diff.length, 1);
});

test('empty bullets are dropped, so a stray Enter leaves nothing behind', () => {
  assert.equal(canonicalList('<li>one</li><li></li><li>two</li>', 0),
    '\n    <li>one</li>\n    <li>two</li>\n');
});

test('a list emptied entirely is refused rather than written', () => {
  assert.equal(canonicalList('', 4), null);
  assert.equal(canonicalList('<li></li>', 4), null);
});

test('a nested list the browser invented gets the site class', () => {
  const out = canonicalList('<li>a<ul><li>a1</li></ul></li>', 0);
  assert.match(out, /<ul class="experience-sublist">/);
});

test('paste noise inside a bullet does not survive', () => {
  const out = canonicalList('<li><span style="color:red"><b>keep</b></span></li>', 0);
  assert.equal(out.trim(), '<li><b>keep</b></li>');
});

test('links inside bullets survive with their attributes', () => {
  const out = canonicalList('<li>see <a href="https://x.com" target="_blank" rel="noopener noreferrer">this</a></li>', 0);
  assert.match(out, /<a href="https:\/\/x\.com" target="_blank" rel="noopener noreferrer">this<\/a>/);
});

test('structural tags are still stripped outside a list region', () => {
  assert.equal(sanitize('<ul><li>a</li></ul>'), 'a');
});

// The real pages. If canonical form differs from what is already in the file,
// then every save rewrites a whole list and the diffs become useless.
import { readFileSync } from 'node:fs';
import { listRegions, findRegion, readRegion } from '../lib/regions.js';

for (const file of ['index.html', 'portfolio.html']) {
  test(`every list in ${file} is already in canonical form`, () => {
    const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const id of listRegions(html)) {
      const r = findRegion(html, id);
      if (r.tag !== 'ul' && r.tag !== 'ol') continue;
      const indent = r.openStart - (html.lastIndexOf('\n', r.openStart) + 1);
      assert.equal(canonicalList(readRegion(html, id), indent), readRegion(html, id),
        `${id} is not in canonical form`);
    }
  });
}
