// Finding, and surgically replacing, one editable region inside a source file.
//
// WHY NOT PARSE THE HTML. The obvious approach — parse to a DOM, set
// innerHTML, serialise — reformats the entire file on every save: attribute
// order, quoting, whitespace and self-closing style all get normalised to
// whatever the parser prefers. The diff for fixing one typo would be the whole
// file, in a public repo whose history is worth reading. So this works on the
// source TEXT and splices exactly the byte range between a region's tags.
// Everything outside that range is untouched, and `git diff` shows the sentence
// that changed.
//
// This is not a general HTML parser and must not become one. It handles the
// subset that appears in a hand-written page: nested elements of the same name,
// quoted attribute values that may contain '<' or '>', comments, and void
// elements. Anything it cannot understand it refuses, rather than guessing and
// corrupting the file.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** Every id on the page, in source order. */
export function listRegions(html) {
  const ids = [];
  const re = /\sdata-edit\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) ids.push(m[1]);
  return ids;
}

/**
 * The half-open range [start, end) of a region's INNER content.
 *
 * Returns null when the id is absent, and throws when the markup around it is
 * something this scanner should not be trusted with — an unclosed tag, or an id
 * used twice. A throw here becomes a refused save, which is the right outcome:
 * the alternative is writing a mangled resume to a live site.
 */
export function findRegion(html, id) {
  const marker = new RegExp(`\\sdata-edit\\s*=\\s*"${escapeRe(id)}"`, 'g');
  const hits = [...html.matchAll(marker)];
  if (hits.length === 0) return null;
  if (hits.length > 1) throw new Error(`data-edit="${id}" appears ${hits.length} times — ids must be unique`);

  // Back up from the attribute to the '<' that opens its tag.
  const lt = html.lastIndexOf('<', hits[0].index);
  if (lt < 0) throw new Error(`no opening tag for data-edit="${id}"`);
  const nameMatch = /^<([a-zA-Z][\w-]*)/.exec(html.slice(lt, lt + 40));
  if (!nameMatch) throw new Error(`malformed opening tag for data-edit="${id}"`);
  const tag = nameMatch[1].toLowerCase();
  if (VOID.has(tag)) throw new Error(`<${tag}> cannot hold editable content`);

  const openEnd = endOfTag(html, lt);
  if (openEnd < 0) throw new Error(`unterminated <${tag}> for data-edit="${id}"`);
  if (html[openEnd - 2] === '/') throw new Error(`<${tag} data-edit="${id}"> is self-closing`);

  return { tag, start: openEnd, end: findClose(html, tag, openEnd, id), openStart: lt };
}

export function readRegion(html, id) {
  const r = findRegion(html, id);
  return r && html.slice(r.start, r.end);
}

/** The file, with one region's inner content replaced. */
export function replaceRegion(html, id, inner) {
  const r = findRegion(html, id);
  if (!r) throw new Error(`no region called "${id}" on this page`);
  return html.slice(0, r.start) + inner + html.slice(r.end);
}

// --- the scanner ----------------------------------------------------------

/** Index just past the '>' of the tag starting at `i`, skipping quoted values. */
function endOfTag(html, i) {
  let quote = null;
  for (let j = i + 1; j < html.length; j++) {
    const c = html[j];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '>') return j + 1;
  }
  return -1;
}

/**
 * Where the element opened at `from` closes.
 *
 * Counts nested elements of the SAME name only — that is all that can shift the
 * matching close tag, and tracking every element would mean caring about the
 * implicit-close rules for <p> and <li>, which this file must not depend on.
 */
function findClose(html, tag, from, id) {
  let depth = 1;
  let i = from;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;

    if (html.startsWith('<!--', lt)) {                 // comments can hold anything
      const close = html.indexOf('-->', lt);
      if (close < 0) break;
      i = close + 3;
      continue;
    }

    const close = html.startsWith('</', lt);
    const name = /^<\/?([a-zA-Z][\w-]*)/.exec(html.slice(lt, lt + 40));
    const end = endOfTag(html, lt);
    if (end < 0) break;

    if (name && name[1].toLowerCase() === tag && !VOID.has(tag)) {
      if (close) {
        depth--;
        if (depth === 0) return lt;
      } else if (html[end - 2] !== '/') {
        depth++;
      }
    }
    i = end;
  }
  throw new Error(`unclosed <${tag}> for data-edit="${id}"`);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
