// What a region is allowed to contain after it comes back from the browser.
//
// contenteditable is a firehose of markup nobody asked for: paste a sentence
// from a Google Doc and you get nested spans carrying inline styles, <font>
// tags, and class names referring to a stylesheet that does not exist here.
// Committing that to the repo would make the resume's source unreadable within
// a week, so the saved HTML is reduced to the small vocabulary the page
// actually uses.
//
// It is also the XSS boundary. Only Ryan can save, so this is not the main line
// of defence — but "the only writer is trusted" stops being true the moment a
// token leaks, and a stored <script> on a resume site is a bad day.

const ALLOWED = {
  a: ['href', 'target', 'rel', 'title'],
  em: [], strong: [], b: [], i: [], code: [], br: [], sup: [], sub: [],
};
const VOID = new Set(['br']);

// Anything that can navigate or execute. Relative and anchor links are fine.
const SAFE_HREF = /^(https?:\/\/|mailto:|\/|#)/i;

export function sanitize(html) {
  const out = [];
  const open = [];                       // allowed tags still awaiting a close
  let i = 0;
  const s = String(html ?? '');

  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) { out.push(s.slice(i)); break; }
    out.push(s.slice(i, lt));

    if (s.startsWith('<!--', lt)) {                    // drop comments entirely
      const end = s.indexOf('-->', lt);
      i = end < 0 ? s.length : end + 3;
      continue;
    }

    const m = /^<(\/?)([a-zA-Z][\w-]*)([^>]*)>/.exec(s.slice(lt));
    if (!m) { out.push('&lt;'); i = lt + 1; continue; }  // a stray '<' is text
    const [full, slash, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    i = lt + full.length;

    if (!(name in ALLOWED)) continue;                   // drop the tag, keep its text

    if (slash) {
      if (open.length && open[open.length - 1] === name) { open.pop(); out.push(`</${name}>`); }
      continue;                                          // an unmatched close is noise
    }
    if (VOID.has(name)) { out.push(`<${name}>`); continue; }

    const kept = keepAttrs(name, attrs);
    if (name === 'a' && !kept.includes('href=')) continue;   // a link to nowhere is just text
    open.push(name);
    out.push(`<${name}${kept}>`);
  }

  while (open.length) out.push(`</${open.pop()}>`);      // never return unbalanced markup
  return out.join('').replace(/\s+/g, ' ').trim();
}

function keepAttrs(tag, raw) {
  const allowed = ALLOWED[tag];
  let out = '';
  const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    const value = m[3] ?? m[4] ?? '';
    if (!allowed.includes(name)) continue;
    if (name === 'href' && !SAFE_HREF.test(value.trim())) continue;
    out += ` ${name}="${value.replace(/"/g, '&quot;')}"`;
  }
  // An external link that opens a new tab without noopener hands the opener to
  // the destination. The site already does this correctly; keep it that way.
  if (tag === 'a' && /target\s*=\s*"_blank"/i.test(out) && !/rel=/i.test(out)) {
    out += ' rel="noopener noreferrer"';
  }
  return out;
}
