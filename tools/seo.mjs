#!/usr/bin/env node
// SELÈ STUDIO — tools/seo.mjs (P9) — the SEO build (Addendum A8.3–A8.7).
//
//   node tools/seo.mjs                  write the @seo block of every registry page (HE + EN mirror),
//                                       then sitemap.xml, llms.txt and data/lastmod.json (release)
//   node tools/seo.mjs --draft          same, while data/site.json → launchDate is still null: a missing
//                                       article date / film upload date is a warning and is omitted
//   node tools/seo.mjs --check          write nothing; exit 1 if any block, the sitemap, llms.txt or
//                                       lastmod.json would change
//   node tools/seo.mjs --dry [--print]  write nothing, print what would change (--print: dump the blocks,
//                                       the sitemap and llms.txt); P9's package-time mode
//   --only "<globs>"                    only the pages whose Hebrew file matches (no sitemap / llms)
//   --root <dir>                        another tree (tests / fixtures)      SELE_TODAY=YYYY-MM-DD fixes "today"
//
// Registry: data/seo.mjs (hand-authored pages) + data/projects.mjs (case facts) + data/prose-registry.json
// (built prose pages), merged by tools/lib/seo-core.mjs. The page DOM is parsed read-only with cheerio
// (from $SELE_TOOLS, as gen-en); writing is a string replacement of the <!-- @seo --> region only.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as pages from './lib/pages.mjs';
import { loadDicts } from './lib/dict.mjs';
import { parseGlobs, matchesAny } from './sync-partials.mjs';
import { loadCheerio, hebrewLeaks } from './gen-en.mjs';
import {
  buildRegistry, headFor, graphFor, ldJson, sitemapXml, llmsTxt, titleOf, pick, abs, urlFor,
  isIndexable, isMirrored, ORIGIN,
} from './lib/seo-core.mjs';

export const REPO = pages.REPO;
const SEO_RE = /(<!--\s*@seo\s*-->)([\s\S]*?)(<!--\s*\/@seo\s*-->)/;
const PLACEHOLDER = /TODO|\{\{|SERVICE_AREA/;
const collapse = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

function todayStr() {
  if (process.env.SELE_TODAY) return process.env.SELE_TODAY;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ DOM facts (read-only)
function isHiddenish($el) { return $el.closest('[hidden], template').length > 0; }

function textWords($, $root) {
  const parts = [];
  const walk = (node) => {
    for (const n of node.children || []) {
      if (n.type === 'text') parts.push(n.data);
      else if (n.type === 'tag') {
        const a = n.attribs || {};
        if ('hidden' in a || a['aria-hidden'] === 'true') continue;
        walk(n);
      }
    }
  };
  $root.each((_, el) => walk(el));
  return parts.join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function extract($, meta, lang) {
  const main = $('main').first();
  // images: non-decorative <img> in main
  const images = [];
  main.find('img').each((_, el) => {
    const $el = $(el);
    const alt = $el.attr('alt');
    if (!alt || $el.closest('[aria-hidden="true"], [role="presentation"]').length || isHiddenish($el)) return;
    const fig = $el.closest('figure');
    let caption = '';
    if (fig.length) {
      // hidden / aria-hidden caption parts belong to another layer (e.g. the Studio threshold's bath
      // caption, a render): never glue them onto this image's caption
      const cap = fig.find('figcaption').first().clone();
      cap.find('[hidden], [aria-hidden="true"], template').remove();
      const st = collapse(cap.find('.caption__status').first().text());
      const tx = collapse(cap.find('.caption__text').first().text());
      caption = st || tx ? [st, tx].filter(Boolean).join('. ') : collapse(cap.text());
    }
    images.push({
      src: $el.attr('data-full') || $el.attr('src'),
      width: Number($el.attr('width')) || undefined, height: Number($el.attr('height')) || undefined,
      alt: collapse(alt), caption: caption || collapse(alt), credit: $el.attr('data-credit') || 'studio',
    });
  });
  // visible FAQ
  const faq = [];
  $('[data-faq-item]').each((_, it) => {
    const $it = $(it);
    if (isHiddenish($it)) return;
    const q = collapse($it.find('[data-faq-q]').first().text());
    const a = collapse($it.find('[data-faq-a]').first().text());
    if (q && a) faq.push({ q, a });
  });
  // visible crumbs
  const crumbs = [];
  const nav = main.find('nav.crumbs').first();
  const items = nav.find('.crumbs__item').length ? nav.find('.crumbs__item') : nav.find('li');
  items.each((_, li) => {
    const a = $(li).find('a[href]').first();
    crumbs.push({ name: collapse($(li).text()), href: a.length ? a.attr('href') : null });
  });
  // outline of main (skipping [hidden] subtrees)
  const outline = [];
  main.find('h1, h2, h3, h4, h5, h6').each((_, h) => { if (!isHiddenish($(h))) outline.push(Number(h.name[1])); });
  return {
    images, faq, crumbs, outline,
    h1: $('body h1').length,
    words: textWords($, main),
    mainHash: sha1(collapse($.html(main))),
  };
}

function pageLints($, file, lang, root, E) {
  // fetchpriority
  const high = $('body img[fetchpriority="high"], body source[fetchpriority="high"]').length;
  if (high > 1) E(file, `${high} img/source elements with fetchpriority="high" in <body> (max 1)`);
  // images
  $('body img').each((_, el) => {
    const $el = $(el); const src = $el.attr('src') || '';
    if ($el.attr('alt') === undefined) E(file, `<img src="${src}"> has no alt`);
    if (!$el.attr('width') || !$el.attr('height')) E(file, `<img src="${src}"> needs width and height`);
    if (src.startsWith('/') && !src.startsWith('//')) {
      const f = path.join(root, decodeURI(src.split(/[?#]/)[0]).replace(/^\/+/, ''));
      if (!fs.existsSync(f)) E(file, `<img> file missing: ${src}`);
    }
  });
  // links
  const out = [];
  $('body a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('#') || /^(mailto:|tel:)/i.test(href)) return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return; // other hosts
    if (!href.startsWith('/')) { E(file, `relative link "${href}" (use root-absolute paths)`); return; }
    const p = href.split(/[?#]/)[0];
    const last = p.split('/').pop();
    if (/\.[a-z0-9]+$/i.test(last)) { out.push({ href, p, file: true }); return; }
    if (!p.endsWith('/')) E(file, `internal link without its trailing slash: "${href}"`);
    out.push({ href, p, file: false, inMain: $(el).closest('main').length > 0 });
  });
  // placeholders in visible text and attributes (the @seo region is regenerated, so it is skipped here)
  $('body *').contents().each((_, n) => {
    if (n.type !== 'text' || !PLACEHOLDER.test(n.data)) return;
    const $p = $(n).parent();
    if ($p.closest('script, style, template, [hidden]').length) return;
    E(file, `placeholder in visible text: "${collapse(n.data).slice(0, 60)}"`);
  });
  $('[alt],[title],[aria-label],[content]').each((_, el) => {
    if ($(el).closest('[hidden]').length) return;
    for (const a of ['alt', 'title', 'aria-label', 'content']) {
      const v = $(el).attr(a);
      if (v && PLACEHOLDER.test(v) && !(el.name === 'meta' && $(el).closest('head').length && inSeoRegion($, el))) E(file, `placeholder in ${a}="${v.slice(0, 60)}"`);
    }
  });
  if (lang === 'en') for (const m of hebrewLeaks($)) E(file, m);
  return out;
}

function inSeoRegion($, el) {
  let n = el.prev;
  while (n) {
    if (n.type === 'comment' && /^\s*\/@seo\s*$/.test(n.data)) return false;
    if (n.type === 'comment' && /^\s*@seo\s*$/.test(n.data)) return true;
    n = n.prev;
  }
  return false;
}

function writeRegion(src, lines) {
  const m = SEO_RE.exec(src);
  const before = src.slice(0, m.index);
  const indent = (before.match(/[ \t]*$/) || [''])[0];
  const inner = '\n' + lines.map((l) => indent + l).join('\n') + '\n' + indent;
  return src.slice(0, m.index) + m[1] + inner + m[3] + src.slice(m.index + m[0].length);
}

// ------------------------------------------------------------------ run
/**
 * run({ root, only, check, dry, draft, print, quiet }) →
 *   { errors, warnings, changed:[files], outputs:{ 'sitemap.xml', 'llms.txt', 'data/lastmod.json' }, records }
 */
export async function run({ root = REPO, only = null, check = false, dry = false, draft = false, print = false, quiet = false } = {}) {
  const cheerio = loadCheerio();
  const errors = [], warnings = [], changed = [];
  const E = (f, m) => errors.push(`${f}: ${m}`);
  const W = (f, m) => warnings.push(`${f}: ${m}`);
  const today = todayStr();
  const reg = await buildRegistry(root);
  for (const e of reg.errors) E('registry', e);
  for (const w of reg.warnings) W('registry', w);
  const site = reg.site;
  const inScope = (m) => matchesAny(m.file, only);
  const lastmodFile = path.join(root, 'data/lastmod.json');
  const oldLastmod = fs.existsSync(lastmodFile) ? JSON.parse(fs.readFileSync(lastmodFile, 'utf8')) : {};
  const newLastmod = { ...oldLastmod };

  // ---- pass 1: parse + extract
  const records = [];
  for (const meta of reg.pages) {
    for (const lang of ['he', 'en']) {
      if (lang === 'en' && !isMirrored(meta)) continue;
      const file = lang === 'he' ? meta.file : pages.enFileOf(meta.file);
      const abs_ = path.join(root, file);
      if (!fs.existsSync(abs_)) {
        if (lang === 'he') { W(file, `registry page "${meta.id}" is not built yet: skipped`); break; }
        W(file, `no English mirror yet (run gen-en): ${urlFor(meta.path, 'en')} skipped`);
        continue;
      }
      const src = fs.readFileSync(abs_, 'utf8');
      const rec = { meta, lang, file, src, scope: inScope(meta) };
      if (!SEO_RE.test(src)) { if (rec.scope) E(file, 'missing <!-- @seo --> … <!-- /@seo --> markers'); continue; }
      rec.$ = cheerio.load(src);
      rec.x = extract(rec.$, meta, lang);
      const url = urlFor(meta.path, lang);
      const prev = oldLastmod[url];
      rec.lastmod = prev && prev.hash === rec.x.mainHash ? prev.date : today;
      if (rec.scope) newLastmod[url] = { hash: rec.x.mainHash, date: rec.lastmod };
      const body = rec.$('body');
      rec.dict = await loadDicts(root, { dict: body.attr('data-i18n-dict') || null, build: body.attr('data-i18n-build') || null });
      records.push(rec);
    }
  }
  const recOf = (id, lang) => records.find((r) => r.meta.id === id && r.lang === lang);
  // a shipped Hebrew page that no registry entry names would ship with an empty @seo block (no <title>,
  // no canonical, no JSON-LD) and be missing from the sitemap: that is always an error
  const registered = new Set(reg.pages.map((m) => m.file));
  for (const rel of pages.listPages(root, { lang: 'he' })) {
    if (rel.startsWith('tools/') || registered.has(rel) || !matchesAny(rel, only)) continue;
    E(rel, 'page has no registry entry (data/seo.mjs, data/projects.mjs or data/prose-registry.json): its @seo block would stay empty');
  }

  // ---- pass 2: per-page lints + facts
  const faqSeen = { he: new Map(), en: new Map() };
  const seen = { he: { title: new Map(), desc: new Map() }, en: { title: new Map(), desc: new Map() } };
  const linkTargets = { he: new Map(), en: new Map() }; // path → Set(ids linking from main)
  for (const r of records) {
    const { meta, lang, file, $, x } = r;
    const PE = r.scope ? E : () => {};
    const PW = r.scope ? W : () => {};
    // structure
    if (x.h1 !== 1) PE(file, `expected exactly one <h1> in the document, found ${x.h1}`);
    let prev = 0;
    for (const lv of x.outline) {
      if (lv > prev + 1) { PE(file, `heading outline of <main> skips a level: h${prev || '—'} → h${lv}`); break; }
      prev = lv;
    }
    const links = pageLints($, file, lang, root, PE);
    for (const l of links) {
      let dec = l.p;
      try { dec = decodeURI(l.p); } catch { /* keep raw */ }
      const target = l.file || l.p.endsWith('/') ? l.p : l.p + '/';
      const f = l.file ? path.join(root, dec.replace(/^\/+/, '')) : path.join(root, (dec.endsWith('/') ? dec : dec + '/').replace(/^\/+/, ''), 'index.html');
      if (!fs.existsSync(f)) PE(file, `broken internal link "${l.href}"`);
      if (!l.file && l.inMain) {
        const key = pages.counterpartUrl(target, 'he');
        if (!linkTargets[lang].has(key)) linkTargets[lang].set(key, new Set());
        linkTargets[lang].get(key).add(meta.id);
      }
    }
    // crumbs: visible = registry (structure); names come from the visible crumbs
    const want = (meta.crumbs || []).map((id) => reg.crumbPaths[id]);
    if (want.length) {
      const vis = x.crumbs;
      const bad = [];
      if (vis.length !== want.length + 1) bad.push(`visible crumb count ${vis.length} ≠ registry ${want.length + 1}`);
      else {
        want.forEach((p, i) => {
          const h = vis[i].href ? pages.counterpartUrl(vis[i].href, 'he') : null;
          if (h !== p) bad.push(`crumb ${i + 1} links to ${vis[i].href || '(no link)'}, registry says ${lang === 'en' ? pages.counterpartUrl(p, 'en') : p}`);
        });
        const lastH = vis[vis.length - 1].href;
        if (lastH && pages.counterpartUrl(lastH, 'he') !== meta.path) bad.push(`last crumb links to ${lastH}, not the page itself`);
      }
      for (const b of bad) (isIndexable(meta) ? PE : PW)(file, `visible crumbs ≠ registry: ${b}`);
      r.crumbs = vis.length === want.length + 1 && !bad.length ? vis.map((c, i) => ({ name: c.name, path: i < want.length ? want[i] : meta.path })) : [];
    } else r.crumbs = [];
    // titles / descriptions
    const title = titleOf(meta, lang, site), desc = pick(meta.desc, lang);
    if (!title || !desc) PE(file, `registry entry "${meta.id}" has no ${lang} title/description`);
    if (isIndexable(meta) && title && desc) {
      if (title.length > 65) PE(file, `title ${title.length} characters (> 65): ${title}`);
      else if (title.length > 60) PW(file, `title ${title.length} characters (> 60)`);
      if (desc.length < 70 || desc.length > 165) PE(file, `description ${desc.length} characters (70–165)`);
      else if (desc.length < 110 || desc.length > 160) PW(file, `description ${desc.length} characters (110–160 recommended)`);
      for (const [k, v] of [['title', title], ['desc', desc]]) {
        const m = seen[lang][k];
        if (m.has(v)) PE(file, `duplicate ${k === 'desc' ? 'description' : 'title'} with ${m.get(v)}`); else m.set(v, file);
      }
    }
    // FAQ uniqueness across pages
    for (const f of x.faq) {
      const m = faqSeen[lang];
      if (m.has(f.q) && m.get(f.q) !== file) PE(file, `FAQ question also on ${m.get(f.q)}: "${f.q.slice(0, 60)}"`); else m.set(f.q, file);
    }
    // word counts
    if (meta.type === 'service' && x.words < 450) (lang === 'he' ? PE : PW)(file, `service page has ${x.words} words in <main> (< 450)`);
    if (meta.type === 'article' && x.words < 1200 && lang === 'he') PW(file, `article has ${x.words} words (< 1,200)`);
    // OG file
    if (meta.og && !fs.existsSync(path.join(root, meta.og.replace(/^\/+/, '')))) PW(file, `OG image not found: ${meta.og}`);

    // facts for the head block
    const fx = { images: x.images, faq: x.faq, crumbs: r.crumbs, lastmod: r.lastmod };
    if (meta.type === 'article') {
      fx.wordCount = x.words;
      const times = $('main .pr-meta time[datetime]');
      const pub = times.eq(0).attr('datetime') || null;
      const mod = times.eq(1).attr('datetime') || null;
      if (!pub) (draft ? PW : PE)(file, `article without a visible published date${draft ? ' (omitted under --draft)' : ''}`);
      fx.published = pub; fx.modified = mod && pub && mod > pub ? mod : null;
      const sec = meta.article && meta.article.section;
      const lab = sec ? r.dict.get(`prose.section.${sec}`) : null;
      fx.sectionLabel = lab ? lab[lang] : sec || null;
    }
    if (meta.type === 'film' && meta.video) {
      const nk = r.dict.get(meta.video.nameKey || 'film.videoLabel');
      fx.videoName = nk ? nk[lang] : pick(meta.video.name, lang);
      fx.uploadDate = site.launchDate ? `${site.launchDate}T12:00:00+03:00` : null;
      if (!fx.uploadDate) (draft ? PW : PE)(file, `film without an upload date: data/site.json → launchDate is null${draft ? ' (omitted under --draft)' : ''}`);
    }
    if (Array.isArray(meta.collection)) {
      fx.collection = meta.collection.map((id) => reg.byId[id]).filter(Boolean).map((m) => ({ path: m.path, name: pick(m.crumb, lang) || pick(m.title, lang) }));
    }
    fx.services = reg.services.map((m) => ({ path: m.path }));
    // runtime-swapped head metas (the bilingual 404, A3.8): only keys the page's dictionary holds, each
    // with both languages, so i18n.apply(document) can flip description / og / twitter under /en/
    if (meta.i18n) {
      fx.i18n = {};
      for (const [k, key] of Object.entries(meta.i18n)) {
        const v = r.dict.get(key);
        if (v && v.he && v.en) fx.i18n[k] = key;
        else PW(file, `head meta ${k} stays ${lang === 'he' ? 'Hebrew' : lang} under /en/: dictionary key "${key}" is missing (or lacks he/en)`);
      }
    }
    r.fx = fx;
    r.lines = headFor(meta, lang, fx, site);
    // placeholders in the generated head and JSON-LD
    const gm = r.lines.join('\n').match(PLACEHOLDER);
    if (gm) PE(file, `placeholder "${gm[0]}" in the generated head / JSON-LD strings (registry or visible content)`);
  }
  // orphans (indexable, legal pages excepted)
  for (const r of records) {
    if (!r.scope || !isIndexable(r.meta) || r.meta.type === 'legal') continue;
    const from = linkTargets[r.lang].get(r.meta.path);
    const others = from ? [...from].filter((id) => id !== r.meta.id) : [];
    if (!others.length) W(r.file, `orphan: no other ${r.lang === 'en' ? 'English' : 'Hebrew'} page links to ${urlFor(r.meta.path, r.lang)} from <main>`);
  }

  // ---- pass 3: write the @seo blocks
  for (const r of records) {
    if (!r.scope || !r.lines) continue;
    const out = writeRegion(r.src, r.lines);
    if (out !== r.src) {
      changed.push(r.file);
      if (!check && !dry) fs.writeFileSync(path.join(root, r.file), out);
    }
    if (print) console.log(`\n===== ${r.file}\n` + SEO_RE.exec(out)[2]);
  }

  // ---- sitemap.xml, llms.txt, lastmod.json (full runs only)
  const outputs = {};
  if (!only) {
    const entries = [];
    const llms = [];
    for (const meta of reg.pages) {
      if (!isIndexable(meta)) continue;
      const langs = {};
      for (const lang of ['he', 'en']) {
        const r = recOf(meta.id, lang);
        if (!r) continue;
        langs[lang] = { lastmod: r.lastmod, images: r.x.images.map((i) => abs(i.src)) };
        llms.push({ lang, meta });
      }
      if (!Object.keys(langs).length) continue;
      const e = { meta, langs };
      if (meta.type === 'film' && meta.video) {
        const v = meta.video;
        e.video = { thumb: abs(v.thumbnailUrl), content: abs(v.contentUrl), seconds: v.seconds, date: site.launchDate ? `${site.launchDate}T12:00:00+03:00` : null };
        for (const lang of Object.keys(langs)) {
          const r = recOf(meta.id, lang);
          e.video[lang] = { title: r.fx.videoName, description: pick(meta.desc, lang) };
        }
      }
      entries.push(e);
    }
    outputs['sitemap.xml'] = sitemapXml(entries);
    outputs['llms.txt'] = llmsTxt(llms, site);
    outputs['data/lastmod.json'] = JSON.stringify(Object.fromEntries(Object.keys(newLastmod).sort().map((k) => [k, newLastmod[k]])), null, 2) + '\n';
    for (const [rel, text] of Object.entries(outputs)) {
      const f = path.join(root, rel);
      const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
      if (cur !== text) {
        changed.push(rel);
        if (!check && !dry) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); }
      }
    }
    if (print) { console.log('\n===== sitemap.xml\n' + outputs['sitemap.xml']); console.log('\n===== llms.txt\n' + outputs['llms.txt']); }
  } else {
    const text = JSON.stringify(Object.fromEntries(Object.keys(newLastmod).sort().map((k) => [k, newLastmod[k]])), null, 2) + '\n';
    const cur = fs.existsSync(lastmodFile) ? fs.readFileSync(lastmodFile, 'utf8') : null;
    if (cur !== text) { changed.push('data/lastmod.json'); if (!check && !dry) { fs.mkdirSync(path.dirname(lastmodFile), { recursive: true }); fs.writeFileSync(lastmodFile, text); } }
  }

  if (!quiet) {
    const mode = check ? 'check' : dry ? 'dry' : draft ? 'draft' : 'release';
    for (const f of changed) console.log(`${check || dry ? 'would change' : 'updated'}  ${f}`);
    for (const w of warnings) console.warn('⚠ ' + w);
    for (const e of errors) console.error('✖ ' + e);
    const heN = records.filter((r) => r.lang === 'he').length, enN = records.filter((r) => r.lang === 'en').length;
    console.log(`seo (${mode}${only ? `, only ${only.join(',')}` : ''}): ${reg.pages.length} registry page(s), ${heN} HE + ${enN} EN parsed, ${changed.length} ${check || dry ? 'would change' : 'written'}, ${errors.length} error(s), ${warnings.length} warning(s)`);
  }
  return { errors, warnings, changed, outputs, records, registry: reg };
}

// ------------------------------------------------------------------ CLI
const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  const o = { root: REPO, only: null, check: false, dry: false, draft: false, print: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--only') { o.only = parseGlobs(args[++i]); if (!o.only) { console.error('--only needs a glob list'); process.exit(2); } }
    else if (a.startsWith('--only=')) o.only = parseGlobs(a.slice(7));
    else if (a === '--root') o.root = path.resolve(args[++i]);
    else if (a === '--check') o.check = true;
    else if (a === '--dry') o.dry = true;
    else if (a === '--draft') o.draft = true;
    else if (a === '--print') o.print = true;
    else { console.error(`unknown argument ${a}`); process.exit(2); }
  }
  const res = await run(o);
  process.exit(res.errors.length || (o.check && res.changed.length) ? 1 : 0);
}

export { graphFor, ldJson, ORIGIN };
