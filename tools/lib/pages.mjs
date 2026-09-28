// SELÈ STUDIO — tools/lib/pages.mjs (zero dependencies) — the ONE page-set definition (Addendum A9.3),
// used by sync-partials, check, gen-en and seo.
//
//   listPages(root, { lang: 'he' | 'en' | 'all' })  → sorted repo-relative posix paths of pages
//       'he'  = every **/*.html outside en/ (includes tools/demo/**; excludes partials/, the rest of tools/,
//               assets/, data/, css/, js/, .git/, .github/, _site/, node_modules/)
//       'en'  = every en/**/*.html (the generated English mirror)
//   urlPathOf(rel)   index.html → /   x/y/index.html → /x/y/   404.html → /404.html
//   enFileOf(rel)    x/index.html → en/x/index.html
//   heFileOf(rel)    en/x/index.html → x/index.html
//   langLinkHref(rel)  the Hebrew page's language-link target (A9.1): /en + url path for index.html files,
//                      /en/ for 404.html and any other non-index file
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const toPosix = (p) => p.split(path.sep).join('/');

const EXCLUDED_TOP = new Set(['partials', 'assets', 'data', 'css', 'js', '.git', '.github', '_site', 'node_modules']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '_site']);

/** true when a repo-relative .html path is not a page */
export function isExcluded(rel) {
  const r = rel.replace(/^en\//, '');
  const top = r.split('/')[0];
  if (EXCLUDED_TOP.has(top)) return true;
  if (top === 'tools' && !r.startsWith('tools/demo/')) return true;
  return rel.split('/').includes('node_modules');
}
export const isEnFile = (rel) => rel.startsWith('en/');

export function listPages(root = REPO, { lang = 'he' } = {}) {
  const out = [];
  const walk = (dir) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const abs = path.join(dir, ent.name);
      const rel = toPosix(path.relative(root, abs));
      if (ent.isDirectory()) walk(abs);
      else if (ent.name.endsWith('.html') && !isExcluded(rel)) {
        if (lang === 'all' || (lang === 'en') === isEnFile(rel)) out.push(rel);
      }
    }
  };
  walk(root);
  return out.sort();
}

export function urlPathOf(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}
export const enFileOf = (rel) => (isEnFile(rel) ? rel : 'en/' + rel);
export const heFileOf = (rel) => rel.replace(/^en\//, '');
export const langLinkHref = (rel) => (rel === 'index.html' || rel.endsWith('/index.html') ? '/en' + urlPathOf(rel) : '/en/');

export const isEnUrl = (url) => /^\/en(\/|$|[?#])/.test(url);
/** /studio/#x → /en/studio/#x  ·  /en/studio/ → /studio/ */
export function counterpartUrl(url, toLang) {
  const to = toLang || (isEnUrl(url) ? 'he' : 'en');
  if (to === 'en') return isEnUrl(url) ? url : '/en' + url;
  return url.replace(/^\/en(?=\/|$|[?#])/, '') || '/';
}
/** A3.7 step 5: root-absolute, not //, not /assets/, not /en/, no file extension → language-bound page link */
export function isPageLink(href) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return false;
  const p = href.split(/[?#]/)[0];
  if (/^\/(assets|en)(\/|$)/.test(p)) return false;
  return !/\.[a-z0-9]+$/i.test(p.split('/').pop());
}
