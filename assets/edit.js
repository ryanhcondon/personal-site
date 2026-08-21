// The in-place editor. Loaded on every page, and on almost every load it does
// nothing at all.
//
// INVISIBILITY. A visitor must never see a trace of this. So the only thing
// that runs unconditionally is one fetch to /api/session, and unless that comes
// back with a login, the script returns and no element is ever inserted. There
// is no button, no link, and nothing in the markup to notice. The entry point
// is ?edit=1, which is a convenience rather than a secret — the real gate is the
// session cookie, checked again on the server for every save.

const page = (() => {
  const p = location.pathname.replace(/^\//, '') || 'index.html';
  return p.endsWith('.html') ? p : `${p}.html`;
})();

const state = { on: false, original: new Map(), toolbar: null, login: null };

init();

async function init() {
  const wanted = new URLSearchParams(location.search).has('edit');
  let session = {};
  try {
    session = await (await fetch('/api/session', { cache: 'no-store' })).json();
  } catch { return; }

  if (!session.login) {
    // Only ever offer sign-in to someone who asked for it by URL.
    if (wanted) location.href = '/api/auth/login';
    return;
  }
  state.login = session.login;
  buildToolbar();
  if (wanted) toggle(true);
}

// --- the toolbar ----------------------------------------------------------

// Injected only once the session is confirmed, so a visitor's page never
// carries a stylesheet for a toolbar they will not be shown.
const CSS = `
.rc-edit-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 999;
  display: flex; gap: .5rem; align-items: center; flex-wrap: wrap;
  padding: .55rem .9rem; font-family: var(--sans); font-size: .82rem;
  background: var(--surface); color: var(--ink);
  border-top: 1px solid var(--rule); box-shadow: 0 -2px 14px rgba(0,0,0,.08); }
.rc-edit-bar .rc-edit-spacer { flex: 1; }
.rc-edit-who { color: var(--ink-faint); }
.rc-edit-bar button { font: inherit; cursor: pointer; padding: .3rem .7rem;
  border-radius: 7px; border: 1px solid var(--rule);
  background: var(--bg); color: var(--ink); }
.rc-edit-bar button[data-act="save"] { border-color: transparent;
  background: var(--accent); color: #fff; }
.rc-edit-note { color: var(--ink-soft); }
.rc-edit-note.ok  { color: var(--gold); font-weight: 600; }
.rc-edit-note.bad { color: var(--accent); font-weight: 600; }

/* Only while editing: show what is editable, and where the caret can go. */
body.rc-editing { padding-bottom: 3.5rem; }
body.rc-editing [data-edit] { outline: 1px dashed var(--rule); outline-offset: 3px; border-radius: 3px; }
body.rc-editing [data-edit]:hover { outline-color: var(--ink-faint); }
body.rc-editing [data-edit]:focus { outline: 2px solid var(--accent); outline-offset: 3px; background: var(--surface); }
`;

function buildToolbar() {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  const bar = document.createElement('div');
  bar.className = 'rc-edit-bar';
  bar.innerHTML = `
    <span class="rc-edit-who">Signed in as ${escapeHtml(state.login)}</span>
    <span class="rc-edit-spacer"></span>
    <span class="rc-edit-note" role="status"></span>
    <button type="button" data-act="link" hidden>Link</button>
    <button type="button" data-act="toggle">Edit this page</button>
    <button type="button" data-act="save" hidden>Save</button>
    <button type="button" data-act="discard" hidden>Discard</button>
    <button type="button" data-act="out">Sign out</button>`;
  document.body.appendChild(bar);
  state.toolbar = bar;
  bar.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'toggle') toggle(!state.on);
    if (act === 'link') editLink();
    if (act === 'save') save();
    if (act === 'discard') discard();
    if (act === 'out') signOut();
  });
}

function paint(msg, kind = '') {
  const note = state.toolbar.querySelector('.rc-edit-note');
  note.textContent = msg || '';
  note.className = `rc-edit-note ${kind}`;
  for (const [act, on] of [['link', state.on], ['save', state.on], ['discard', state.on]]) {
    state.toolbar.querySelector(`[data-act="${act}"]`).hidden = !on;
  }
  state.toolbar.querySelector('[data-act="toggle"]').textContent =
    state.on ? 'Stop editing' : 'Edit this page';
  document.body.classList.toggle('rc-editing', state.on);
}

// --- edit mode ------------------------------------------------------------

function regions() { return [...document.querySelectorAll('[data-edit]')]; }

function toggle(on) {
  if (!on && dirty().length && !confirm('Discard your unsaved edits?')) return;
  state.on = on;
  for (const el of regions()) {
    el.contentEditable = on ? 'true' : 'false';
    if (on && !state.original.has(el.dataset.edit)) {
      state.original.set(el.dataset.edit, el.innerHTML);
      // Paste arrives as whatever the source page was wearing. Take the text
      // and drop the costume; the server sanitises too, but this keeps what you
      // SEE while editing honest about what will be saved.
      el.addEventListener('paste', onPaste);
    }
  }
  if (!on) state.original.clear();
  paint(on ? 'Click any text to edit it.' : '');
}

function onPaste(e) {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function dirty() {
  return regions().filter((el) => norm(el.innerHTML) !== norm(state.original.get(el.dataset.edit) ?? el.innerHTML));
}

function discard() {
  if (!dirty().length) return paint('Nothing to discard.');
  if (!confirm('Put every edit on this page back the way it was?')) return;
  for (const el of regions()) {
    const was = state.original.get(el.dataset.edit);
    if (was !== undefined) el.innerHTML = was;
  }
  paint('Reverted.');
}

// --- links ----------------------------------------------------------------
//
// execCommand is deprecated and still the only thing every browser implements
// for this. The replacement (Selection + Range surgery) is a great deal of code
// to reimplement what already works, for one person's occasional link edit.

function editLink() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return paint('Select some text first.', 'bad');
  const anchor = sel.anchorNode?.parentElement?.closest('a');
  if (!anchor && sel.isCollapsed) return paint('Select the words the link should cover.', 'bad');

  const current = anchor?.getAttribute('href') || '';
  const url = prompt(anchor ? 'Link URL (empty to remove the link):' : 'Link URL:', current);
  if (url === null) return;

  if (!url.trim()) { document.execCommand('unlink'); return paint('Link removed.'); }
  if (!/^(https?:\/\/|mailto:|\/|#)/i.test(url.trim())) {
    return paint('Links must start with https://, mailto:, / or #.', 'bad');
  }
  if (anchor && sel.isCollapsed) {
    anchor.setAttribute('href', url.trim());
  } else {
    document.execCommand('createLink', false, url.trim());
  }
  // An external link opening a new tab needs rel, same as the rest of the site.
  for (const a of document.querySelectorAll('[data-edit] a[target="_blank"]:not([rel])')) {
    a.setAttribute('rel', 'noopener noreferrer');
  }
  paint('Link set.');
}

// --- saving ---------------------------------------------------------------

async function save() {
  const changed = dirty();
  if (!changed.length) return paint('No changes to save.');

  paint(`Saving ${changed.length} change${changed.length > 1 ? 's' : ''}…`);
  const edits = Object.fromEntries(changed.map((el) => [el.dataset.edit, el.innerHTML]));

  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, edits }),
    });
    const data = await res.json();
    if (!res.ok) return paint(data.error || 'Save failed.', 'bad');

    // The commit is in; the deploy follows in well under a minute. Adopt the
    // saved text as the new baseline so the page stops counting it as dirty.
    for (const el of changed) state.original.set(el.dataset.edit, el.innerHTML);
    paint(data.unchanged ? 'Nothing had changed.' : 'Saved. Live in under a minute.', 'ok');
  } catch {
    paint('Could not reach the server. Nothing was saved.', 'bad');
  }
}

async function signOut() {
  if (dirty().length && !confirm('You have unsaved edits. Sign out anyway?')) return;
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  location.href = location.pathname;
}

addEventListener('beforeunload', (e) => {
  if (state.on && dirty().length) { e.preventDefault(); e.returnValue = ''; }
});

const escapeHtml = (s) => String(s).replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
