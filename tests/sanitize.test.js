import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize } from '../lib/sanitize.js';

test('keeps the vocabulary the site actually uses', () => {
  const html = 'a <strong>bold</strong> and <em>italic</em> and <a href="https://x.com">link</a>';
  assert.equal(sanitize(html), html);
});

test('strips scripts, and their content is not executed as markup', () => {
  assert.equal(sanitize('hi <script>alert(1)</script> there'), 'hi alert(1) there');
  assert.equal(sanitize('<img src=x onerror=alert(1)>'), '');
});

test('drops paste noise but keeps the words', () => {
  const pasted = '<span style="font-size:11pt"><font face="Arial">Hello</font></span>';
  assert.equal(sanitize(pasted), 'Hello');
});

test('refuses a javascript: href by dropping the link', () => {
  assert.equal(sanitize('<a href="javascript:alert(1)">x</a>'), 'x');
  assert.equal(sanitize('<a href="/portfolio.html">x</a>'), '<a href="/portfolio.html">x</a>');
  assert.equal(sanitize('<a href="mailto:a@b.com">x</a>'), '<a href="mailto:a@b.com">x</a>');
});

test('adds rel to a new tab link that lacks one', () => {
  assert.equal(sanitize('<a href="https://x.com" target="_blank">x</a>'),
    '<a href="https://x.com" target="_blank" rel="noopener noreferrer">x</a>');
});

test('never returns unbalanced markup', () => {
  assert.equal(sanitize('<strong>unclosed'), '<strong>unclosed</strong>');
  assert.equal(sanitize('stray </em> close'), 'stray close');
});

test('collapses the whitespace contenteditable leaves behind', () => {
  assert.equal(sanitize('  a\n\n   b  '), 'a b');
});

test('a bare < is treated as text, not a tag', () => {
  assert.equal(sanitize('1 < 2'), '1 &lt; 2');
});
