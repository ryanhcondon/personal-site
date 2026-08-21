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
  // Structure, so a list region can gain and lose bullets. Only inside a list
  // region: a <p> region still strips these, because a list nested in a
  // paragraph is not something this site has or wants.
  ul: ['class'], ol: [], li: [],
};

// The only class a nested list is allowed to carry — the site's own. Anything
// else a paste brought along refers to a stylesheet that does not exist here.
const SUBLIST = 'experience-sublist';
const VOID = new Set(['br']);

// Block by SCHEME, not by allowlisted prefix.
//
// The first version of this allowlisted https/mailto/'/'/'#', which silently
// dropped every plain relative link on the site — `content/foo.pdf` matches
// none of them, and a stripped <a> looks like an edit nobody made. What is
// actually dangerous is a scheme that executes, so reject those by name and let
// ordinary relative paths through. Protocol-relative '//host' is rejected too:
// it reads as a path and behaves as an offsite link.
const EXECUTABLE = new Set(['javascript', 'data', 'vbscript', 'file', 'blob']);

function safeHref(value) {
  const v = String(value).trim();
  if (!v || /^\/\//.test(v)) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(v);
  if (!scheme) return true;                       // relative path, or #anchor
  return !EXECUTABLE.has(scheme[1].toLowerCase());
}

export function sanitize(html, { lists = false } = {}) {
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

    const structural = name === 'ul' || name === 'ol' || name === 'li';
    if (!(name in ALLOWED) || (structural && !lists)) continue;   // drop the tag, keep its text

    if (slash) {
      if (open.length && open[open.length - 1] === name) { open.pop(); out.push(`</${name}>`); }
      continue;                                          // an unmatched close is noise
    }
    if (VOID.has(name)) { out.push(`<${name}>`); continue; }

    let kept = keepAttrs(name, attrs);
    if (name === 'ul' && open.includes('li') && !kept.includes('class=')) kept = ` class="${SUBLIST}"`;
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
    if (name === 'href' && !safeHref(value)) continue;
    if (name === 'class' && value.trim() !== SUBLIST) continue;
    out += ` ${name}="${value.replace(/"/g, '&quot;')}"`;
  }
  // An external link that opens a new tab without noopener hands the opener to
  // the destination. The site already does this correctly; keep it that way.
  if (tag === 'a' && /target\s*=\s*"_blank"/i.test(out) && !/rel=/i.test(out)) {
    out += ' rel="noopener noreferrer"';
  }
  return out;
}
