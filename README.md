# Ryan Condon - Personal Website

A clean, professional personal portfolio website showcasing work history, skills, and links.

## Tech Stack
- Static HTML/CSS — no build step, no dependencies
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

`ryanhcondon.github.io/personal-site/` was the previous home. It can keep
serving harmlessly, but once ryanhcondon.com is verified, turn Pages off in the
repo's Settings so there is only one live copy.

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

