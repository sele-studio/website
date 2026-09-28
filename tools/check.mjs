#!/usr/bin/env node
// SELÈ STUDIO — tools/check.mjs (zero dependencies, node >= 20) — the lint gate (SPEC §4.7 + Addendum A9.2)
//
//   node tools/check.mjs [--launch] [--package] [--only "<globs>"] [--allow-missing-media]
//                        [--allow-missing-pages] [--allow-missing-seo] [--allow-missing-en] [--skip-sync] [--root <dir>]
//
//   (no flags)   strict gate: integration + CI (Hebrew pages AND en/**)
//   --launch     strict + every [[OWNER: / TODO-OWNER is an error (after the owner answered SPEC §11 1–4)
//   --package    = --allow-missing-pages --allow-missing-seo --allow-missing-en; requires --only (exit 2 without)
//   --only       comma-separated repo-relative globs; page rules run on matching pages, CSS rules on matching CSS
//   --allow-missing-media   missing /assets/video/, /assets/img/{og,story,fx,light}/, materials/tile-* → warnings
//   --allow-missing-pages   links to any page URL of Addendum A2 (incl. /services/…, /journal/…, /film/) and any
//                           /en/… URL, plus P7/P9 root files (favicon.ico, site.webmanifest, sitemap.xml, llms.txt) → warnings
//   --allow-missing-seo     an empty @seo block → warning (the markers must still exist)
//   --allow-missing-en      links to a not-yet-generated /en/ page → warnings
//   --skip-sync             do not run sync-partials --check (rule 9)
//   --root <dir>            check another tree (fixtures / tests)
//
// Rules (errors): 1 physical CSS · 2 <img> attributes · 3 visible placeholders · 4 external origins ·
//   5 internal links · 6 i18n keys (common → runtime dict → data/i18n/<build>.json; duplicates are errors) ·
//   7 i18n drift (he on Hebrew pages, en on en/**; data-i18n-init too) · 8 page structure · 9 partials in sync
//   (Hebrew pages only) · 10 legacy address · 11 frame radius outside base.css · 12 u-lat on a block ·
//   13 data-i18n element with child elements · 14 data-i18n-tpl with text but no data-i18n-init ·
//   15 (strict) Hebrew page without en/ counterpart, or en/ page whose data-i18n* key sequence differs (stale) ·
//   16 banned strings in shipped HTML · 17 data-font-en target missing
//
// Exit: 0 clean (warnings allowed) · 1 errors · 2 usage.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as sync from './sync-partials.mjs';
import * as pages from './lib/pages.mjs';
import { loadDicts } from './lib/dict.mjs';

const argv = process.argv.slice(2);
const FLAGS = new Set();
let only = null, ROOT = pages.REPO;
const KNOWN_FLAGS = ['--launch', '--package', '--allow-missing-media', '--allow-missing-pages', '--allow-missing-seo', '--allow-missing-en', '--skip-sync'];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--only') { only = sync.parseGlobs(argv[++i]); if (!only) { console.error('--only needs a glob list'); process.exit(2); } }
  else if (a.startsWith('--only=')) only = sync.parseGlobs(a.slice(7));
  else if (a === '--root') ROOT = path.resolve(argv[++i] || '.');
  else if (KNOWN_FLAGS.includes(a)) FLAGS.add(a);
  else { console.error(`unknown argument ${a}`); process.exit(2); }
}
if (FLAGS.has('--package')) {
  if (!only) { console.error('--package requires --only "<globs>"'); process.exit(2); }
  FLAGS.add('--allow-missing-pages'); FLAGS.add('--allow-missing-seo'); FLAGS.add('--allow-missing-en');
}
const LAUNCH = FLAGS.has('--launch');
const STRICT = !FLAGS.has('--package');

const errors = [], warnings = [], placeholders = [];
const E = (rule, file, line, msg) => errors.push({ rule, file, line, msg });
const W = (rule, file, line, msg) => warnings.push({ rule, file, line, msg });
const lineAt = sync.lineAt;
const inScope = (rel) => sync.matchesAny(rel, only);

// ------------------------------------------------------------------ file walk
function walkFiles(dir = ROOT, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '_site'].includes(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    const rel = pages.toPosix(path.relative(ROOT, abs));
    if (rel === 'tools/media/out' || rel.startsWith('tools/media/out/')) continue;
    if (ent.isDirectory()) walkFiles(abs, acc); else acc.push(rel);
  }
  return acc;
}
const ALL = walkFiles();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ------------------------------------------------------------------ html tokenizer
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'param']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const TAG_RE = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
function parseAttrs(s) {
  const a = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(s || ''))) a[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return a;
}
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, e) => {
  const k = e.toLowerCase();
  if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[k] ?? all;
});
const collapse = (s) => decode(s).replace(/[\s ]+/g, ' ').trim();
const stripTags = (s) => s.replace(/<[^>]*>/g, '');

/** walkHtml(html, { start(el, stack), end(el, inner), text(text, idx, stack) }) */
function walkHtml(html, h) {
  const stack = [];
  let last = 0, m;
  TAG_RE.lastIndex = 0;
  const emitText = (to) => { if (to > last && h.text) h.text(html.slice(last, to), last, stack); };
  const close = (el, endIdx) => { if (h.end) h.end(el, html.slice(el.contentStart, endIdx)); };
  while ((m = TAG_RE.exec(html))) {
    emitText(m.index);
    last = TAG_RE.lastIndex;
    if (m[0].startsWith('<!')) continue;
    if (m[1]) {
      const name = m[1].toLowerCase();
      let i = stack.length - 1;
      while (i >= 0 && stack[i].name !== name) i--;
      if (i < 0) continue;
      while (stack.length > i) close(stack.pop(), m.index);
      continue;
    }
    const name = m[2].toLowerCase();
    const attrs = parseAttrs(m[3]);
    const parent = stack[stack.length - 1];
    if (parent) parent.children++;
    const el = {
      name, attrs, idx: m.index, contentStart: TAG_RE.lastIndex, children: 0,
      hidden: (parent && parent.hidden) || 'hidden' in attrs || name === 'template',
      ariaHidden: (parent && parent.ariaHidden) || attrs['aria-hidden'] === 'true' || attrs.role === 'presentation',
      inMain: (parent && parent.inMain) || name === 'main',
    };
    if (h.start) h.start(el, stack);
    if (VOID.has(name) || m[4] === '/') { close(el, el.contentStart); continue; }
    if (RAW.has(name)) {
      const closeAt = html.toLowerCase().indexOf(`</${name}`, TAG_RE.lastIndex);
      const end = closeAt < 0 ? html.length : closeAt;
      const gt = html.indexOf('>', end);
      TAG_RE.lastIndex = last = gt < 0 ? html.length : gt + 1;
      close(el, end);
      continue;
    }
    stack.push(el);
  }
  emitText(html.length);
  while (stack.length) close(stack.pop(), html.length);
}

// ------------------------------------------------------------------ URL helpers
const A2_PAGES = ['/', '/projects/', '/projects/stone-oak-kitchen/', '/projects/oak-living-room/', '/projects/travertine-bathroom/',
  '/projects/dark-oak-bedroom/', '/projects/dark-oak-kitchen/', '/film/', '/studio/', '/contact/', '/contact/thanks/',
  '/accessibility/', '/privacy/', '/services/', '/journal/'];
const OTHER_PKG_FILES = ['/favicon.ico', '/site.webmanifest', '/sitemap.xml', '/llms.txt', '/robots.txt'];
const isOtherPackageUrl = (p) => {
  if (pages.isEnUrl(p)) return true; // every /en/… URL (Addendum A9.2)
  return A2_PAGES.includes(p) || OTHER_PKG_FILES.includes(p) || /^\/(services|journal)\/[a-z0-9-]+\/$/.test(p);
};
const MEDIA_RE = /^\/assets\/(video\/|img\/(og|story|fx|light)\/|img\/materials\/tile-)/;
const EXT_OK_A = new Set(['www.instagram.com', 'ig.me', 'www.nevo.co.il', 'www.gov.il']); // A9.2 v2: nevo/gov.il for prose `sources`

function resolveInternal(url, baseUrl) {
  if (!url || /^(#|mailto:|tel:|data:|blob:|javascript:|about:)/i.test(url)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null;
  let p = url.split(/[?#]/)[0];
  if (!p) return null;
  if (!p.startsWith('/')) p = new URL(p, 'http://x' + baseUrl).pathname;
  try { p = decodeURI(p); } catch { /* keep raw */ }
  return p;
}
function existsUrl(p) {
  const f = path.join(ROOT, p.replace(/^\/+/, ''));
  if (p.endsWith('/')) return fs.existsSync(path.join(f, 'index.html'));
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return true;
  return fs.existsSync(path.join(f, 'index.html'));
}
function checkLink(rel, line, url, baseUrl, what) {
  const p = resolveInternal(url, baseUrl);
  if (p == null || existsUrl(p)) return;
  if (MEDIA_RE.test(p) && FLAGS.has('--allow-missing-media')) return W(5, rel, line, `missing media ${p} (allowed until P7 lands)`);
  if (pages.isEnUrl(p) && FLAGS.has('--allow-missing-en') && existsUrl(pages.counterpartUrl(p, 'he'))) return W(5, rel, line, `English page not generated yet: ${p}`);
  if (isOtherPackageUrl(p) && FLAGS.has('--allow-missing-pages')) return W(5, rel, line, `not written yet: ${p}`);
  E(5, rel, line, `broken ${what}: ${url}`);
}
const isExternal = (u) => /^(https?:)?\/\//i.test(u || '');
const hostOf = (u) => { try { return new URL(u, 'https://x').host; } catch { return ''; } };
const srcsetUrls = (s) => (s || '').split(',').map((x) => x.trim().split(/\s+/)[0]).filter(Boolean);

// ------------------------------------------------------------------ page rules
const BLOCK_ULAT = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption', 'dt', 'dd']);
const I18N_ATTRS = ['data-i18n', 'data-i18n-html', 'data-i18n-attr', 'data-i18n-tpl', 'data-i18n-init'];
const usedKeys = new Set();
const keySeq = new Map(); // rel → [ 'attr=key', … ]
const reportedDictErr = new Set();
const HEB = /[֐-׿]/;
const isEnPage = (rel) => pages.isEnFile(rel) || /-en\.html$/.test(rel);

async function checkPage(rel) {
  const src = read(rel);
  const info = sync.pageInfo(src, rel);
  const underTools = /^(en\/)?tools\//.test(rel);
  const d = await loadDicts(ROOT, { dict: info.dict, build: info.build });
  for (const e of d.errors) {
    const k = `${e}`;
    if (!reportedDictErr.has(k)) { reportedDictErr.add(k); E(6, rel, 1, e); }
  }
  const map = d.map;
  const lang = isEnPage(rel) ? 'en' : 'he';
  const L = (idx) => lineAt(src, idx);
  const seq = [];
  let h1 = 0, hasMain = false, skip = false, imgInMain = 0;

  walkHtml(src, {
    start(el) {
      const a = el.attrs, line = L(el.idx);
      for (const k of I18N_ATTRS) if (a[k] != null) seq.push(`${k}=${a[k]}`);
      if (el.name === 'h1') h1++;
      if (el.name === 'main' && a.id === 'main') hasMain = true;
      if (el.name === 'a' && (/\bskip-link\b/.test(a.class || '') || a.href === '#main')) skip = true;
      // 2 images
      if (el.name === 'img') {
        if (!('width' in a) || !('height' in a) || !('alt' in a)) E(2, rel, line, `<img> needs width, height and alt (${a.src || ''})`);
        else if (a.alt === '' && !el.ariaHidden) E(2, rel, line, `alt="" needs aria-hidden="true" on an ancestor or role="presentation" (${a.src || ''})`);
        if (el.inMain) { imgInMain++; if (imgInMain > 1 && !('loading' in a)) W(2, rel, line, `below-the-fold <img> without loading= (${a.src || ''})`); }
      }
      // 12 u-lat on a block
      if (BLOCK_ULAT.has(el.name) && /(^|\s)u-lat(\s|$)/.test(a.class || '')) E(12, rel, line, `u-lat on <${el.name}> (wrap the Latin in an inline <span class="u-lat" lang="en">)`);
      // 3 leaked placeholders in attributes
      for (const [k, v] of Object.entries(a)) if (v.includes('{{') && !el.hidden) E(3, rel, line, `unresolved {{…}} in ${k}="${v.slice(0, 60)}"`);
      // 4 external origins, 5 internal links
      const ext = (u, what) => { if (isExternal(u)) E(4, rel, line, `external origin in ${what}: ${u}`); };
      const rels = (a.rel || '').toLowerCase().split(/\s+/);
      const canon = el.name === 'link' && (rels.includes('canonical') || rels.includes('alternate'));
      if (el.name === 'script' && a.src) ext(a.src, '<script src>');
      if (el.name === 'link' && a.href && !canon) ext(a.href, '<link href>');
      if (['img', 'source', 'video', 'audio', 'track', 'iframe', 'embed'].includes(el.name)) {
        if (a.src) ext(a.src, `<${el.name} src>`);
        for (const u of srcsetUrls(a.srcset)) ext(u, `<${el.name} srcset>`);
        if (a.poster) ext(a.poster, `<${el.name} poster>`);
      }
      if (el.name === 'a' && isExternal(a.href) && !EXT_OK_A.has(hostOf(a.href))) E(4, rel, line, `external link host not allowed: ${a.href}`);
      if (el.name === 'form' && a.action && isExternal(a.action) && hostOf(a.action) !== 'formsubmit.co') E(4, rel, line, `form action host not allowed: ${a.action}`);
      if (a.style && /url\(\s*['"]?(https?:)?\/\//i.test(a.style)) E(4, rel, line, 'external url() in a style attribute');
      if (a.href && el.name !== 'use' && !canon) checkLink(rel, line, a.href, info.url, `<${el.name} href>`);
      if (a.src) checkLink(rel, line, a.src, info.url, `<${el.name} src>`);
      if (a.poster) checkLink(rel, line, a.poster, info.url, `<${el.name} poster>`);
      for (const u of srcsetUrls(a.srcset)) checkLink(rel, line, u, info.url, `<${el.name} srcset>`);
      for (const u of srcsetUrls(a.imagesrcset)) checkLink(rel, line, u, info.url, 'imagesrcset');
      if (a['data-sources']) {
        try {
          for (const s of JSON.parse(decode(a['data-sources']))) for (const k of ['webm', 'mp4']) if (s[k]) { ext(s[k], 'data-sources'); checkLink(rel, line, s[k], info.url, 'data-sources'); }
        } catch { E(5, rel, line, 'data-sources is not valid JSON'); }
      }
      // 17 data-font-en
      if (a['data-font-en'] != null) {
        const p = resolveInternal(a['data-font-en'], info.url);
        if (!p || !existsUrl(p)) E(17, rel, line, `data-font-en target missing: ${a['data-font-en']}`);
      }
      // 6 keys
      const need = (key, kind) => {
        usedKeys.add(key);
        const e = map[key];
        if (!e) return E(6, rel, line, `${kind} key "${key}" not found (common → ${info.dict || '—'} → ${info.build || '—'})`);
        if (typeof e.he !== 'string' || !e.he || typeof e.en !== 'string' || !e.en) E(6, rel, line, `key "${key}" needs non-empty he and en`);
        return e;
      };
      if (a['data-i18n'] != null) {
        const e = need(a['data-i18n'], 'data-i18n');
        if (e && typeof e.he === 'string' && e.he.includes('{')) E(7, rel, line, `interpolated key "${a['data-i18n']}" on data-i18n (use data-i18n-tpl)`);
      }
      if (a['data-i18n-html'] != null) need(a['data-i18n-html'], 'data-i18n-html');
      if (a['data-i18n-tpl'] != null) need(a['data-i18n-tpl'], 'data-i18n-tpl');
      if (a['data-i18n-init'] != null) need(a['data-i18n-init'], 'data-i18n-init');
      if (a['data-i18n-attr'] != null) {
        for (const pair of a['data-i18n-attr'].split(';')) {
          const i = pair.indexOf(':');
          if (i < 0) { E(6, rel, line, `malformed data-i18n-attr "${a['data-i18n-attr']}"`); continue; }
          const e = need(pair.slice(i + 1).trim(), 'data-i18n-attr');
          const attr = pair.slice(0, i).trim().toLowerCase();
          if (e && typeof e[lang] === 'string' && a[attr] != null && collapse(a[attr]) !== collapse(e[lang])) {
            W(7, rel, line, `attribute drift on ${attr} "${pair.slice(i + 1).trim()}": "${a[attr].slice(0, 50)}" ≠ ${lang} "${e[lang].slice(0, 50)}"`);
          }
        }
      }
    },
    end(el, inner) {
      const a = el.attrs, line = L(el.idx);
      const key = a['data-i18n'] ?? a['data-i18n-init'];
      // 13 data-i18n must be text only
      if (a['data-i18n'] != null && el.children > 0) E(13, rel, line, `data-i18n="${a['data-i18n']}" element has child elements (use data-i18n-html)`);
      // 14 tpl with shipped text needs an init key
      if (a['data-i18n-tpl'] != null && collapse(stripTags(inner)) && a['data-i18n-init'] == null) E(14, rel, line, `data-i18n-tpl="${a['data-i18n-tpl']}" ships text but has no data-i18n-init`);
      // 7 drift
      if (key != null) {
        const e = map[key];
        const want = e && e[lang];
        if (typeof want === 'string' && !want.includes('{')) {
          const got = collapse(stripTags(inner));
          if (got !== collapse(want)) E(7, rel, line, `drift on "${key}": HTML "${got.slice(0, 70)}" ≠ ${lang} "${collapse(want).slice(0, 70)}"`);
        }
      }
      if (a['data-i18n-html'] != null) {
        const e = map[a['data-i18n-html']];
        let want = e && e[lang];
        // en/**: gen-en rewrites page links inside data-i18n-html values (A3.7 step 5); compare against the same rewrite
        if (lang === 'en' && typeof want === 'string') want = want.replace(/\bhref="([^"]*)"/g, (m, h) => (pages.isPageLink(h) ? `href="${h === '/' ? '/en/' : '/en' + h}"` : m));
        const norm = (s) => collapse(s).replace(/>\s+</g, '><');
        if (typeof want === 'string' && norm(inner) !== norm(want)) W(7, rel, line, `data-i18n-html drift on "${a['data-i18n-html']}"`);
      }
    },
    text(text, idx, stack) {
      const top = stack[stack.length - 1];
      if (top && top.hidden) return;
      const m = text.match(/TODO-OWNER|\[\[OWNER:|\{\{/);
      if (m) E(3, rel, L(idx + m.index), `visible placeholder "${m[0]}" in text`);
    },
  });
  keySeq.set(rel, seq);

  // 8 structure
  if (h1 !== 1) E(8, rel, 1, `expected exactly one <h1>, found ${h1}`);
  if (!hasMain) E(8, rel, 1, 'missing <main id="main">');
  const ha = parseAttrs(((src.match(/<html\b([^>]*)>/i) || [, ''])[1]));
  const wantDir = lang === 'en' ? 'ltr' : 'rtl';
  const bilingual = 'data-bilingual' in ha;
  if (ha.lang !== lang || ha.dir !== wantDir) E(8, rel, 1, `expected <html lang="${lang}" dir="${wantDir}">, found lang="${ha.lang}" dir="${ha.dir}"`);
  if (bilingual && lang !== 'he') E(8, rel, 1, 'data-bilingual is only for the Hebrew 404.html');
  if (!skip) E(8, rel, 1, 'missing skip link (a.skip-link → #main)');
  const bodyA = parseAttrs(((src.match(/<body\b([^>]*)>/i) || [, ''])[1]));
  if (!bodyA['data-page']) E(8, rel, lineAt(src, Math.max(0, src.search(/<body\b/i))), 'missing <body data-page>');
  const seo = src.match(/<!--\s*@seo\s*-->([\s\S]*?)<!--\s*\/@seo\s*-->/);
  if (!seo) E(8, rel, 1, 'missing <!-- @seo --> … <!-- /@seo --> markers');
  else if (!underTools && !(/<title>[^<]+<\/title>/.test(seo[1]) && /<meta\s+name="description"\s+content="[^"]+"/.test(seo[1]))) {
    (FLAGS.has('--allow-missing-seo') ? W : E)(8, rel, lineAt(src, seo.index), '@seo block needs <title> and <meta name="description">');
  }
}

// ------------------------------------------------------------------ CSS rules
const PHYS_RE = /(^|[^-])(margin|padding|border)-(left|right)\b|\b(left|right)\s*:|text-align\s*:\s*(left|right)|float\s*:\s*(left|right)|border-(top|bottom)-(left|right)-radius/;
function walkCss(css, cb) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const stack = [];
  let buf = '', bufStart = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') { stack.push(buf.slice(buf.lastIndexOf(';') + 1).trim()); buf = ''; bufStart = i + 1; }
    else if (ch === '}') { cb(stack.slice(), buf, bufStart); stack.pop(); buf = ''; bufStart = i + 1; }
    else buf += ch;
  }
}
function checkCss(rel) {
  const css = read(rel);
  css.split('\n').forEach((ln, i) => {
    if (!ln.includes('phys-ok') && PHYS_RE.test(ln.replace(/\/\*.*?\*\//g, ''))) E(1, rel, i + 1, `physical property: ${ln.trim().slice(0, 90)}`);
  });
  const urlRe = /url\(\s*"([^"]*)"\s*\)|url\(\s*'([^']*)'\s*\)|url\(\s*([^'")\s]+)\s*\)|@import\s+(['"])([^'"]+)\4/g;
  let m;
  while ((m = urlRe.exec(css))) {
    const u = m[1] ?? m[2] ?? m[3] ?? m[5];
    const line = lineAt(css, m.index);
    if (isExternal(u)) E(4, rel, line, `external origin in CSS: ${u}`);
    else checkLink(rel, line, u, '/' + rel, 'CSS url()');
  }
  if (rel !== 'css/base.css') {
    walkCss(css, (sels, decls, start) => {
      const own = sels.filter((s) => !s.startsWith('@'));
      if (!own.length || sels.some((s) => /^@(-webkit-)?keyframes/i.test(s))) return;
      const d = decls.search(/border(-[a-z]+)*-radius\s*:/i);
      if (d >= 0 && /frame|img|video/i.test(own.join(' '))) E(11, rel, lineAt(css, start + d), `border-radius on "${own[own.length - 1].slice(0, 60)}" (frames/images/video round only via css/base.css)`);
    });
  }
}

// ------------------------------------------------------------------ run
const LEGACY = ['hello', 'sele-studio.com'].join('@');
// 16: banned strings in shipped HTML and runtime dictionaries js/i18n/*.js (A9.2 v2; built from parts so this file never matches itself)
const BANNED = [['אדריכל', 'ית'], ['תכנון אדריכ', 'לי'], ['מונולי', 'טי'], ['גרי', 'יז'], ['SERVICE', '_AREA'], ['/appro', 'ach/'], ['/projects/stone', '-kitchen/'],
  ['/projects/travertine', '-bath/'], ['/projects/oak-and', '-stone-living/'], ['/projects/bed', 'room/'],
  ['/services/architectural', '-planning/'], ['/services/renovation', '-support/']].map((p) => p.join(''));

const pageList = pages.listPages(ROOT, { lang: 'all' }).filter(inScope);
// css/core.css is sync-partials' generated bundle of five sources that are checked themselves (rule 9 catches a stale one)
const cssFiles = ALL.filter((f) => /^css\/.*\.css$/.test(f) && f !== sync.CORE_CSS && inScope(f));

for (const rel of pageList) await checkPage(rel);
for (const rel of cssFiles) checkCss(rel);

// 9 partials in sync (Hebrew set only; en/** is never synced)
if (!FLAGS.has('--skip-sync')) {
  const res = await sync.run({ root: ROOT, only, check: true, quiet: true });
  for (const e of res.errors) { const m = /^(.*?):(\d+): (.*)$/.exec(e); if (m) E(9, m[1], Number(m[2]), m[3]); else E(9, '?', 1, e); }
  for (const f of res.changed) E(9, f, 1, f === sync.CORE_CSS ? 'stale CSS bundle (run: node tools/sync-partials.mjs)' : 'partials out of sync (run: node tools/sync-partials.mjs --only "<your globs>")');
}

// 15 EN mirror completeness + staleness (strict only)
if (STRICT) {
  for (const rel of pageList) {
    if (pages.isEnFile(rel)) {
      const he = pages.heFileOf(rel);
      if (!fs.existsSync(path.join(ROOT, he))) { E(15, rel, 1, `English page without a Hebrew source (${he})`); continue; }
      const heSeq = keySeq.get(he) ?? await (async () => { await checkPageSeqOnly(he); return keySeq.get(he); })();
      const enSeq = keySeq.get(rel);
      if (heSeq && enSeq && heSeq.join('\n') !== enSeq.join('\n')) {
        let i = 0; while (i < heSeq.length && heSeq[i] === enSeq[i]) i++;
        E(15, rel, 1, `stale mirror: data-i18n* key sequence differs from ${he} at #${i + 1} (${heSeq[i] || '∅'} ≠ ${enSeq[i] || '∅'}) — run gen-en`);
      }
    } else if (rel !== '404.html' && !rel.startsWith('tools/')) {
      if (!fs.existsSync(path.join(ROOT, pages.enFileOf(rel)))) E(15, rel, 1, `no English counterpart ${pages.enFileOf(rel)} (run gen-en)`);
    }
  }
}
async function checkPageSeqOnly(rel) {
  const seq = [];
  walkHtml(read(rel), { start(el) { for (const k of I18N_ATTRS) if (el.attrs[k] != null) seq.push(`${k}=${el.attrs[k]}`); } });
  keySeq.set(rel, seq);
}

// 10 legacy address, 16 banned strings, placeholder report (text files in scope)
const TEXT_EXT = /\.(html|css|js|mjs|json|xml|txt|md|webmanifest|yml|yaml|svg)$/i;
for (const rel of ALL.filter((f) => TEXT_EXT.test(f) && inScope(f))) {
  if (rel === 'tools/check.mjs') continue;
  const s = read(rel);
  let i = s.indexOf(LEGACY);
  while (i >= 0) { E(10, rel, lineAt(s, i), `legacy address ${LEGACY} (use office@sele-studio.com)`); i = s.indexOf(LEGACY, i + 1); }
  const shippedHtml = /\.html$/.test(rel) && !/^(en\/)?tools\//.test(rel);
  const runtimeDict = /^js\/i18n\/[^/]+\.js$/.test(rel);
  if (shippedHtml || runtimeDict) {
    for (const b of BANNED) { let j = s.indexOf(b); while (j >= 0) { E(16, rel, lineAt(s, j), `banned string "${b}"`); j = s.indexOf(b, j + 1); } }
  }
  if (rel.startsWith('tools/') && /\.m?js$/.test(rel)) continue; // the tools name the markers
  const PH_RE = /TODO-OWNER|TODO-COPY|\[\[OWNER:/g;
  let m;
  while ((m = PH_RE.exec(s))) {
    const line = lineAt(s, m.index);
    placeholders.push({ kind: m[0].replace(':', ''), file: rel, line });
    if (LAUNCH && m[0] !== 'TODO-COPY') E(3, rel, line, `${m[0]} left before launch`);
  }
}

// unused keys (full runs only; JS string references count as use)
if (!only) {
  const js = ALL.filter((f) => /^js\/.*\.js$/.test(f) && !f.startsWith('js/i18n/')).map(read).join('\n');
  for (const f of ALL.filter((x) => /^js\/i18n\/[^/]+\.js$/.test(x))) {
    try {
      const d = (await import(pathToFileURL(path.join(ROOT, f)).href)).default || {};
      for (const k of Object.keys(d)) if (!usedKeys.has(k) && !js.includes(k)) W(6, f, 1, `key "${k}" is not used by any page`);
    } catch { /* reported above */ }
  }
}

// ------------------------------------------------------------------ report
const mode = LAUNCH ? 'launch' : FLAGS.has('--package') ? 'package' : 'strict';
const fmt = (x) => `  [${x.rule}] ${x.file}:${x.line}  ${x.msg}`;
const sortBy = (a, b) => a.file.localeCompare(b.file) || a.line - b.line;
console.log(`check.mjs — ${mode} mode${only ? ` — only: ${only.join(',')}` : ''}${[...FLAGS].filter((f) => f.startsWith('--allow') || f === '--skip-sync').map((f) => ' ' + f).join('')}`);
console.log(`scope: ${pageList.length} page(s), ${cssFiles.length} CSS file(s)${ROOT !== pages.REPO ? ` — root ${ROOT}` : ''}`);
if (warnings.length) { console.log(`\nWARNINGS (${warnings.length})`); warnings.sort(sortBy).forEach((w) => console.log(fmt(w))); }
if (errors.length) { console.log(`\nERRORS (${errors.length})`); errors.sort(sortBy).forEach((e) => console.log(fmt(e))); }
const count = (k) => placeholders.filter((p) => p.kind === k).length;
console.log(`\nPLACEHOLDERS: TODO-OWNER ${count('TODO-OWNER')} · TODO-COPY ${count('TODO-COPY')} · [[OWNER ${count('[[OWNER')}`);
for (const p of placeholders.sort(sortBy)) console.log(`  ${p.kind}  ${p.file}:${p.line}`);
console.log(errors.length ? `\n✖ ${errors.length} error(s), ${warnings.length} warning(s)` : `\n✔ 0 errors, ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
