# Ryan Condon - Personal Website

A clean, professional personal portfolio website showcasing work history, skills, and links.

## Tech Stack
- Static HTML/CSS
- Responsive design (mobile, tablet, desktop)
- Hosted on GitHub Pages (free)

## Local Development

To view the site locally, simply open `index.html` in your web browser:
- Right-click `index.html` → Open With → Your browser
- Or drag `index.html` into an open browser window

## Deployment to GitHub Pages

### First-Time Setup

1. **Create a GitHub repository**:
   - Go to [github.com](https://github.com) and log in
   - Click "New repository"
   - Name it something like `ryans-website` or `portfolio`
   - Make it Public (required for free GitHub Pages)
   - Don't add README, .gitignore, or license (we already have those)
   - Click "Create repository"

2. **Connect your local repo to GitHub**:
   ```bash
   cd "/Users/RyanCondon/Desktop/Projects/Ryan's Website"
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   git branch -M main
   git push -u origin main
   ```
   (Replace YOUR-USERNAME and YOUR-REPO-NAME with your actual values)

3. **Enable GitHub Pages**:
   - Go to your repo on GitHub
   - Click "Settings" → "Pages" (in the left sidebar)
   - Under "Source", select "main" branch
   - Click "Save"
   - GitHub will show you your live URL: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

4. **Wait a minute**, then visit your URL - your site is live!

### Updating the Live Site

After making changes to `index.html`, `styles.css`, or any other files:

```bash
cd "/Users/RyanCondon/Desktop/Projects/Ryan's Website"
git add .
git commit -m "Description of your changes"
git push
```

GitHub will automatically redeploy your site within 1-2 minutes.

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

Edit `styles.css` at the top (lines 5-20) - CSS custom properties:
- `--color-primary`: Main heading color
- `--color-accent`: Link and highlight color
- `--font-heading`: Heading font family

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

- **GitHub Pages documentation**: [docs.github.com/pages](https://docs.github.com/en/pages)
- **HTML reference**: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML)
- **CSS reference**: [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)

## License

© 2025 Ryan Condon. All rights reserved.

