#!/usr/bin/env node
// SELÈ STUDIO — tools/sync-partials.mjs (zero dependencies, node >= 20)
//
//   node tools/sync-partials.mjs                         write every page (integration only, run by the lead)
//   node tools/sync-partials.mjs --only "<glob>[,<glob>]" write only pages whose repo-relative path matches
//   node tools/sync-partials.mjs --check [--only …]      write nothing; exit 1 if any selected page would change
//
// Fills every  <!-- @partial:NAME -->…<!-- /@partial:NAME -->  region with partials/NAME.html, processed:
//   {{v}}            per attribute: first 10 hex chars of the SHA-1 of the file that href/src points to
//   {{dict}}         the page's <body data-i18n-dict>; the whole line is dropped when the page has none
//   {{bootHash}}     base64 SHA-256 of the inline boot script in partials/head.html (the CSP hash)
//   data-lang-switch every such tag gets href = /en + the page's URL path (index.html → /en/, x/index.html →
//                    /en/x/; 404.html and any other non-index file → /en/)   (Addendum A9.1)
//   data-nav="X"     when X equals the page's <body data-nav>: aria-current="page" if the link's href is the page's
//                    own URL path, else aria-current="true" (the page sits under that section, e.g. /contact/thanks/)
// Then every ?v=… on href="/css/…" and src="/js/…" anywhere in the page becomes that file's own hash.
//
// Core CSS bundle: before any page, css/core.css is rebuilt from css/{fonts,tokens,base,chrome,motion}.css (in that
// cascade order; comments dropped, whitespace collapsed, strings kept byte for byte) so every page makes one
// render-blocking request for the shared CSS instead of five. Edit the five sources, never core.css; --check reports a
// stale bundle as "css/core.css" among the changed files. The write is atomic (tmp + rename) and only when the bytes differ.
//
// Page set: tools/lib/pages.mjs, Hebrew set — en/** is NEVER synced (gen-en copies synced Hebrew pages).
// The one English page in the set is the hand-written demo tools/demo/components-en.html (<html lang="en">):
// its partials are rendered in English exactly like gen-en does (A3.7 steps 3, 5, 6, 7) and its language
// links point at tools/demo/components.html.
//
// Required markers: head header menu footer a11y sprite scripts. Optional: cta. Idempotent.
// --root <dir> runs against another tree (tests / fixtures).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as pages from './lib/pages.mjs';
import { loadDicts } from './lib/dict.mjs';

export { loadDicts };
export const ROOT = pages.REPO;
export const REQUIRED = ['head', 'header', 'menu', 'footer', 'a11y', 'sprite', 'scripts'];
export const OPTIONAL = ['cta'];
const KNOWN = new Set([...REQUIRED, ...OPTIONAL]);
export const { toPosix, urlPathOf, counterpartUrl, isEnUrl, isPageLink } = pages;
export const pageUrl = pages.urlPathOf;

// ------------------------------------------------------------------ globs
export function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
      } else re += '[^/]*';
    } else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}
export const parseGlobs = (s) => (s ? String(s).split(',').map((g) => g.trim()).filter(Boolean) : null);
export const matchesAny = (rel, globs) => !globs || globs.some((g) => globToRegex(g).test(rel));

/** the synced page set (Hebrew set of tools/lib/pages.mjs: en/** excluded) */
export const listPages = (root = ROOT) => pages.listPages(root, { lang: 'he' });

// ------------------------------------------------------------------ hashing
export function urlToFile(root, url) {
  let clean = url.split(/[?#]/)[0];
  try { clean = decodeURI(clean); } catch { /* keep raw */ }
  return path.join(root, clean.replace(/^\/+/, ''));
}
export function fileHash(root, url) {
  const f = urlToFile(root, url);
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return null;
  return crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 10);
}
export function bootScript(headSrc) {
  const m = headSrc.match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}
export const bootHash = (headSrc) => crypto.createHash('sha256').update(bootScript(headSrc) ?? '', 'utf8').digest('base64');

// ------------------------------------------------------------------ core CSS bundle
export const CORE_CSS = 'css/core.css';
export const CORE_SOURCES = ['css/fonts.css', 'css/tokens.css', 'css/base.css', 'css/chrome.css', 'css/motion.css'];

/** drop comments, collapse whitespace; quoted strings (data: URIs, content:"…") pass through untouched */
export function minifyCss(css) {
  const PUNCT = '{};,>'; // whitespace on either side of these is never significant (calc's + - * / and ':' are left alone)
  let out = '', i = 0, ws = false;
  const n = css.length;
  const emit = (s) => {
    if (ws && out && !PUNCT.includes(out[out.length - 1])) out += ' ';
    ws = false;
    out += s;
  };
  while (i < n) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; ws = true; continue; }
    if (/\s/.test(ch)) { ws = true; i++; continue; }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && css[j] !== ch) j += css[j] === '\\' ? 2 : 1;
      emit(css.slice(i, j + 1)); i = j + 1; continue;
    }
    if (PUNCT.includes(ch)) {
      ws = false;
      if (ch === '}' && out.endsWith(';')) out = out.slice(0, -1); // a string always ends in a quote, so this ';' is syntax
      out += ch; i++; continue;
    }
    emit(ch); i++;
  }
  return out;
}

/** the bundle text, or { missing } when a source file is absent (fixture trees) */
export function buildCoreCss(root = ROOT) {
  const missing = CORE_SOURCES.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) return { missing };
  const parts = CORE_SOURCES.map((f) => minifyCss(fs.readFileSync(path.join(root, f), 'utf8')));
  const head = `/* SELÈ STUDIO — GENERATED by tools/sync-partials.mjs from ${CORE_SOURCES.join(' + ')}. Do not edit; edit the sources and re-run sync-partials. */`;
  return { css: head + '\n' + parts.join('\n') + '\n' };
}

/** rebuild css/core.css → { changed, missing } (check: compare only) */
export function syncCoreCss(root = ROOT, { check = false } = {}) {
  const b = buildCoreCss(root);
  if (b.missing) return { changed: false, missing: b.missing };
  const f = path.join(root, CORE_CSS);
  const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  if (cur === b.css) return { changed: false, missing: [] };
  if (!check) {
    const tmp = `${f}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, b.css);
    fs.renameSync(tmp, f);
  }
  return { changed: true, missing: [] };
}

// ------------------------------------------------------------------ English rendering (same rules as gen-en, A3.7)
export const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function findClose(html, from, tag) {
  const re = new RegExp(`<(/?)${tag}(?=[\\s>/])[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[1]) { if (--depth === 0) return m.index; }
    else if (!m[0].endsWith('/>')) depth++;
  }
  return -1;
}
export function setAttr(tag, name, value) {
  const re = new RegExp(`(\\s${name}\\s*=\\s*)("[^"]*"|'[^']*'|[^\\s>]+)`, 'i');
  if (re.test(tag)) return tag.replace(re, `$1"${escAttr(value)}"`);
  return tag.replace(/\s*(\/?)>$/, ` ${name}="${escAttr(value)}"$1>`);
}
export const getAttr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}(\\s|=|>|/)`, 'i').test(tag);

/**
 * translate(html, dict, lang) — dict: key → {he, en} (a plain object or a loadDicts() result's .map).
 * Applies data-i18n (text), data-i18n-init (text of the init key), data-i18n-html (inner HTML) and
 * data-i18n-attr (attributes). data-i18n-tpl nodes without an init key are left alone. → { html, missing[] }
 */
export function translate(html, dict, lang) {
  const missing = [];
  const val = (k) => {
    const e = dict[k];
    if (!e || typeof e[lang] !== 'string' || e[lang] === '') { missing.push(k); return null; }
    return e[lang];
  };
  html = html.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr\s*=\s*"([^"]*)"[^>]*>/g, (tag, spec) => {
    for (const pair of spec.split(';')) {
      const i = pair.indexOf(':');
      if (i < 0) continue;
      const v = val(pair.slice(i + 1).trim());
      if (v != null) tag = setAttr(tag, pair.slice(0, i).trim(), v);
    }
    return tag;
  });
  const re = /<([a-zA-Z][\w-]*)\b[^>]*\sdata-i18n(-html|-init)?\s*=\s*"([^"]*)"[^>]*>/g;
  let out = '', i = 0, m;
  while ((m = re.exec(html))) {
    const [tag, name, kind, key] = m;
    const start = m.index + tag.length;
    const close = findClose(html, start, name);
    if (close < 0) continue;
    const v = val(key);
    out += html.slice(i, start) + (v == null ? html.slice(start, close) : kind === '-html' ? v : escText(v));
    i = close;
    re.lastIndex = close;
  }
  return { html: out + html.slice(i), missing };
}

/** A3.7 step 5: prefix internal page links with /en (English pages) */
export function localizeLinks(html, lang) {
  if (lang !== 'en') return html;
  return html.replace(/(<a\b[^>]*\shref=")([^"]*)(")/g, (all, a, href, z) => (isPageLink(href) ? a + counterpartUrl(href, 'en') + z : all));
}

/** A9.1 (Hebrew) / A3.7 step 6 (English): language links */
export function setLangLinks(html, lang, href) {
  return html.replace(/<a\b[^>]*\sdata-lang-switch\b[^>]*>/g, (tag, idx) => {
    let t = setAttr(tag, 'href', href);
    if (lang === 'en') {
      t = setAttr(setAttr(setAttr(t, 'hreflang', 'he'), 'lang', 'he'), 'dir', 'rtl');
      if (hasAttr(t, 'aria-label')) t = setAttr(t, 'aria-label', 'עב, גרסה עברית');
    }
    return t;
  }).replace(/(<a\b[^>]*\sdata-lang-switch\b[^>]*>)([^<]*)(<\/a>)/g, (all, open, text, close) => {
    if (lang !== 'en') return all;
    return open + (getAttr(open, 'data-lang-switch') === 'pill' ? 'לגרסה העברית ←' : 'עב') + close;
  });
}

/** A3.7 step 7 */
export const swapFontPreloads = (html) => html.replace(/<link\b[^>]*\sdata-font-en="([^"]*)"[^>]*>/g, (tag, en) => setAttr(tag, 'href', en));

// ------------------------------------------------------------------ markers
const MARKER = /<!--\s*(\/?)@partial:([A-Za-z0-9_-]+)\s*-->/g;
export const lineAt = (src, idx) => src.slice(0, idx).split('\n').length;

export function findRegions(src) {
  const regions = [], errors = [];
  let open = null, m;
  MARKER.lastIndex = 0;
  while ((m = MARKER.exec(src))) {
    const [raw, slash, name] = m;
    const line = lineAt(src, m.index);
    if (!KNOWN.has(name)) { errors.push({ line, msg: `unknown partial "${name}"` }); continue; }
    if (!slash) {
      if (open) { errors.push({ line, msg: `@partial:${name} opened inside @partial:${open.name} (line ${open.line})` }); continue; }
      open = { name, line, openEnd: m.index + raw.length };
    } else {
      if (!open || open.name !== name) { errors.push({ line, msg: `unbalanced /@partial:${name}` }); continue; }
      regions.push({ name, line: open.line, innerStart: open.openEnd, innerEnd: m.index });
      open = null;
    }
  }
  if (open) errors.push({ line: open.line, msg: `@partial:${open.name} is never closed` });
  const seen = new Map();
  for (const r of regions) {
    if (seen.has(r.name)) errors.push({ line: r.line, msg: `@partial:${r.name} appears twice` });
    seen.set(r.name, r);
  }
  for (const n of REQUIRED) if (!seen.has(n)) errors.push({ line: 1, msg: `missing required marker @partial:${n}` });
  return { regions, errors };
}

export function pageInfo(src, rel) {
  const htmlTag = (src.match(/<html\b[^>]*>/i) || ['<html>'])[0];
  const bodyTag = (src.match(/<body\b[^>]*>/i) || ['<body>'])[0];
  const lang = (getAttr(htmlTag, 'lang') || 'he').toLowerCase().startsWith('en') ? 'en' : 'he';
  return {
    lang,
    dict: getAttr(bodyTag, 'data-i18n-dict') || null,
    build: getAttr(bodyTag, 'data-i18n-build') || null,
    nav: getAttr(bodyTag, 'data-nav') || null,
    url: urlPathOf(rel),
  };
}

/** aria-current for a section nav link: "page" when it points at this very page, "true" when the page is inside the
 *  section (/contact/thanks/ under /contact/). Language prefix, query and hash are ignored. */
export function navCurrent(href, url) {
  const norm = (u) => counterpartUrl(String(u || '').split(/[?#]/)[0], 'he');
  return href && norm(href) === norm(url) ? 'page' : 'true';
}

/** the language-link target for a synced page */
export function langHrefFor(rel, lang) {
  if (lang === 'en') {
    if (/-en\.html$/.test(rel)) return '/' + rel.replace(/-en\.html$/, '.html');
    return counterpartUrl(urlPathOf(rel), 'he');
  }
  return pages.langLinkHref(rel);
}

// ------------------------------------------------------------------ one page
export async function syncPage(root, rel, src, partials) {
  const errors = [];
  const err = (line, msg) => errors.push(`${rel}:${line}: ${msg}`);
  const info = pageInfo(src, rel);
  const { regions, errors: mErr } = findRegions(src);
  for (const e of mErr) err(e.line, e.msg);
  if (mErr.length) return { out: src, errors, info };

  let dict = null;
  if (info.lang === 'en') {
    const d = await loadDicts(root, { dict: info.dict, build: info.build });
    for (const e of d.errors) err(1, e);
    dict = d.map;
  }
  const langHref = langHrefFor(rel, info.lang);

  let out = '', cursor = 0;
  for (const r of regions) {
    let text = partials[r.name];
    if (text == null) { err(r.line, `partials/${r.name}.html not found`); continue; }
    text = text.replace(/\n+$/, '');
    text = info.dict ? text.replace(/\{\{dict\}\}/g, info.dict) : text.split('\n').filter((l) => !l.includes('{{dict}}')).join('\n');
    if (text.includes('{{bootHash}}')) text = text.replace(/\{\{bootHash\}\}/g, bootHash(partials.head || ''));
    if (info.lang === 'en' && dict) {
      const t = translate(text, dict, 'en');
      for (const k of new Set(t.missing)) err(r.line, `@partial:${r.name}: key "${k}" has no English value`);
      text = swapFontPreloads(localizeLinks(t.html, 'en'));
    }
    text = setLangLinks(text, info.lang, langHref);
    text = text.replace(/(\s(?:href|src)=")([^"]*?)\?v=\{\{v\}\}(")/g, (all, a, url, z) => {
      const h = fileHash(root, url);
      if (!h) { err(r.line, `@partial:${r.name}: ${url} does not exist (needed for ?v=)`); return all; }
      return `${a}${url}?v=${h}${z}`;
    });
    if (info.nav) {
      text = text.replace(/<[a-zA-Z][^>]*>/g, (tag) => {
        if (!tag.includes(`data-nav="${info.nav}"`) || /\saria-current=/.test(tag)) return tag;
        const current = navCurrent(getAttr(tag, 'href'), info.url);
        return tag.replace(`data-nav="${info.nav}"`, `data-nav="${info.nav}" aria-current="${current}"`);
      });
    }
    const left = text.match(/\{\{[A-Za-z]+\}\}/);
    if (left) err(r.line, `@partial:${r.name}: unresolved placeholder ${left[0]}`);
    const closeIndent = (src.slice(0, r.innerEnd).match(/[ \t]*$/) || [''])[0];
    out += src.slice(cursor, r.innerStart) + '\n' + text + '\n' + closeIndent;
    cursor = r.innerEnd;
  }
  out += src.slice(cursor);

  // per-file ?v= on every /css/… and /js/… URL in the page (page-owned lines included)
  const before = out;
  out = out.replace(/(\s(?:href|src)=")(\/(?:css|js)\/[^"?#]+)\?v=[A-Za-z0-9]+(")/g, (all, a, url, z, idx) => {
    const h = fileHash(root, url);
    if (!h) { err(lineAt(before, idx), `${url} does not exist (needed for ?v=)`); return all; }
    return `${a}${url}?v=${h}${z}`;
  });
  return { out, errors, info };
}

export function readPartials(root = ROOT) {
  const p = {};
  for (const n of KNOWN) {
    const f = path.join(root, 'partials', n + '.html');
    if (fs.existsSync(f)) p[n] = fs.readFileSync(f, 'utf8');
  }
  return p;
}

/** run({ root, only:[globs]|null, check:bool, quiet:bool }) → { pages, changed, errors } */
export async function run({ root = ROOT, only = null, check = false, quiet = false } = {}) {
  const partials = readPartials(root);
  const list = listPages(root).filter((rel) => matchesAny(rel, only));
  const changed = [], errors = [];
  // the bundle first: the pages' ?v= for /css/core.css hashes the rebuilt file
  const core = syncCoreCss(root, { check });
  if (core.changed && (!check || !only || [...CORE_SOURCES, CORE_CSS].some((f) => matchesAny(f, only)))) {
    changed.push(CORE_CSS);
    if (!quiet) console.log(`${check ? 'would change' : 'updated'}  ${CORE_CSS}  (bundle of ${CORE_SOURCES.map((f) => path.basename(f, '.css')).join(', ')})`);
  }
  for (const rel of list) {
    const abs = path.join(root, rel);
    const src = fs.readFileSync(abs, 'utf8');
    const res = await syncPage(root, rel, src, partials);
    if (res.errors.length) { errors.push(...res.errors); continue; }
    if (res.out !== src) {
      changed.push(rel);
      if (!check) fs.writeFileSync(abs, res.out);
      if (!quiet) console.log(`${check ? 'would change' : 'updated'}  ${rel}`);
    }
  }
  if (!quiet) {
    for (const e of errors) console.error('✖ ' + e);
    console.log(`${check ? 'check' : 'sync'}: ${list.length} page(s), ${changed.length} ${check ? 'out of sync' : 'written'}, ${errors.length} error(s)`);
  }
  return { pages: list, changed, errors };
}

// ------------------------------------------------------------------ CLI
const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  let only = null, root = ROOT, check = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--only') { only = parseGlobs(args[++i]); if (!only) { console.error('--only needs a glob list'); process.exit(2); } }
    else if (a.startsWith('--only=')) only = parseGlobs(a.slice(7));
    else if (a === '--root') root = path.resolve(args[++i]);
    else if (a === '--check') check = true;
    else { console.error(`unknown argument ${a}`); process.exit(2); }
  }
  const res = await run({ root, only, check });
  process.exit(res.errors.length || (check && res.changed.length) ? 1 : 0);
}
