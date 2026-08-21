// The whole backend. One function, routed by vercel.json, as rcmtg does it —
// a handful of endpoints does not need a handful of cold starts.
//
// Everything here assumes the client is lying. The edit UI's "signed in" state
// is decoration; the session is re-checked from the cookie on every request
// that writes, and the page being edited must be one this server named.

import { config, PAGES, REPO, ORIGIN } from '../lib/config.js';
import { authorizeUrl, exchangeCode, getFile, putFile } from '../lib/github.js';
import { replaceRegion, readRegion, findRegion } from '../lib/regions.js';
import { sanitize } from '../lib/sanitize.js';
import { canonicalList } from '../lib/lists.js';
import {
  parseCookies, readSession, sessionCookie, clearSession, newState, checkState, clearState,
} from '../lib/session.js';

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.searchParams.get('path') ? '/' + url.searchParams.get('path') : url.pathname.replace(/^\/api/, '');
  const cookies = parseCookies(req.headers.cookie);
  const cfg = config();

  const json = (status, body, headers = []) => {
    for (const h of headers) res.setHeader('Set-Cookie', h);
    res.setHeader('Cache-Control', 'no-store');
    res.status(status).json(body);
  };

  if (cfg.error) return json(503, { error: cfg.error });
  const redirectUri = `${ORIGIN}/api/auth/callback`;

  try {
    // --- who am I -------------------------------------------------------
    if (path === '/session') {
      const s = readSession(cookies, cfg.secret);
      return json(200, s ? { login: s.login, repo: REPO } : {});
    }

    // --- sign in --------------------------------------------------------
    if (path === '/auth/login') {
      const state = newState(cfg.secret);
      res.setHeader('Set-Cookie', state.cookie);
      res.writeHead(302, { Location: authorizeUrl(cfg.clientId, state.value, redirectUri) });
      return res.end();
    }

    if (path === '/auth/callback') {
      if (!checkState(url.searchParams.get('state'), cookies, cfg.secret)) {
        return json(400, { error: 'that sign-in did not start here — try again' });
      }
      const code = url.searchParams.get('code');
      if (!code) return json(400, { error: 'GitHub sent no code' });

      const r = await exchangeCode({ code, clientId: cfg.clientId, clientSecret: cfg.clientSecret, redirectUri });
      if (r.error) {
        res.setHeader('Set-Cookie', clearState());
        return json(403, { error: r.error });
      }
      // Two cookies: the new session, and the spent state.
      res.setHeader('Set-Cookie', [sessionCookie(r.token, r.login, cfg.secret), clearState()]);
      res.writeHead(302, { Location: `${ORIGIN}/?edit=1` });
      return res.end();
    }

    if (path === '/auth/logout') {
      return json(200, { ok: true }, [clearSession()]);
    }

    // --- save -----------------------------------------------------------
    if (path === '/save' && req.method === 'POST') {
      const s = readSession(cookies, cfg.secret);
      if (!s) return json(401, { error: 'sign in again — your session has expired' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const page = String(body.page || '');
      // An allowlist, so no amount of cleverness in `page` reaches another file.
      if (!PAGES.includes(page)) return json(400, { error: `${page || 'that page'} is not editable` });

      const edits = body.edits && typeof body.edits === 'object' ? body.edits : null;
      if (!edits || !Object.keys(edits).length) return json(400, { error: 'nothing to save' });

      // Read the file from GITHUB, not from the deployed copy: the repo is the
      // source of truth, and its sha is what makes the write refuse to clobber.
      const file = await getFile(page, s.token);
      if (file.error) return json(502, { error: file.error });

      let text = file.text;
      const applied = [];
      for (const [id, raw] of Object.entries(edits)) {
        try {
          const where = findRegion(text, id);
          if (!where) return json(400, { error: `no region called "${id}" on ${page}` });

          // A list is rebuilt from a parsed tree at the indentation the file
          // already uses, so adding a bullet adds a line instead of collapsing
          // the whole list onto one. Everything else is inline content.
          let clean;
          if (where.tag === 'ul' || where.tag === 'ol') {
            const lineStart = text.lastIndexOf('\n', where.openStart) + 1;
            clean = canonicalList(raw, where.openStart - lineStart);
            if (clean === null) {
              return json(400, { error: `"${id}" would be left with no items — delete the section instead` });
            }
          } else {
            clean = sanitize(raw);
          }

          // A region containing another region cannot be saved as a unit: its
          // children's markup would go through the sanitiser and be flattened.
          // The client filters these out; the server refuses them, because this
          // is the failure that damages a live page rather than showing an error.
          const existing = readRegion(text, id);
          if (existing !== null && /\sdata-edit\s*=/.test(existing)) {
            return json(400, { error: `"${id}" contains other editable regions — edit those directly` });
          }
          const next = replaceRegion(text, id, clean);
          if (next !== text) { text = next; applied.push(id); }
        } catch (e) {
          // A region that will not splice cleanly aborts the WHOLE save. A
          // half-applied edit is worse than a refused one.
          return json(400, { error: `could not update "${id}": ${e.message}` });
        }
      }
      if (!applied.length) return json(200, { ok: true, unchanged: true });

      const what = applied.length === 1 ? applied[0] : `${applied.length} regions`;
      const put = await putFile({
        path: page, text, sha: file.sha, token: s.token,
        message: `Edit ${what} on ${page}\n\nEdited in place at ryanhcondon.com by ${s.login}.`,
      });
      if (put.error) return json(409, { error: put.error });
      return json(200, { ok: true, applied, commit: put.commit, url: put.url });
    }

    return json(404, { error: 'no such endpoint' });
  } catch (e) {
    console.error(`API ${req.method} ${path}:`, e);
    return json(500, { error: 'server error' });
  }
}
