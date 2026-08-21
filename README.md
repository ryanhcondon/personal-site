# gh-pages — redirect only

This branch exists for one reason: `ryanhcondon.github.io/personal-site/` is
linked from LinkedIn and from older posts, and those links are not all editable.
GitHub Pages serves **this branch** so that every one of them lands on
**ryanhcondon.com**, which is where the real site lives (on Vercel, built from
`main`).

- `index.html` — catches the root.
- `404.html` — catches every deep link, e.g. `/personal-site/portfolio.html`.
  Pages serves it for anything that does not exist, which on this branch is
  everything.

Both carry the path across, so a deep link keeps its destination.

**Do not put site content here.** `main` is the site; this branch is a
signpost. If Pages ever gets pointed back at `main`, there will be two live
copies of the site competing in search results.

GitHub Pages cannot issue a 301, so the redirect is a meta refresh plus a
script. Good enough for a person clicking a link, and the `rel=canonical`
tells search engines where the real page is.
