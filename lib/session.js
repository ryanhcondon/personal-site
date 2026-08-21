// The signed-in session, carried entirely in one cookie.
//
// WHY NOTHING IS STORED SERVER-SIDE. This site has no database and should not
// grow one to hold a single person's login. So the session IS the cookie: the
// GitHub access token, encrypted with a secret only the server knows, plus an
// expiry. Nothing to provision, nothing to clean up, and no store to leak.
//
// The token is ENCRYPTED rather than merely signed, because a signed cookie is
// still readable by anyone who obtains it. AES-256-GCM also authenticates, so a
// tampered cookie fails to decrypt rather than decoding to something plausible.
//
// The cookie is HttpOnly, so the page's own JavaScript cannot read the token
// either. Only these functions ever see it.

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const COOKIE = 'rc_edit';
const STATE_COOKIE = 'rc_state';
const TTL_MS = 8 * 60 * 60 * 1000;      // a working day; re-auth is one click

const keyFrom = (secret) => createHash('sha256').update(String(secret)).digest();

export function seal(payload, secret) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const body = Buffer.concat([c.update(JSON.stringify(payload), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString('base64url')).join('.');
}

export function unseal(token, secret) {
  try {
    const [iv, tag, body] = String(token).split('.').map((p) => Buffer.from(p, 'base64url'));
    if (!iv || !tag || !body) return null;
    const d = createDecipheriv('aes-256-gcm', keyFrom(secret), iv);
    d.setAuthTag(tag);
    const json = JSON.parse(Buffer.concat([d.update(body), d.final()]).toString('utf8'));
    return json.exp > Date.now() ? json : null;      // expiry is inside the sealed blob
  } catch {
    return null;                                      // tampered, stale key, or nonsense
  }
}

export const sessionCookie = (token, login, secret) =>
  set(COOKIE, seal({ token, login, exp: Date.now() + TTL_MS }, secret), TTL_MS / 1000);

export const clearSession = () => set(COOKIE, '', 0);

export function readSession(cookies, secret) {
  const raw = cookies[COOKIE];
  return raw ? unseal(raw, secret) : null;
}

// --- OAuth state, against CSRF -------------------------------------------
//
// The state parameter must be unguessable and must be tied to THIS browser, or
// an attacker can hand the callback a code of their choosing. It is signed
// rather than encrypted: it carries no secret, it only has to be unforgeable.

export function newState(secret) {
  const nonce = randomBytes(16).toString('base64url');
  const sig = createHmac('sha256', secret).update(nonce).digest('base64url');
  return { value: `${nonce}.${sig}`, cookie: set(STATE_COOKIE, `${nonce}.${sig}`, 600) };
}

export function checkState(given, cookies, secret) {
  const stored = cookies[STATE_COOKIE];
  if (!given || !stored || given !== stored) return false;
  const [nonce, sig] = String(given).split('.');
  if (!nonce || !sig) return false;
  const want = createHmac('sha256', secret).update(nonce).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const clearState = () => set(STATE_COOKIE, '', 0);

// SameSite=Lax, not Strict: the browser arrives back here by a top-level
// redirect from github.com, and Strict would withhold the state cookie on
// exactly that request, breaking the check it exists to perform.
function set(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
