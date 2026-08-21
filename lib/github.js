// GitHub, for both halves of this: proving who you are, and writing the file.
//
// The commit is made with YOUR OAuth token, not a long-lived personal access
// token stored on the server. Two things follow. The history says you edited
// the page, because you did. And there is no standing credential to leak — the
// only token that exists lives encrypted in your own session cookie and expires
// with it.

import { REPO, BRANCH, OWNER_LOGIN } from './config.js';

const API = 'https://api.github.com';

async function gh(path, { token, method = 'GET', body } = {}) {
  return fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ryanhcondon-site-editor',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const authorizeUrl = (clientId, state, redirectUri) =>
  'https://github.com/login/oauth/authorize?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    // public_repo, not repo: this repository is public, and a token that cannot
    // touch private repositories is a smaller thing to lose.
    scope: 'public_repo',
    state,
  });

/** Swap the callback's code for a token, and find out whose it is. */
export async function exchangeCode({ code, clientId, clientSecret, redirectUri }) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.access_token) return { error: json.error_description || 'GitHub would not issue a token' };

  const who = await gh('/user', { token: json.access_token });
  if (!who.ok) return { error: `GitHub ${who.status} identifying the account` };
  const login = (await who.json()).login;

  // The OAuth app is Ryan's, but anyone with a GitHub account can click through
  // its consent screen. Identity is not authorisation — check the login.
  if (String(login).toLowerCase() !== OWNER_LOGIN) {
    return { error: `signed in as ${login}, which cannot edit this site` };
  }
  return { token: json.access_token, login };
}

/** A file's current text and blob sha. The sha is what makes the write safe. */
export async function getFile(path, token) {
  const res = await gh(`/repos/${REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(BRANCH)}`, { token });
  if (res.status === 404) {
    // A fine-grained or scope-limited token gets 404 rather than 403, so that a
    // token cannot be used to enumerate private repositories. Say so, because
    // "not found" sends people looking for a missing file instead.
    return { error: `GitHub cannot see ${path} in ${REPO}. If the file exists, the token lacks access — GitHub answers 404, not 403, for permission problems.` };
  }
  if (!res.ok) return { error: `GitHub ${res.status} reading ${path}` };
  const json = await res.json();
  return { text: Buffer.from(json.content, 'base64').toString('utf8'), sha: json.sha };
}

/**
 * Write it back.
 *
 * The sha is required by GitHub when replacing, and is the whole safety story:
 * if the file moved since we read it, the API refuses instead of clobbering the
 * newer version. That is a 409, and it is reported as something a person can act on.
 */
export async function putFile({ path, text, sha, message, token }) {
  const res = await gh(`/repos/${REPO}/contents/${encodeURI(path)}`, {
    token,
    method: 'PUT',
    body: { message, content: Buffer.from(text, 'utf8').toString('base64'), sha, branch: BRANCH },
  });
  if (res.status === 409 || res.status === 422) {
    return { error: 'that page changed in the repo since you loaded it — reload and make the edit again' };
  }
  if (res.status === 401) return { error: 'GitHub rejected the token — sign in again' };
  if (res.status === 403) return { error: 'GitHub refused the write — the token lacks public_repo scope' };
  if (!res.ok) return { error: `GitHub ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const json = await res.json();
  return { commit: json.commit?.sha, url: json.commit?.html_url };
}
