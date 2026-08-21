// Turning a list the browser handed back into HTML a person would have written.
//
// WHY THIS EXISTS. Making a whole <ul> editable is what lets Enter add a bullet
// and Backspace merge two — the browser does that natively, but only when the
// list markup is inside the editable region rather than around it. The cost is
// that innerHTML comes back as one unbroken line, and committing that would
// turn every list in the repo into a single 900-character row whose diffs say
// nothing.
//
// So the saved form is CANONICAL, not whatever came back: one <li> per line, at
// the indentation the file already uses. Two things follow, and both are the
// point. Editing a word still changes exactly one line. Adding a bullet adds
// exactly one line. The diff still reads like the edit.
//
// It also self-heals. contenteditable invents markup — stray nesting, empty
// items, attributes from a paste — and none of it survives a round trip
// through here, because the output is generated from a parsed tree rather than
// patched in place.

import { sanitize } from './sanitize.js';

const INDENT = 4;

/** The list, as a tree of { html, children }. */
export function parseItems(inner) {
  const items = [];
  let i = 0;
  while (i < inner.length) {
    const open = inner.indexOf('<li', i);
    if (open < 0) break;
    const bodyStart = inner.indexOf('>', open) + 1;
    const bodyEnd = matchingClose(inner, 'li', bodyStart);
    const body = inner.slice(bodyStart, bodyEnd);

    // A nested list, if this item has one, is everything from its <ul>.
    const nest = body.search(/<(ul|ol)\b/);
    if (nest < 0) {
      items.push({ html: body.trim(), children: [] });
    } else {
      const innerStart = body.indexOf('>', nest) + 1;
      const innerEnd = matchingClose(body, body.slice(nest + 1, nest + 3).toLowerCase(), innerStart);
      items.push({
        html: body.slice(0, nest).trim(),
        children: parseItems(body.slice(innerStart, innerEnd)),
      });
    }
    i = inner.indexOf('</li>', bodyEnd) + 5 || bodyEnd;
  }
  return items;
}

/** Back to indented source. `depth` is the nesting of the <ul> being filled. */
export function renderItems(items, baseIndent, depth = 0) {
  const pad = ' '.repeat(baseIndent + INDENT * (depth * 2 + 1));
  const out = [];
  for (const it of items) {
    if (!it.html && !it.children.length) continue;          // an empty bullet is not a bullet
    if (!it.children.length) {
      out.push(`${pad}<li>${it.html}</li>`);
    } else {
      const subPad = ' '.repeat(baseIndent + INDENT * (depth * 2 + 2));
      out.push(`${pad}<li>${it.html}`);
      out.push(`${subPad}<ul class="experience-sublist">`);
      out.push(renderItems(it.children, baseIndent, depth + 1));
      out.push(`${subPad}</ul>`);
      out.push(`${pad}</li>`);
    }
  }
  return out.join('\n');
}

/**
 * What actually gets written: sanitise, parse, re-emit.
 *
 * `baseIndent` is the column the <ul> tag itself starts at, so the result nests
 * under it exactly as the hand-written file already does.
 */
export function canonicalList(rawInner, baseIndent) {
  const items = parseItems(sanitize(rawInner, { lists: true }));
  const body = renderItems(items, baseIndent);
  // Checked AFTER rendering, not before: a list holding one empty <li> parses
  // to one item and renders to nothing, and "refuse to empty a list" has to
  // mean the output, not the input.
  if (!body.trim()) return null;
  return `\n${body}\n${' '.repeat(baseIndent)}`;
}

/** Where the element opened at `from` closes, counting same-name nesting. */
function matchingClose(s, tag, from) {
  let depth = 1, i = from;
  const re = new RegExp(`<(/?)${tag}\\b`, 'gi');
  re.lastIndex = from;
  let m;
  while ((m = re.exec(s))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index;
    i = re.lastIndex;
  }
  return s.length;
}
