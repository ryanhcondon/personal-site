# personal-site (ryanhcondon.com) — context for a new session

Ryan's CV and portfolio. **Live at https://www.ryanhcondon.com.** Static
HTML/CSS with one serverless function behind an in-place browser editor.

**This file is the shared handoff for every coding agent** (Cursor, Claude Code,
and anything else that reads `AGENTS.md`). `CLAUDE.md` is a one-line import of
it. Edit **AGENTS.md**, never CLAUDE.md.

Where the truth lives:

| | |
|---|---|
| **AGENTS.md** (this) | What will bite you, and where to look |
| **README.md** | *How* — the editor, env vars, DNS, deployment, tests |
| **PROJECT_PLAN.md** / **CONTENT_PLAN.md** | *Why* — structure and content strategy |
| **.cursor/rules/development-process.mdc** | Chunk-based workflow and validation steps |

Read README.md before changing `lib/`, the editor, or anything about hosting.

---

## How to work in this repo

- **Accuracy over agreeableness.** Push back; mark uncertainty; do not smooth
  over problems.
- **`git pull` before any local work.** THE SITE EDITS ITSELF — every browser
  save is a commit made directly on GitHub, so `main` moves without this clone
  knowing. This is the single most likely way to waste a session here.
- **This file records decisions and traps, not session diaries.** What changed
  and when is in `git log`. Update the section that is now wrong; do not append
  "this session did X."
- **Disk + git are the source of truth across sessions**, never the chat.
- **Work on `main`.** Solo project, no feature branches.
- **Visual validation is the real test.** Check 1920 / 768 / 375px before
  calling anything done.
- **Commit and push only after Ryan has seen the change.**
- **Never paste tokens** (GitHub OAuth secrets, `SESSION_SECRET`) into a chat.

## Deployment

Vercel, connected to this repo — **pushing `main` deploys**, live in under a
minute. No build step; Vercel serves the repo root.

**Apex 308s to `www.ryanhcondon.com`** (canonical). This is the OPPOSITE of
rcmtg.com, where the apex is canonical. DNS is Cloudflare, **grey cloud (DNS
only)** — proxying puts a second CDN in front of Vercel's and breaks certificate
issuance.

**Ignore any GitHub Pages instructions.** The `gh-pages` branch exists solely to
redirect the old `ryanhcondon.github.io/personal-site/` links here, and holds
nothing but an `index.html` and a `404.html`. Never point Pages back at `main` —
that serves the whole site at two addresses competing in search.

## Design

The stylesheet shares design tokens with **rcmtg.com** (`../writing-site`):
same warm-paper palette, serif/sans pairing, burnt-sienna accent. The source of
truth is that repo's `assets/styles.css` — if a colour changes there, mirror it
in the `:root` block of `styles.css`. Two separate sites on purpose: this is the
CV, that is the writing.

## Things that will bite

1. **`"type": "module"` in package.json is load-bearing.** Without it every
   function invocation fails at module load with `FUNCTION_INVOCATION_FAILED`
   and no further detail, while everything passes locally.
2. **A region must never contain another region.** Saving a container sends its
   children through the sanitiser and flattens them. Marked lists hold no marked
   items; the server refuses to write one, and a test asserts it.
3. **`lib/regions.js` splices source text, it does not parse HTML.** Deliberate —
   parsing and re-serialising would reformat the file on every save and make
   diffs useless. It refuses to write anything it cannot locate unambiguously.
4. **Duplicate `data-edit` ids are refused, not guessed.** Unique per page.
5. **The OAuth callback URL must match exactly**, including `www`:
   `https://www.ryanhcondon.com/api/auth/callback`.
6. **`?edit=1` is a convenience, not the security.** The gate is a GitHub OAuth
   session in an encrypted HttpOnly cookie, re-checked server-side on every save.

## Operating it

```sh
python3 -m http.server 8765      # http://localhost:8765
node --test "tests/*.test.js"    # 26 tests — run before and after touching lib/
git pull                         # ALWAYS, before local work
```

## Still to do

- Portfolio sample posts still link to `patreon.com/posts/...` and should point
  at `rcmtg.com/p/<slug>/` via `patreon_id` in frontmatter. About / Experience /
  Connect already point at rcmtg.com. **PT Hub stays unlinked on purpose.**
