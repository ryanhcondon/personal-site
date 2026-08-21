// The pipeline a save actually runs: sanitise what the browser sent, splice it
// into the real file, and check the damage is confined to one line.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { replaceRegion, readRegion } from '../lib/regions.js';
import { sanitize } from '../lib/sanitize.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const applied = (html, id, incoming) => replaceRegion(html, id, sanitize(incoming));

test('editing one sentence changes exactly one line of the file', () => {
  const next = applied(index, 'about-p-3', 'I am looking for somewhere interesting to work.');
  const a = index.split('\n'), b = next.split('\n');
  assert.equal(a.length, b.length);
  const changed = a.map((l, i) => (l === b[i] ? null : i)).filter((i) => i !== null);
  assert.equal(changed.length, 1, `expected 1 changed line, got ${changed.length}`);
  assert.match(b[changed[0]], /somewhere interesting to work/);
});

test('paste garbage cannot reach the file', () => {
  const next = applied(index, 'about-p-3',
    '<span style="font-family:Calibri"><b>Clean</b></span><script>alert(1)</script>');
  // Scoped to the region: the file legitimately contains <script> elsewhere
  // (the theme switcher, and the editor itself).
  const region = readRegion(next, 'about-p-3');
  assert.equal(region, '<b>Clean</b>alert(1)');
  assert.ok(!region.includes('<script'));
  assert.ok(!region.includes('Calibri'));
});

test('an edit that keeps a link keeps its attributes', () => {
  const original = readRegion(index, 'about-p-2');
  assert.ok(original.includes('href="https://qeepsake.com"'));
  const next = applied(index, 'about-p-2', original);
  assert.match(readRegion(next, 'about-p-2'), /href="https:\/\/qeepsake\.com"/);
  assert.match(readRegion(next, 'about-p-2'), /rel="noopener noreferrer"/);
});

test('the rest of the document is byte-identical after an edit', () => {
  const id = 'about-p-3';
  const next = applied(index, id, 'Short.');
  // Everything before the region and everything after it must be untouched.
  const before = index.indexOf('<p data-edit="about-p-3"');
  assert.equal(next.slice(0, before), index.slice(0, before));
  assert.equal(next.slice(next.indexOf('</p>', before)), index.slice(index.indexOf('</p>', before)));
});
