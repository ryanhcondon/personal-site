# Ryan Condon - Personal Website

A clean, professional personal portfolio website showcasing work history, skills, and links.

## Tech Stack
- Static HTML/CSS — no build step, no npm dependencies
- One serverless function (`api/`) behind the in-place editor — see below
- Responsive, and light/dark via `prefers-color-scheme`
- Hosted on Vercel at **ryanhcondon.com**

## Design

The stylesheet shares its design tokens with **rcmtg.com** (the writing site):
same warm-paper palette, same serif/sans pairing, same burnt-sienna accent.
The source of truth for those values is that repo's `assets/styles.css` — if a
colour changes there, mirror it in the `:root` block at the top of `styles.css`.
Two separate sites on purpose: this one is the CV, that one is the writing.

## Local Development

No server needed for a quick look — open `index.html` in a browser. To check
relative paths the way the host serves them:

```bash
python3 -m http.server 8765
```

Then visit http://localhost:8765.

## Deployment

Vercel is connected to this repo. **Pushing to `main` deploys.**

```bash
git add -A
git commit -m "Describe the change"
git push
```

The build finishes in well under a minute; there is no build step, Vercel just
serves the repo root.

### DNS

`ryanhcondon.com` is registered through Vercel but its DNS is served by
**Cloudflare** (`marge`/`sage.ns.cloudflare.com`). So the records live in the
Cloudflare dashboard, not in Vercel:

- **A** `@` → the apex IP shown in the Vercel project's Domains tab
- **CNAME** `www` → `cname.vercel-dns.com`

Set both to **DNS only (grey cloud)**. Proxying them through Cloudflare puts a
second CDN in front of Vercel's and interferes with certificate issuance.

### The old GitHub Pages site

`ryanhcondon.github.io/personal-site/` was the previous home, and it is linked
from LinkedIn and from older posts that cannot all be edited. The **`gh-pages`
branch** exists solely to redirect those links to ryanhcondon.com — it holds an
`index.html` and a `404.html` and nothing else. Pages is pointed at that branch,
so the old URL keeps working without serving a second copy of the site.

**Never point Pages back at `main`.** That would put the whole site live at two
addresses at once, competing in search results. See the README on `gh-pages`.

## Updating Content

### Adding Your Information

Edit `index.html` to replace placeholder content:

1. **About section** (line ~33): Replace with your bio and background
2. **Experience section** (line ~44): Update job titles, dates, descriptions
3. **Skills section** (line ~77): Modify skills lists as needed
4. **Links section** (line ~115): Update URLs and email address
   - Replace `href="#"` with actual URLs (Patreon, social media, etc.)
   - Replace `mailto:your.email@example.com` with your email

### Customizing Colors/Fonts

Edit the `:root` block at the top of `styles.css`:
- `--ink` / `--ink-soft` / `--ink-faint`: text, in three weights of emphasis
- `--accent`: links and highlights
- `--rule`: every hairline on the page
- `--serif` / `--sans`: the two type stacks

Every one of these has a dark-mode counterpart further down. Change both.

### Adding Images

1. Create an `images/` folder in this directory
2. Add your images to that folder
3. In `index.html`, add image tags like:
   ```html
   <img src="images/your-photo.jpg" alt="Description">
   ```

## File Structure

```
/
├── index.html              # Main website content
├── styles.css              # All styling
├── .gitignore              # Git ignore rules
├── PROJECT_PLAN.md         # Project planning document
├── README.md               # This file
└── .cursor/
    └── rules/              # Development guidelines
        ├── communication-style.mdc
        └── development-process.mdc
```

## Browser Testing

After making changes, test in multiple ways:
- Desktop view (full width)
- Tablet view (resize browser to ~768px wide)
- Mobile view (resize browser to ~375px wide)
- Different browsers if possible (Chrome, Safari, Firefox)

## Git Workflow

Commit changes at natural checkpoints:

```bash
git add index.html styles.css
git status                    # Review what's being committed
git diff --staged             # See the actual changes
git commit -m "Update about section and add new skills"
```

## Getting Help

- **Vercel documentation**: [vercel.com/docs](https://vercel.com/docs)
- **HTML reference**: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML)
- **CSS reference**: [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)

## License

© 2025 Ryan Condon. All rights reserved.



## Editing the site from the site

The pages can be edited in place, in the browser, by Ryan and nobody else.
There is **no link to it anywhere** — a visitor sees no trace, and the page
sends no extra requests and carries no extra markup for them.

1. Visit **`https://www.ryanhcondon.com/?edit=1`** (or `/portfolio.html?edit=1`).
2. Sign in with GitHub. Only the `ryanhcondon` account is accepted.
3. **Edit this page** → click any text and type. **Link** turns the selection
   into a link, or edits/removes one you are inside.
4. **Save** commits to this repo. Vercel redeploys; live in under a minute.

`?edit=1` is a convenience, not the security. The real gate is a GitHub OAuth
session in an encrypted, HttpOnly cookie, re-checked on the server for every
save. Nothing the browser claims is trusted.

### Keeping this checkout in step

**The site can now edit itself, so `main` moves without this clone knowing.**
Every save from the browser is a commit made directly on GitHub.

```bash
git pull        # before any local work, and before asking Claude to change anything here
```

Nothing else is required. The editor reads the file **from GitHub** and writes
it back with the blob sha it just read, so a stale copy here cannot corrupt a
save, and a concurrent change is refused rather than clobbered. Git will also
refuse a non-fast-forward push, so the worst case of forgetting is a merge
conflict — never a lost edit.

### What is editable

Paragraphs and headings inside `<main>` carry a `data-edit="id"` attribute, and
so does each **list** — the `<ul>`, not its items. Only marked regions can be
edited, so no click can restructure the page. To make something new editable,
add a `data-edit` with an id unique to that page.

**Lists behave like lists.** Because the region is the `<ul>` rather than each
`<li>`, the browser's own editing applies: Enter starts a new bullet, Backspace
at the start of one merges it into the previous, and deleting a line removes
it. Sub-lists work the same way.

On save a list is not patched but **rebuilt** — parsed to a tree and re-emitted
one `<li>` per line at the file's own indentation (`lib/lists.js`). That is
what keeps the diffs honest: editing a word changes one line, and adding a
bullet adds one line, rather than collapsing the list into a single row. It
also means whatever markup `contenteditable` invents does not survive a round
trip. A list cannot be emptied entirely; that is refused.

A region must never **contain** another region — saving a container would send
its children through the sanitiser and flatten them. Marked lists hold no
marked items, `regions()` filters out any that appear, the server refuses to
write one, and a test asserts it against the real pages.

### Environment variables (Vercel)

| | |
|---|---|
| `GITHUB_CLIENT_ID` | From the GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From the GitHub OAuth App |
| `SESSION_SECRET` | Any long random string; encrypts the session cookie |

Optional: `GITHUB_REPO` (default `ryanhcondon/personal-site`), `GITHUB_BRANCH`
(default `main`), `ALLOWED_LOGIN` (default `ryanhcondon`).

The OAuth App's callback URL must be
`https://www.ryanhcondon.com/api/auth/callback` — exactly, including `www`.

Changing `SESSION_SECRET` signs you out everywhere, which is how to revoke a
session you are worried about.

### Things that will bite

1. **`"type": "module"` in package.json is load-bearing.** Without it every
   function invocation fails at module load with `FUNCTION_INVOCATION_FAILED`
   and no further detail, while everything passes locally.
2. **`lib/regions.js` splices source text, it does not parse HTML.** That is
   deliberate — parsing and re-serialising would reformat the whole file on
   every save and make the diffs useless. It refuses to write anything it
   cannot locate unambiguously.
3. **Duplicate `data-edit` ids are refused, not guessed.** Ids must be unique
   per page.

## Tests

```bash
node --test "tests/*.test.js"
```

26 tests, covering the splicer's refusals, the sanitiser, and a real edit
applied to `index.html`. Run them before and after changing `lib/`.
