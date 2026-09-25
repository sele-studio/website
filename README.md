# SELÈ STUDIO — sele-studio.com

אתר תדמית לסטודיו **SELÈ STUDIO** — אדריכלות ועיצוב פנים, בהובלת שוהם סלע.

A boutique architecture & interior-design studio site. Static, dependency-free build
(vanilla HTML/CSS/JS + GSAP/Lenis from CDN) — deployable on any static host.

## Structure

```
sele-studio/
├── index.html          One-page site, bilingual HE (default, RTL) / EN
├── css/style.css       Design system (bone / charcoal / taupe / bordeaux)
├── js/main.js          GSAP + ScrollTrigger + Lenis, i18n, lightbox, cursor
├── assets/
│   ├── brand/          Logo vectors extracted from the official branding PDF
│   │   ├── seal.svg            The oval-S seal (currentColor)
│   │   ├── logo-lockup.svg     Full lockup: seal + ESTD 2024 + wordmark
│   │   ├── favicon.svg
│   │   └── apple-touch-icon.png
│   └── img/            Project renders (also og.jpg 1200×630)
├── CNAME               sele-studio.com (for GitHub Pages)
├── robots.txt
└── sitemap.xml
```

## Brand

- **Logo**: "first option" from `SELE STUDIO - Branding.pdf` — the oval S seal + SELÈ STUDIO wordmark
  (vectors extracted from the PDF itself, so they are exact).
- **Palette**: bone `#F2EFE9` · charcoal `#211D19` · taupe `#B7AA9B` · deep bordeaux `#4A1F27`.
- **Type** (web equivalents of the brand fonts found embedded in the PDF):
  - Gallient → **Italiana** (EN display)
  - FuturaPT / Caviar Dreams → **Jost** (wordmark, labels)
  - Afek (HE) → **Assistant** (HE body) + **Frank Ruhl Libre** (HE display)

## Local preview

Any static server works:

```bash
python3 -m http.server 8123 --directory sele-studio
```

## Deploying to sele-studio.com

Option A — **GitHub Pages** (this repo):
1. Repo Settings → Pages → deploy from a branch, folder = `/sele-studio` is not supported
   directly, so either move this folder's contents to the repo root / `docs/`, or add a
   tiny workflow that publishes `sele-studio/` as the Pages artifact.
2. Custom domain: `sele-studio.com` (the `CNAME` file is already here) + DNS:
   - `A` records for apex: 185.199.108.153 / .109 / .110 / .111
   - `CNAME` for `www` → `<user>.github.io`
3. Enforce HTTPS once the certificate is issued.

Option B — **Netlify / Vercel / Cloudflare Pages**: point the project at the
`sele-studio` subfolder as the publish directory and attach the domain. No build step.

## Content TODOs

- [ ] Confirm the studio email (site currently uses `hello@sele-studio.com`).
- [ ] Optional: add a phone/WhatsApp number to the contact section.
- [ ] Swap/extend project galleries as new renders and photos arrive.
