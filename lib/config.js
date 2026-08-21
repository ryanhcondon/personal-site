// Everything the editor needs from the environment, in one place so a missing
// variable is reported once, by name, instead of surfacing as a confusing 500.
//
// "type": "module" in package.json is load-bearing on Vercel. Without it every
// function invocation fails at module load with FUNCTION_INVOCATION_FAILED and
// no further detail, while passing locally — Node sniffs ESM syntax, Vercel's
// runtime does not. This cost an afternoon on rcmtg; it is set here from the start.

// The one host this site's OAuth flow runs on.
//
// The apex 308s to www, and cookies are host-only: a state cookie set on www is
// NOT sent back to the apex. So if the redirect_uri were derived from whichever
// host the request happened to arrive at, a flow that began on one and returned
// to the other would lose the cookie and fail the CSRF check — and GitHub would
// reject the mismatch anyway. Pin it, so there is exactly one right answer.
export const ORIGIN = (process.env.SITE_ORIGIN || 'https://www.ryanhcondon.com').replace(/\/$/, '');

export const REPO = process.env.GITHUB_REPO || 'ryanhcondon/personal-site';
export const BRANCH = process.env.GITHUB_BRANCH || 'main';

// Only this GitHub account may edit, whatever the OAuth app would otherwise allow.
export const OWNER_LOGIN = (process.env.ALLOWED_LOGIN || 'ryanhcondon').toLowerCase();

// The pages the editor is allowed to touch. An allowlist, not a check for
// "../" — a path this code did not choose is not a path it will write to.
export const PAGES = ['index.html', 'portfolio.html'];

export function config() {
  const missing = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'SESSION_SECRET']
    .filter((k) => !process.env[k]);
  if (missing.length) return { error: `not configured on this deployment: ${missing.join(', ')}` };
  return {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    secret: process.env.SESSION_SECRET,
  };
}
