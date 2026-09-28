#!/usr/bin/env node
// SELÈ STUDIO — tools/gen-en.mjs (P9) — the English mirror (Addendum A3.7). Language = URL:
// every Hebrew page /x/ gets a static English page /en/x/ generated from it + its dictionaries.
//
//   node tools/gen-en.mjs                      write every en/<page> (integration: run by the lead)
//   node tools/gen-en.mjs --only "<globs>"     only the Hebrew pages matching the comma-separated globs
//                                              (the owner's OWN Hebrew globs; allowed only after P9 landed)
//   node tools/gen-en.mjs --check [--only …]   write nothing; exit 1 if any output would differ
//   --root <dir>                               run against another tree (tests / fixtures)
//
// cheerio (not a repo dependency) is resolved from TOOLS = $SELE_TOOLS || <repo>/../../tools:
//   npm i --prefix "$SELE_TOOLS" cheerio@1.2.0
//
// Input: the Hebrew page set of tools/lib/pages.mjs minus 404.html and tools/**. Output: en/<same path>.
// Per page, in order (A3.7): 1 dictionaries (common → runtime → build, tools/lib/dict.mjs) · 2 <html lang="en"
// dir="ltr"> · 3 data-i18n / data-i18n-init text, data-i18n-html (sanitized), data-i18n-attr · 4 cross-script
// marking · 5 internal page links → /en…, _next → /en/… · 6 language links → the Hebrew page · 7 font
// preloads → data-font-en · 8 the @seo region carried over from the current en file (else bare markers) ·
// 9 lints · 10 write; en/**/index.html whose Hebrew source is gone is deleted.
// The i18n hooks stay in the output (check.mjs verifies EN text against the dictionaries). The inline boot
// <script> is copied byte for byte, so the CSP hash written by sync-partials still matches.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as pages from './lib/pages.mjs';
import { loadDicts } from './lib/dict.mjs';
import { parseGlobs, matchesAny } from './sync-partials.mjs';

export const REPO = pages.REPO;
export const TOOLS = process.env.SELE_TOOLS || path.resolve(REPO, '../../tools');
export const HEB = /[֐-׿]/;

let cheerioMod = null;
export function loadCheerio() {
  if (cheerioMod) return cheerioMod;
  try {
    cheerioMod = createRequire(path.join(TOOLS, 'noop.cjs'))('cheerio');
  } catch {
    console.error(`✖ cheerio not found in ${TOOLS}/node_modules\n  install once:  npm i --prefix "${TOOLS}" cheerio@1.2.0\n  (or point SELE_TOOLS at the folder that has it)`);
    process.exit(1);
  }
  return cheerioMod;
}

// ------------------------------------------------------------------ sanitizer (A3.7 step 3 = js/core/i18n.js)
const ALLOWED = { a: ['href'], br: [], em: [], strong: [], span: ['class', 'lang'], bdi: ['lang'] };
const SAFE_ORIGINS = ['https://www.instagram.com/', 'https://www.nevo.co.il/', 'https://www.gov.il/'];
export const safeHref = (h) => typeof h === 'string'
  && ((h.startsWith('/') && !h.startsWith('//')) || h.startsWith('mailto:') || SAFE_ORIGINS.some((o) => h.startsWith(o)));

/** sanitize(html) → { html, stripped:[…] } — unwraps tags outside the whitelist, drops other attributes */
export function sanitize(html) {
  const cheerio = loadCheerio();
  const $ = cheerio.load(String(html), null, false);
  const stripped = [];
  const walk = (parent) => {
    for (const node of [...(parent.children || [])]) {
      if (node.type === 'text') continue;
      if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') { $(node).remove(); stripped.push(`<!${node.type}>`); continue; }
      walk(node);
      const name = node.name.toLowerCase();
      const keep = ALLOWED[name];
      if (!keep || (name === 'a' && !safeHref(node.attribs.href))) {
        stripped.push(`<${name}${name === 'a' ? ` href="${node.attribs.href || ''}"` : ''}>`);
        $(node).replaceWith($(node).contents());
        continue;
      }
      for (const a of Object.keys(node.attribs)) if (!keep.includes(a)) { stripped.push(`${name}[${a}]`); delete node.attribs[a]; }
    }
  };
  walk($.root()[0]);
  return { html: $.html(), stripped };
}

// ------------------------------------------------------------------ the "no Hebrew in English" lint (A3.7 step 9)
/**
 * hebrewLeaks($) → [message] for a cheerio document of an English page: Hebrew letters in a text node
 * outside [lang="he"], script, style, template and owner-value spans (text inside [data-owner] that carries
 * no i18n key, SPEC §5.8); Hebrew in alt / title / aria-label / placeholder outside [lang="he"].
 * Shared with tools/seo.mjs (A8.7 "Hebrew in an EN page").
 */
export function hebrewLeaks($) {
  const out = [];
  const EXEMPT = 'script, style, template, [lang="he"]';
  $('*').contents().each((_, n) => {
    if (n.type !== 'text' || !HEB.test(n.data)) return;
    const parent = $(n).parent();
    if (parent.closest(EXEMPT).length) return;
    if (parent.closest('[data-owner]').length && !parent.is('[data-i18n],[data-i18n-html],[data-i18n-init]')) return;
    out.push(`Hebrew text left in the English page in <${parent[0] ? parent[0].name : '?'}>: "${n.data.trim().slice(0, 50)}"`);
  });
  $('[alt],[title],[aria-label],[placeholder]').each((_, el) => {
    if ($(el).closest('[lang="he"]').length) return;
    for (const a of ['alt', 'title', 'aria-label', 'placeholder']) {
      const v = $(el).attr(a);
      if (v && HEB.test(v)) out.push(`Hebrew in ${a}="${v.slice(0, 50)}" on <${el.name}>`);
    }
  });
  return out;
}

// ------------------------------------------------------------------ serialization polish
// parse5 writes every valueless attribute as name="". The Hebrew sources write boolean attributes bare
// (hidden, defer, crossorigin, data-lang-switch …), and html-validate's attribute-boolean-style /
// attribute-empty-style rules want them bare, so the mirror restores that spelling. Raw-text elements
// (script, style, textarea, title) are skipped, so the boot script stays byte-identical.
const BARE = new Set(['hidden', 'async', 'defer', 'crossorigin', 'playsinline', 'controls', 'muted', 'loop', 'autoplay', 'open',
  'disabled', 'required', 'checked', 'selected', 'multiple', 'readonly', 'novalidate', 'formnovalidate', 'allowfullscreen',
  'inert', 'nomodule', 'itemscope', 'reversed', 'default', 'ismap', 'download']);
export function bareBooleans(html) {
  let out = '', i = 0;
  const RAW = /^(script|style|textarea|title)$/i;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    const m = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 64));
    if (!m) { out += '<'; i = lt + 1; continue; }
    // scan the start tag, honoring quotes
    let j = lt + m[0].length, q = null;
    while (j < html.length) {
      const c = html[j];
      if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break;
      j++;
    }
    const tag = html.slice(lt, j + 1).replace(/\s([a-zA-Z_:][\w:.-]*)=""(?=[\s/>])/g, (all, name) => (BARE.has(name.toLowerCase()) || /^data-/i.test(name) ? ' ' + name : all));
    out += tag;
    i = j + 1;
    if (RAW.test(m[1])) {
      const close = html.toLowerCase().indexOf(`</${m[1].toLowerCase()}`, i);
      const end = close < 0 ? html.length : close;
      out += html.slice(i, end);
      i = end;
    }
  }
  return out;
}

// ------------------------------------------------------------------ @seo region
const SEO_RE = /(<!--\s*@seo\s*-->)([\s\S]*?)(<!--\s*\/@seo\s*-->)/;
export const seoInner = (html) => { const m = SEO_RE.exec(html || ''); return m ? m[2] : null; };

// ------------------------------------------------------------------ one page
/**
 * renderEn(root, heRel, heSrc, existingEn) → { html, errors[], warnings[] }
 * existingEn: the current en/<heRel> text (for the @seo carry-over) or null.
 */
export async function renderEn(root, heRel, heSrc, existingEn = null) {
  const cheerio = loadCheerio();
  const errors = [], warnings = [];
  const E = (m) => errors.push(`${heRel}: ${m}`);
  const W = (m) => warnings.push(`${heRel}: ${m}`);
  const $ = cheerio.load(heSrc);
  const body = $('body');

  // 1 dictionaries
  const d = await loadDicts(root, { dict: body.attr('data-i18n-dict') || null, build: body.attr('data-i18n-build') || null });
  for (const e of d.errors) E(e);
  const en = (key, where) => {
    const e = d.get(key);
    if (!e || typeof e.en !== 'string' || e.en === '') { E(`unresolved key "${key}" (${where}): missing or empty "en"`); return null; }
    return e.en;
  };

  // 2 document language
  $('html').attr('lang', 'en').attr('dir', 'ltr');

  // 3 + 4 text, init, html, attributes; cross-script marking for text and attributes
  const setText = (el, key, where) => {
    const v = en(key, where);
    if (v == null) return;
    const $el = $(el);
    if ($el.children().length) E(`${where}="${key}" is on <${el.name}> with child elements (use data-i18n-html)`);
    $el.text(v);
    if (HEB.test(v)) {
      if (el.name !== 'bdi') E(`${where}="${key}": its "en" value contains Hebrew, so the element must be a <bdi> (A3.6.3), found <${el.name}>`);
      $el.attr('lang', 'he');
    }
  };
  $('[data-i18n]').each((_, el) => setText(el, $(el).attr('data-i18n'), 'data-i18n'));
  $('[data-i18n-init]').each((_, el) => setText(el, $(el).attr('data-i18n-init'), 'data-i18n-init'));
  $('[data-i18n-html]').each((_, el) => {
    const key = $(el).attr('data-i18n-html');
    const v = en(key, 'data-i18n-html');
    if (v == null) return;
    const s = sanitize(v);
    if (s.stripped.length) W(`data-i18n-html="${key}": stripped outside the whitelist: ${[...new Set(s.stripped)].join(', ')}`);
    $(el).html(s.html);
  });
  $('[data-i18n-attr]').each((_, el) => {
    for (const pair of String($(el).attr('data-i18n-attr')).split(';')) {
      const i = pair.indexOf(':');
      if (i < 0) { if (pair.trim()) E(`malformed data-i18n-attr "${pair}"`); continue; }
      const attr = pair.slice(0, i).trim(), key = pair.slice(i + 1).trim();
      if (!attr || !key) continue;
      const v = en(key, `data-i18n-attr ${attr}`);
      if (v == null) continue;
      if (HEB.test(v)) E(`data-i18n-attr ${attr}:${key}: its "en" value contains Hebrew (an attribute cannot carry its own lang)`);
      $(el).attr(attr, v);
    }
  });

  // 5 internal page links and _next
  $('a[href]').each((_, el) => {
    if ($(el).is('[data-lang-switch]')) return;
    const href = $(el).attr('href');
    if (pages.isPageLink(href)) $(el).attr('href', pages.counterpartUrl(href, 'en'));
  });
  $('input[name="_next"]').each((_, el) => {
    const v = $(el).attr('value') || '';
    const origin = 'https://sele-studio.com';
    if (v.startsWith(origin + '/')) {
      const p = v.slice(origin.length);
      if (!pages.isEnUrl(p)) $(el).attr('value', origin + pages.counterpartUrl(p, 'en'));
    }
  });

  // 6 language links → the Hebrew page
  const hePath = pages.urlPathOf(heRel);
  $('[data-lang-switch]').each((_, el) => {
    const $el = $(el);
    $el.attr('href', hePath).attr('hreflang', 'he').attr('lang', 'he').attr('dir', 'rtl');
    if ($el.attr('data-lang-switch') === 'pill') $el.text('לגרסה העברית ←');
    else $el.text('עב').attr('aria-label', 'גרסה עברית');
  });

  // 7 font preloads
  $('link[rel="preload"][as="font"][data-font-en]').each((_, el) => { $(el).attr('href', $(el).attr('data-font-en')); });

  // 8 @seo: empty the region in the DOM (the carried region is spliced in after serialization)
  const comments = [];
  $('head').contents().each((_, n) => { if (n.type === 'comment') comments.push(n); });
  const open = comments.find((n) => /^\s*@seo\s*$/.test(n.data));
  const close = comments.find((n) => /^\s*\/@seo\s*$/.test(n.data));
  if (!open || !close) E('missing <!-- @seo --> … <!-- /@seo --> markers in <head>');
  else {
    let n = open.next;
    while (n && n !== close) { const nx = n.next; $(n).remove(); n = nx; }
  }

  // 9 lints: Hebrew outside [lang="he"], script, style, template and owner-value spans
  for (const m of hebrewLeaks($)) E(m);

  // 10 serialize + carry the @seo region over from the current English file
  let html = bareBooleans($.html());
  if (!html.endsWith('\n')) html += '\n';
  const carried = seoInner(existingEn);
  if (carried != null) {
    if (HEB.test(carried.replace(/<script[\s\S]*?<\/script>/g, ''))) W('the carried @seo region contains Hebrew text (re-run seo.mjs)');
    html = html.replace(SEO_RE, (all, a, inner, b) => a + carried + b);
  }
  return { html, errors, warnings };
}

// ------------------------------------------------------------------ run
/** the Hebrew inputs: sync-partials' page set minus 404.html and tools/** */
export function inputPages(root) {
  return pages.listPages(root, { lang: 'he' }).filter((rel) => rel !== '404.html' && !rel.startsWith('tools/'));
}

/** run({ root, only, check, quiet }) → { pages, changed, deleted, errors, warnings } */
export async function run({ root = REPO, only = null, check = false, quiet = false } = {}) {
  const log = (s) => { if (!quiet) console.log(s); };
  const list = inputPages(root).filter((rel) => matchesAny(rel, only));
  const changed = [], deleted = [], errors = [], warnings = [];
  for (const rel of list) {
    const heSrc = fs.readFileSync(path.join(root, rel), 'utf8');
    const enRel = pages.enFileOf(rel);
    const enAbs = path.join(root, enRel);
    const existing = fs.existsSync(enAbs) ? fs.readFileSync(enAbs, 'utf8') : null;
    const r = await renderEn(root, rel, heSrc, existing);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (r.html !== existing) {
      changed.push(enRel);
      if (!check) { fs.mkdirSync(path.dirname(enAbs), { recursive: true }); fs.writeFileSync(enAbs, r.html); }
      log(`${check ? 'would write' : 'wrote'}  ${enRel}`);
    }
  }
  // stale mirrors: en/**/index.html (and en/404.html) whose Hebrew source is gone or not an input
  const inputs = new Set(inputPages(root));
  for (const enRel of pages.listPages(root, { lang: 'en' })) {
    const he = pages.heFileOf(enRel);
    if (he.startsWith('tools/')) continue;
    if (!(enRel.endsWith('/index.html') || enRel === 'en/index.html' || enRel === 'en/404.html')) continue;
    if (inputs.has(he) || !matchesAny(he, only)) continue;
    deleted.push(enRel);
    if (!check) {
      fs.rmSync(path.join(root, enRel));
      // remove now-empty directories up to en/
      let dir = path.dirname(path.join(root, enRel));
      const stop = path.join(root, 'en');
      while (dir.startsWith(stop) && dir !== stop && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); dir = path.dirname(dir); }
    }
    log(`${check ? 'would delete' : 'deleted'}  ${enRel}`);
  }
  if (!quiet) {
    for (const w of warnings) console.warn('⚠ ' + w);
    for (const e of errors) console.error('✖ ' + e);
    console.log(`gen-en${check ? ' --check' : ''}: ${list.length} page(s), ${changed.length} ${check ? 'out of date' : 'written'}, ${deleted.length} ${check ? 'stale' : 'deleted'}, ${errors.length} error(s), ${warnings.length} warning(s)`);
  }
  return { pages: list, changed, deleted, errors, warnings };
}

// ------------------------------------------------------------------ CLI
const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  let only = null, root = REPO, check = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--only') { only = parseGlobs(args[++i]); if (!only) { console.error('--only needs a glob list'); process.exit(2); } }
    else if (a.startsWith('--only=')) only = parseGlobs(a.slice(7));
    else if (a === '--root') root = path.resolve(args[++i]);
    else if (a === '--check') check = true;
    else { console.error(`unknown argument ${a}`); process.exit(2); }
  }
  const res = await run({ root, only, check });
  process.exit(res.errors.length || (check && (res.changed.length || res.deleted.length)) ? 1 : 0);
}
