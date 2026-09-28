#!/usr/bin/env node
// SELÈ STUDIO — tools/gen-projects.mjs (owner: P2; zero dependencies, node >= 20)
//
//   node tools/gen-projects.mjs            write the five case pages, js/i18n/projects.js and the generated
//                                          regions of projects/index.html
//   node tools/gen-projects.mjs --check    write nothing; exit 1 if any output would differ (after carry-over)
//   --root <dir>                           run against another tree (fixtures)
//
// Source: data/projects.mjs (SPEC §5.2–§5.3, Addendum A7.2). Template: tools/templates/case.html.
//
// Outputs
//   projects/<slug>/index.html   ×5  — every partial marker kept, so sync-partials fills them.
//   js/i18n/projects.js              — the index keys + projects.case.* + projects.material.* + projects.<slug>.*
//   projects/index.html              — hand-authored page; only its <!-- @gen:NAME -->…<!-- /@gen:NAME --> regions
//                                      (pj-preload, pj-index, pj-preview, pj-gallery) are rewritten. The rest is never
//                                      touched.
//
// Carry-over (Addendum A7.2, same rule as gen-prose A6.6 / gen-en step 8): when a case page already exists, the
// inner content of every <!-- @partial:NAME --> region and of the <!-- @seo --> region, and every ?v=<hash> value
// (matched by the URL it follows), is copied from it byte for byte into the fresh render. So running this tool after
// sync-partials / seo.mjs changes nothing, and --check compares after carry-over.
//
// Fails (exit 1) on: schema errors, a missing referenced asset (.jpg/.webp/-640.webp of every image, light crops,
// material tiles, film posters + clips), JPEG dimensions that differ from the data, an unknown next/material/space/
// service key, banned strings (Addendum A10), and missing @gen markers in projects/index.html.
// Deterministic: stable key order, no timestamps. Idempotent.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let ROOT = path.resolve(HERE, '..');
let CHECK = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--check') CHECK = true;
  else if (args[i] === '--root') ROOT = path.resolve(args[++i] || '.');
  else { console.error(`unknown argument ${args[i]}`); process.exit(2); }
}

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);

// ------------------------------------------------------------------ html helpers
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const indent = (html, n) => html.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

// ------------------------------------------------------------------ assets
const IMG = 'assets/img/';
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** JPEG pixel size from its SOF marker (stdlib only). */
function jpegSize(rel) {
  let buf;
  try { buf = fs.readFileSync(path.join(ROOT, rel)); } catch { return null; }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

/** Verify an image (id under assets/img/, e.g. 'living-01' or 'light/x') and return its sources. */
function image(id, w, h, { variants = true } = {}) {
  const base = IMG + id;
  for (const ext of ['.jpg', '.webp']) if (!exists(base + ext)) fail(`missing asset /${base}${ext}`);
  const dim = jpegSize(base + '.jpg');
  if (dim && (dim.w !== w || dim.h !== h)) fail(`/${base}.jpg is ${dim.w}×${dim.h}, data says ${w}×${h}`);
  const list = [];
  if (variants) {
    if (!exists(base + '-640.webp')) fail(`missing asset /${base}-640.webp`);
    else list.push([`/${base}-640.webp`, 640]);
    if (w > 1024 && exists(base + '-1024.webp')) list.push([`/${base}-1024.webp`, 1024]);
  }
  list.push([`/${base}.webp`, w]);
  return {
    jpg: `/${base}.jpg`,
    thumb: `/${base}-640.webp`,
    thumbH: Math.round((h * 640) / w),
    srcset: variants ? list.map(([u, x]) => `${u} ${x}w`).join(', ') : `/${base}.webp`,
    w, h,
  };
}

// eager: true → loading="eager" fetchpriority="high" (the page's LCP image); 'eager' → loading="eager" only.
function picture(img, { sizes, alt, altKey, eager = false, decorative = false }) {
  const src = sizes ? `<source type="image/webp" srcset="${img.srcset}" sizes="${sizes}">` : `<source type="image/webp" srcset="${img.srcset}">`;
  const load = eager === true ? 'loading="eager" fetchpriority="high"' : eager === 'eager' ? 'loading="eager"' : 'loading="lazy"';
  const a = decorative ? 'alt=""' : `alt="${escAttr(alt)}" data-i18n-attr="alt:${altKey}"`;
  return `<picture>${src}<img src="${img.jpg}" width="${img.w}" height="${img.h}" ${a} ${load} decoding="async"></picture>`;
}

// ------------------------------------------------------------------ data
const dataFile = path.join(ROOT, 'data/projects.mjs');
const data = await import(pathToFileURL(dataFile).href);
const cases = [...data.default].sort((a, b) => a.order - b.order);
const bySlug = new Map(cases.map((c) => [c.slug, c]));
const MATS = new Map(data.materials.map((m) => [m.id, m]));
const SPACES = new Map(data.spaces.map((s) => [s.key, s]));

// ------------------------------------------------------------------ validation
const L2 = (v, where) => {
  if (!v || typeof v.he !== 'string' || !v.he.trim() || typeof v.en !== 'string' || !v.en.trim()) fail(`${where}: needs non-empty he and en`);
};
const BANNED = ['גרייז', 'מונוליטי', 'אדריכלית', 'תכנון אדריכלי', 'בית פרטי', 'hello@', 'TODO', '{{'];
function scanBanned(obj, where) {
  if (typeof obj === 'string') { for (const b of BANNED) if (obj.includes(b)) fail(`${where}: banned string "${b}"`); return; }
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) scanBanned(v, `${where}.${k}`);
}
const LAYOUTS = new Set(['wide', 'tall', 'detail', 'door']);
const slugs = new Set();
for (const c of cases) {
  const w = `data/projects.mjs ${c.slug}`;
  if (!/^[a-z0-9-]+$/.test(c.slug || '')) fail(`${w}: bad slug`);
  if (slugs.has(c.slug)) fail(`${w}: duplicate slug`);
  slugs.add(c.slug);
  if (!SPACES.has(c.spaceKey)) fail(`${w}: unknown spaceKey ${c.spaceKey}`);
  for (const m of c.materialKeys || []) if (!MATS.has(m)) fail(`${w}: unknown material ${m}`);
  if (!['full', 'split'].includes(c.heroLayout)) fail(`${w}: heroLayout must be full|split`);
  for (const k of ['numeral', 'title', 'h1Sub', 'space', 'materials', 'type', 'status', 'lead']) L2(c[k], `${w}.${k}`);
  if (c.body != null) L2(c.body, `${w}.body`);
  L2(c.hero && c.hero.alt, `${w}.hero.alt`);
  L2(c.hero && c.hero.caption, `${w}.hero.caption`);
  (c.plates || []).forEach((p, i) => {
    if (p.id !== `pl-${i + 2}`) fail(`${w}: plate ${i} id must be pl-${i + 2}`);
    if (!LAYOUTS.has(p.layout)) fail(`${w}.${p.id}: bad layout ${p.layout}`);
    L2(p.caption, `${w}.${p.id}.caption`); L2(p.alt, `${w}.${p.id}.alt`);
    if (p.note) L2(p.note, `${w}.${p.id}.note`);
  });
  if (c.film) { L2(c.film.alt, `${w}.film.alt`); if (c.film.caption) L2(c.film.caption, `${w}.film.caption`); }
  L2(c.light && c.light.text, `${w}.light.text`); L2(c.light && c.light.alt, `${w}.light.alt`);
  if (c.type.he !== data.strings['projects.case.typeValue'].he || c.type.en !== data.strings['projects.case.typeValue'].en) fail(`${w}.type must equal projects.case.typeValue`);
  if (c.status.he !== data.strings['projects.case.statusValue'].he || c.status.en !== data.strings['projects.case.statusValue'].en) fail(`${w}.status must equal projects.case.statusValue`);
  for (const s of c.services || []) if (!data.serviceKeys[s]) fail(`${w}: unknown or unbuilt service ${s}`);
  if (!c.services || !c.services.length) fail(`${w}: needs at least one service`);
  if (!c.read || !/^\/journal\/[a-z0-9-]+\/$/.test(c.read.href || '')) fail(`${w}: read.href must be /journal/<slug>/`);
  else L2(c.read.label, `${w}.read.label`);
  if (!bySlug.has(c.next)) fail(`${w}: next "${c.next}" is not a case`);
  if (typeof c.builtPairConfirmed !== 'boolean') fail(`${w}: builtPairConfirmed must be a boolean`);
  if (c.builtPairConfirmed && !c.fromRenderToBuilt) fail(`${w}: builtPairConfirmed needs fromRenderToBuilt`);
  scanBanned(c, w);
}
scanBanned(data.strings, 'data/projects.mjs strings');
scanBanned(data.materials, 'data/projects.mjs materials');

// data/site.json → confirm.built01SameAsDarkKitchen must agree with builtPairConfirmed (Addendum A8.1)
try {
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
  const flag = !!(site.confirm && site.confirm.built01SameAsDarkKitchen);
  const pair = cases.some((c) => c.builtPairConfirmed);
  if (flag !== pair) warnings.push(`data/site.json confirm.built01SameAsDarkKitchen (${flag}) ≠ data/projects.mjs builtPairConfirmed (${pair})`);
} catch { /* site.json is P9's; absent before it lands */ }

// ------------------------------------------------------------------ dictionary
const dict = {};
const put = (k, v) => { if (k in dict) fail(`duplicate dictionary key ${k}`); dict[k] = { he: v.he, en: v.en }; };
for (const [k, v] of Object.entries(data.strings)) put(k, v);
for (const s of data.spaces) put(`projects.index.space.${s.key}`, s.label);
{
  const many = data.strings['projects.index.count.many'];
  const n = String(cases.length);
  put('projects.index.count.init', cases.length === 1 ? data.strings['projects.index.count.one'] : { he: many.he.replace('{n}', n), en: many.en.replace('{n}', n) });
}
for (const m of data.materials) { put(`projects.material.${m.id}.name`, m.name); put(`projects.material.${m.id}.line`, m.line); }
for (const c of cases) {
  const k = (f) => `projects.${c.slug}.${f}`;
  put(k('numeral'), c.numeral);
  put(k('title'), c.title);
  put(k('titleAlt'), { he: c.title.en, en: c.title.he }); // swapped by design (SPEC §5.2): the other language's title
  put(k('h1Sub'), c.h1Sub);
  put(k('space'), c.space);
  put(k('materials'), c.materials);
  put(k('heroAlt'), c.hero.alt);
  put(k('heroCaption'), c.hero.caption);
  put(k('lead'), c.lead);
  if (c.body) put(k('body'), c.body);
  for (const p of c.plates) {
    const n = p.id.replace('-', '');
    put(k(`${n}.caption`), p.caption);
    put(k(`${n}.alt`), p.alt);
    if (p.note) put(k(`${n}.note`), p.note);
  }
  if (c.film) { put(k('filmAlt'), c.film.alt); if (c.film.caption) put(k('filmCaption'), c.film.caption); }
  put(k('lightText'), c.light.text);
  put(k('lightAlt'), c.light.alt);
  put(k('read'), c.read.label);
  if (c.builtPairConfirmed) { put(k('pairH2'), c.fromRenderToBuilt.h2); put(k('pairText'), c.fromRenderToBuilt.text); }
}
// common.* labels (service names, status words) are read from P0's dictionary, never copied into ours.
const common = (await import(pathToFileURL(path.join(ROOT, 'js/i18n/common.js')).href)).default;
const HE = (key) => (dict[key] || common[key]) ? (dict[key] || common[key]).he : (fail(`no dictionary value for ${key}`), key);

function dictModule() {
  const lines = Object.entries(dict).map(([key, v]) => `  ${JSON.stringify(key)}: { he: ${JSON.stringify(v.he)}, en: ${JSON.stringify(v.en)} },`);
  return `// GENERATED by tools/gen-projects.mjs from data/projects.mjs — do not edit by hand (owner: P2).\n` +
    `// Projects index + case pages (SPEC §5.2–§5.3, Addendum A7.2). Plain data: node-importable, no functions.\n` +
    `export default {\n${lines.join('\n')}\n};\n`;
}

// ------------------------------------------------------------------ shared markup pieces
const t = (tag, key, attrs = '') => `<${tag}${attrs ? ' ' + attrs : ''} data-i18n="${key}">${escText(HE(key))}</${tag}>`;
const status = (kind = 'render') => `<span class="caption__status" data-i18n="common.status.${kind}">${escText(HE(`common.status.${kind}`))}</span>`;
const crumbs = (c) => [
  '<nav class="crumbs label" aria-label="מיקום באתר" data-i18n-attr="aria-label:common.breadcrumb.aria">',
  '  <ol class="crumbs__list">',
  '    <li class="crumbs__item"><a href="/" data-i18n="common.crumb.home">ראשי</a></li>',
  '    <li class="crumbs__item"><a href="/projects/" data-i18n="common.nav.projects">פרויקטים</a></li>',
  `    <li class="crumbs__item"><span aria-current="page" data-i18n="projects.${c.slug}.title">${escText(c.title.he)}</span></li>`,
  '  </ol>',
  '</nav>',
].join('\n');

const SIZES = {
  full: '(min-width:1440px) 1440px, 100vw',
  split: '(min-width:1100px) 45vw, calc(100vw - 40px)',
  wide: '(min-width:1100px) 66vw, (min-width:768px) 80vw, calc(100vw - 40px)',
  tall: '(min-width:1100px) 44vw, (min-width:768px) 66vw, calc(100vw - 40px)',
  detail: '(min-width:1100px) 52vw, (min-width:768px) 80vw, calc(100vw - 40px)',
  door: '(min-width:1100px) 44vw, (min-width:768px) 66vw, calc(100vw - 40px)',
  film: '(min-width:1100px) 44vw, (min-width:768px) 66vw, calc(100vw - 40px)',
  next: '(min-width:1100px) 58vw, calc(100vw - 40px)',
  pair: '(min-width:1100px) 40vw, calc(100vw - 40px)',
};

// ------------------------------------------------------------------ case page
function renderCase(c) {
  const k = (f) => `projects.${c.slug}.${f}`;
  const hero = image(c.hero.file, c.hero.w, c.hero.h);
  const full = c.heroLayout === 'full';
  const heroSizes = full ? SIZES.full : SIZES.split;
  const preload = `<link rel="preload" as="image" type="image/webp" imagesrcset="${hero.srcset}" imagesizes="${heroSizes}" fetchpriority="high">`;

  // 1–3. hero, plate, synopsis
  const heroFig = [
    `<figure class="frame ${full ? 'flat' : 'arch-door'} case-hero__figure" id="pl-1"${full ? '' : ` style="--ar:${c.hero.w}/${c.hero.h}; --max-w:calc(86svh * ${c.hero.w} / ${c.hero.h})"`}>`,
    `  <div class="frame__clip case-hero__media" style="--ar:${c.hero.w}/${c.hero.h}; --pos:${c.hero.pos}">`,
    `    ${picture(hero, { sizes: heroSizes, alt: c.hero.alt.he, altKey: k('heroAlt'), eager: true })}`,
    '  </div>',
    '</figure>',
  ].join('\n');
  const credits = [
    ['projects.case.space', k('space')],
    ['projects.case.materials', k('materials')],
    ['projects.case.type', 'projects.case.typeValue'],
    ['projects.case.status', 'projects.case.statusValue'],
  ].map(([dt, dd]) => `    <div class="case-credits__row">${t('dt', dt, 'class="label"')}${t('dd', dd)}</div>`).join('\n');
  const plate = [
    '<div class="case-plate">',
    indent(crumbs(c), 2),
    `  <p class="case-plate__num" aria-hidden="true" data-i18n="${k('numeral')}">${escText(c.numeral.he)}</p>`,
    // A space between the two spans so the heading's text (SEO, assistive tech, seo.mjs) never reads "TitleSub".
    `  <h1 class="case-plate__h1" id="case-h1"><span data-i18n="${k('title')}">${escText(c.title.he)}</span> <span class="h1-sub" data-i18n="${k('h1Sub')}">${escText(c.h1Sub.he)}</span></h1>`,
    '  <dl class="case-credits">',
    credits,
    '  </dl>',
    '</div>',
  ].join('\n');
  const synopsis = [
    '<div class="case-synopsis">',
    `  ${t('p', k('lead'), 'class="case-synopsis__lead"')}`,
    c.body ? `  ${t('p', k('body'), 'class="case-synopsis__body" data-reveal="fade"')}` : null,
    '</div>',
  ].filter(Boolean).join('\n');
  const heroHtml = full
    ? [`<header class="case-hero case-hero--full">`, indent(heroFig, 2), '  <div class="case-intro l-wrap l-grid">', indent(plate, 4), indent(synopsis, 4), '  </div>', '</header>'].join('\n')
    : [`<header class="case-hero case-hero--split l-wrap l-grid">`, indent(heroFig, 2), indent(plate, 2), indent(synopsis, 2), '</header>'].join('\n');

  // related line (Addendum A7.2)
  const svcLinks = c.services.map((s) => `<a class="link" href="/services/${s}/" data-i18n="${data.serviceKeys[s]}">${escText(HE(data.serviceKeys[s]))}</a>`).join('<span class="case-related__sep" aria-hidden="true"> · </span>');
  const related = [
    '<aside class="case-related l-wrap" aria-labelledby="case-related-h">',
    '  <h2 class="u-visually-hidden" id="case-related-h" data-i18n="projects.case.relatedH2">' + escText(HE('projects.case.relatedH2')) + '</h2>',
    '  <dl class="case-related__list">',
    `    <div class="case-related__row">${t('dt', 'projects.case.serviceLabel', 'class="label"')}<dd>${svcLinks}</dd></div>`,
    `    <div class="case-related__row">${t('dt', 'projects.case.readLabel', 'class="label"')}<dd><a class="link" href="${c.read.href}" data-i18n="${k('read')}">${escText(c.read.label.he)}</a></dd></div>`,
    '  </dl>',
    '</aside>',
  ].join('\n');

  // 4. plates
  const plates = c.plates.length ? [
    '<div class="case-plates l-wrap l-grid">',
    ...c.plates.map((p) => {
      const n = p.id.replace('-', '');
      const img = image(p.file, p.w, p.h);
      const cls = p.layout === 'door' ? 'arch-door' : 'arch';
      return indent([
        `<figure class="frame ${cls} case-plates__item case-plates__item--${p.layout}" id="${p.id}" data-reveal="media" data-cursor="view"${p.layout === 'wide' ? ' data-parallax="4"' : ''}>`,
        `  <div class="frame__clip" style="--ar:${p.w}/${p.h}; --pos:${p.pos}">`,
        `    ${picture(img, { sizes: SIZES[p.layout], alt: p.alt.he, altKey: k(`${n}.alt`) })}`,
        '  </div>',
        // the note is the figcaption's last child: below 1100 px it flows under the caption text (SPEC §3.5); at ≥ 1100 it is
        // absolutely placed against the frame (base.css). A <p> after <figcaption> would be invalid (figcaption must be
        // the figure's first or last child; html-validate element-permitted-order, A13 step 10).
        `  <figcaption class="caption">${status()}<span class="caption__text" data-i18n="${k(`${n}.caption`)}">${escText(p.caption.he)}</span>${p.note ? `<p class="margin-note"><span class="margin-note__rule" aria-hidden="true"></span><span data-i18n="${k(`${n}.note`)}">${escText(p.note.he)}</span></p>` : ''}</figcaption>`,
        '</figure>',
      ].filter(Boolean).join('\n'), 2);
    }),
    '</div>',
  ].join('\n') : '';

  // 5. film (SPEC §4.14)
  let film = '';
  if (c.film) {
    const f = c.film.name;
    for (const rel of [`${f}-720-poster.jpg`, `${f}-720-poster.webp`, `${f}-poster.webp`, `${f}.webm`, `${f}.mp4`, `${f}-720.webm`, `${f}-720.mp4`]) if (!exists('assets/video/' + rel)) fail(`missing asset /assets/video/${rel}`);
    const capKey = c.film.caption ? k('filmCaption') : 'projects.case.filmCaption';
    const sources = JSON.stringify([
      { media: '(min-width:1100px)', webm: `/assets/video/${f}.webm`, mp4: `/assets/video/${f}.mp4` },
      { media: 'all', webm: `/assets/video/${f}-720.webm`, mp4: `/assets/video/${f}-720.mp4` },
    ]);
    film = [
      '<div class="case-film l-wrap l-grid">',
      '  <figure class="frame arch film case-film__fig" data-video>',
      '    <div class="frame__clip" style="--ar:4/5">',
      `      <picture><source type="image/webp" srcset="/assets/video/${f}-720-poster.webp 720w, /assets/video/${f}-poster.webp 1080w" sizes="${SIZES.film}"><img class="film__poster" src="/assets/video/${f}-720-poster.jpg" width="720" height="900" alt="${escAttr(c.film.alt.he)}" data-i18n-attr="alt:${k('filmAlt')}" loading="lazy" decoding="async"></picture>`,
      `      <video class="film__video" muted loop playsinline preload="none" disablepictureinpicture aria-hidden="true" tabindex="-1" data-sources='${sources}'></video>`,
      '    </div>',
      '    <button class="film__toggle" type="button" hidden data-video-toggle aria-label="עצירת הסרטון" data-i18n-attr="aria-label:common.video.pause"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><use href="#i-pause"/></svg></button>',
      `    <figcaption class="caption">${status()}<span class="caption__text" data-i18n="${capKey}">${escText(HE(capKey))}</span></figcaption>`,
      '  </figure>',
      '</div>',
    ].join('\n');
  }

  // (only when the owner confirmed it) render → built pair, SPEC §5.3.5
  let pair = '';
  if (c.builtPairConfirmed) {
    const b = c.fromRenderToBuilt.built;
    const bi = image(b.file, b.w, b.h);
    pair = [
      '<section class="case-pair l-wrap l-section" id="from-render-to-built" aria-labelledby="case-pair-h">',
      `  ${t('h2', k('pairH2'), 'id="case-pair-h"')}`,
      `  ${t('p', k('pairText'), 'class="case-pair__text"')}`,
      '  <div class="case-pair__grid l-grid">',
      `    <figure class="frame arch case-pair__fig" data-reveal="media"><div class="frame__clip" style="--ar:${c.hero.w}/${c.hero.h}; --pos:${c.hero.pos}">${picture(hero, { sizes: SIZES.pair, alt: c.hero.alt.he, altKey: k('heroAlt') })}</div><figcaption class="caption">${status('render')}</figcaption></figure>`,
      `    <figure class="frame arch case-pair__fig" data-reveal="media"><div class="frame__clip" style="--ar:${b.w}/${b.h}; --pos:${b.pos}">${picture(bi, { sizes: SIZES.pair, alt: HE('projects.index.onsite.alt'), altKey: 'projects.index.onsite.alt' })}</div><figcaption class="caption">${status('photo')}</figcaption></figure>`,
      '  </div>',
      '</section>',
    ].join('\n');
  }

  // 6. light study (the page's single night section)
  const li = image(c.light.file, c.light.w, c.light.h, { variants: false });
  const light = [
    '<section class="case-light l-section" data-theme="night" aria-labelledby="case-light-h">',
    '  <div class="case-light__grid l-wrap l-grid">',
    '    <header class="opener opener--echo case-light__opener">',
    '      <p class="opener__latin" lang="en" aria-hidden="true">LIGHT</p>',
    `      ${t('h2', 'projects.case.lightH2', 'class="opener__title" id="case-light-h"')}`,
    '    </header>',
    `    ${t('p', k('lightText'), 'class="case-light__text"')}`,
    `    <figure class="frame arch case-light__fig" style="width:min(100%, calc(1.2 * ${c.light.w}px))" data-reveal="media">`,
    `      <div class="frame__clip" style="--ar:${c.light.w}/${c.light.h}; --pos:${c.light.pos}">${picture(li, { alt: c.light.alt.he, altKey: k('lightAlt') })}</div>`,
    `      <figcaption class="caption case-light__caption">${status()}</figcaption>`,
    '    </figure>',
    '  </div>',
    '</section>',
  ].join('\n');

  // 7. materials of this space
  const mats = [
    '<section class="case-materials l-wrap l-grid" aria-labelledby="case-materials-h">',
    `  ${t('h2', 'projects.case.materialsH2', 'class="case-materials__h2" id="case-materials-h"')}`,
    '  <ul class="case-materials__list" role="list">',
    ...c.materialKeys.map((id) => {
      const m = MATS.get(id);
      const dim = jpegSize(IMG + m.tile + '.jpg') || { w: 0, h: 0 };
      if (!dim.w) fail(`missing asset /${IMG}${m.tile}.jpg`);
      if (!exists(IMG + m.tile + '.webp')) fail(`missing asset /${IMG}${m.tile}.webp`);
      return [
        '    <li class="case-mat">',
        `      <span class="frame arch-quarter case-mat__tile" aria-hidden="true"><span class="frame__clip" style="--ar:4/5"><picture><source type="image/webp" srcset="/${IMG}${m.tile}.webp"><img src="/${IMG}${m.tile}.jpg" width="${dim.w}" height="${dim.h}" alt="" loading="lazy" decoding="async"></picture></span></span>`,
        `      ${t('h3', `projects.material.${id}.name`, 'class="case-mat__name"')}`,
        `      ${t('p', `projects.material.${id}.line`, 'class="case-mat__line"')}`,
        '    </li>',
      ].join('\n');
    }),
    '  </ul>',
    `  ${t('p', 'projects.case.materialsNote', 'class="case-materials__note"')}`,
    '</section>',
  ].join('\n');

  // 8. mini CTA
  const contact = `/contact/?space=${c.spaceKey}&amp;ref=${c.slug}`;
  const cta = [
    '<div class="case-cta l-wrap">',
    `  ${t('p', 'projects.case.ctaLine', 'class="case-cta__line"')}`,
    `  <a class="btn btn--primary" href="${contact}" data-i18n="projects.case.ctaButton">${escText(HE('projects.case.ctaButton'))}</a>`,
    '</div>',
  ].join('\n');

  // 9. next space
  const nx = bySlug.get(c.next);
  const nimg = image(nx.hero.file, nx.hero.w, nx.hero.h);
  const next = [
    '<div class="case-next l-wrap">',
    `  <a class="case-next__link" href="/projects/${nx.slug}/" data-vt-card data-cursor="view">`,
    '    <span class="case-next__text">',
    `      <span class="case-next__label label" data-i18n="projects.case.next">${escText(HE('projects.case.next'))}</span>`,
    `      <span class="case-next__num" aria-hidden="true" data-i18n="projects.${nx.slug}.numeral">${escText(nx.numeral.he)}</span>`,
    `      <span class="case-next__title" data-i18n="projects.${nx.slug}.title">${escText(nx.title.he)}</span>`,
    `      <svg class="case-next__arrow icon-arrow" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><use href="#i-arrow"/></svg>`,
    '    </span>',
    `    <span class="frame arch case-next__fig" aria-hidden="true"><span class="frame__clip" style="--ar:16/10; --pos:${nx.hero.pos}">${picture(nimg, { sizes: SIZES.next, decorative: true })}</span></span>`,
    '  </a>',
    `  <p class="case-next__back"><a class="link" href="/projects/" data-i18n="projects.case.back">${escText(HE('projects.case.back'))}</a></p>`,
    '</div>',
  ].join('\n');

  // 10. mobile float
  const float = `<a class="case-float btn btn--primary" href="${contact}" hidden data-case-float data-i18n="projects.case.float">${escText(HE('projects.case.float'))}</a>`;

  const tpl = fs.readFileSync(path.join(ROOT, 'tools/templates/case.html'), 'utf8');
  const parts = {
    TITLE: escText(c.title.he), PRELOAD: preload, LAYOUT: c.heroLayout,
    HERO: indent(heroHtml, 6), RELATED: indent(related, 6), PLATES: indent(plates, 6), FILM: indent(film, 6),
    PAIR: indent(pair, 6), LIGHT: indent(light, 6), MATERIALS: indent(mats, 6), CTA: indent(cta, 6),
    NEXT: indent(next, 4), FLOAT: indent(float, 4),
  };
  let out = tpl.replace(/%%([A-Z]+)%%/g, (m, name) => (name in parts ? parts[name] : (fail(`case.html: unknown token ${m}`), m)));
  out = out.replace(/\n[ \t]*\n/g, '\n'); // empty optional sections leave no blank lines
  return out;
}

// ------------------------------------------------------------------ carry-over (Addendum A7.2)
function regionRe(open, close) { return new RegExp(`(${open})([\\s\\S]*?)(${close})`); }
function carryOver(fresh, existing) {
  let out = fresh;
  const names = new Set([...existing.matchAll(/<!--\s*@partial:([A-Za-z0-9_-]+)\s*-->/g)].map((m) => m[1]));
  for (const name of names) {
    const re = regionRe(`<!--\\s*@partial:${name}\\s*-->`, `<!--\\s*\\/@partial:${name}\\s*-->`);
    const old = existing.match(re);
    if (old && re.test(out)) out = out.replace(re, (all, a, _inner, z) => a + old[2] + z);
  }
  const seoRe = regionRe('<!--\\s*@seo\\s*-->', '<!--\\s*\\/@seo\\s*-->');
  const oldSeo = existing.match(seoRe);
  if (oldSeo && seoRe.test(out)) out = out.replace(seoRe, (all, a, _inner, z) => a + oldSeo[2] + z);
  const hashes = new Map();
  for (const m of existing.matchAll(/(?:href|src)="([^"?#]+)\?v=([A-Za-z0-9]+)"/g)) hashes.set(m[1], m[2]);
  out = out.replace(/((?:href|src)=")([^"?#]+)\?v=([A-Za-z0-9]+)(")/g, (all, a, url, v, z) => (hashes.has(url) ? `${a}${url}?v=${hashes.get(url)}${z}` : all));
  return out;
}

// ------------------------------------------------------------------ projects/index.html generated regions
function replaceGen(src, name, html, file) {
  const re = new RegExp(`(<!--\\s*@gen:${name}\\s*-->)([\\s\\S]*?)([ \\t]*)(<!--\\s*\\/@gen:${name}\\s*-->)`);
  const m = src.match(re);
  if (!m) { fail(`${file}: missing <!-- @gen:${name} --> … <!-- /@gen:${name} --> markers`); return src; }
  const openLineIndent = (src.slice(0, m.index).match(/[ \t]*$/) || [''])[0];
  const pad = openLineIndent.length + 2;
  return src.replace(re, (all, a, _inner, ind, z) => `${a}\n${indent(html, pad)}\n${ind}${z}`);
}

function indexRows() {
  return cases.map((c) => {
    const hero = image(c.hero.file, c.hero.w, c.hero.h);
    return [
      `<li class="pj-row" data-pj-item data-case="${c.slug}" data-space="${c.spaceKey}" data-materials="${c.materialKeys.join(' ')}">`,
      `  <a class="pj-row__link" href="/projects/${c.slug}/" data-vt-card data-vt-source="#pj-prev-${c.slug}" data-cursor="view" data-pj-row="${c.slug}">`,
      `    <span class="pj-row__num" aria-hidden="true" data-i18n="projects.${c.slug}.numeral">${escText(c.numeral.he)}</span>`,
      '    <span class="pj-row__name">',
      `      <span class="pj-row__title" data-i18n="projects.${c.slug}.title">${escText(c.title.he)}</span>`,
      `      <bdi class="pj-row__alt" lang="en" aria-hidden="true" data-i18n="projects.${c.slug}.titleAlt">${escText(c.title.en)}</bdi>`,
      '    </span>',
      '    <span class="pj-row__meta">',
      `      <span class="pj-row__space label" data-i18n="projects.${c.slug}.space">${escText(c.space.he)}</span>`,
      `      <span class="pj-row__materials" data-i18n="projects.${c.slug}.materials">${escText(c.materials.he)}</span>`,
      '    </span>',
      `    <span class="pj-row__status label" data-i18n="common.status.render">${escText(HE('common.status.render'))}</span>`,
      `    <span class="frame arch-quarter pj-row__thumb" aria-hidden="true" data-flip-id="${c.slug}"><span class="frame__clip" style="--ar:1/1; --pos:${c.hero.pos}"><img src="${hero.thumb}" width="640" height="${hero.thumbH}" alt="" loading="lazy" decoding="async"></span></span>`,
      '    <svg class="pj-row__arrow icon-arrow" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><use href="#i-arrow"/></svg>',
      '  </a>',
      '</li>',
    ].join('\n');
  }).join('\n');
}

function indexPreview() {
  return cases.map((c, i) => {
    const hero = image(c.hero.file, c.hero.w, c.hero.h);
    return `<figure class="frame arch pj-prev${i === 0 ? ' is-active' : ''}" data-pj-prev="${c.slug}"><div class="frame__clip" id="pj-prev-${c.slug}" style="--ar:4/5; --pos:${c.hero.pos}">${picture(hero, { sizes: '(min-width:1100px) 28vw, 1px', decorative: true })}</div></figure>`;
  }).join('\n');
}

// Contact-sheet slots: s3/s4/s5 = position in the 3-, 4- and 5-tile rhythm (SPEC §5.2). projects.js recomputes them
// for the visible tiles after filtering; the static values serve no-JS.
const SPAN = { s3: [2, 2, 4], s4: [5, 3, 3, 5], s5: [5, 4, 3, 4, 8] };
// The last tile (.is-last) stretches to the end of its row when the rhythm would leave the row short (projects.css).
const FILL = { s3: { 0: 4 }, s4: { 0: 8, 2: 8 }, s5: { 0: 12, 1: 7, 3: 12 } };
function tileSizes(i, last = false) {
  const span = (k, n) => (last && FILL[k][i % n]) || SPAN[k][i % n];
  const a = Math.round((span('s5', 5) / 12) * 88), b = Math.round((span('s4', 4) / 8) * 90);
  return span('s3', 3) === 4 ? `(min-width:1100px) ${a}vw, (min-width:768px) ${b}vw, calc(100vw - 40px)` : `(min-width:1100px) ${a}vw, (min-width:768px) ${b}vw, calc(50vw - 28px)`;
}
function galleryTiles() {
  const tiles = [];
  for (const c of cases) {
    tiles.push({ c, hero: true, file: c.hero.file, w: c.hero.w, h: c.hero.h, pos: c.hero.pos, alt: 'heroAlt', cap: 'heroCaption', href: `/projects/${c.slug}/` });
    for (const p of c.plates) {
      const n = p.id.replace('-', '');
      tiles.push({ c, hero: false, file: p.file, w: p.w, h: p.h, pos: p.pos, alt: `${n}.alt`, cap: `${n}.caption`, href: `/projects/${c.slug}/#${p.id}` });
    }
  }
  return tiles.map((x, i) => {
    const img = image(x.file, x.w, x.h);
    const k = (f) => `projects.${x.c.slug}.${f}`;
    const a = x.hero ? ` data-vt-card data-cursor="view"` : ` data-cursor="view"`;
    const last = i === tiles.length - 1;
    // tile 1 is the mobile LCP (the gallery is the default view < 768 px): eager + high priority; tile 2 eager
    const eager = i === 0 ? true : i === 1 ? 'eager' : false;
    return [
      `<li class="pj-tile${x.hero ? ' pj-tile--hero' : ''}${last ? ' is-last' : ''}" data-pj-item data-case="${x.c.slug}" data-space="${x.c.spaceKey}" data-materials="${x.c.materialKeys.join(' ')}" data-s3="${i % 3}" data-s4="${i % 4}" data-s5="${i % 5}">`,
      `  <a class="pj-tile__link" href="${x.href}"${a}>`,
      `    <figure class="frame arch pj-tile__fig"${x.hero ? ` data-flip-id="${x.c.slug}"` : ''}>`,
      `      <div class="frame__clip" style="--pos:${x.pos}">${picture(img, { sizes: tileSizes(i, last), alt: dict[k(x.alt)].he, altKey: k(x.alt), eager })}</div>`,
      `      <figcaption class="caption">${status()}<span class="caption__text" data-i18n="${k(x.cap)}">${escText(dict[k(x.cap)].he)}</span></figcaption>`,
      '    </figure>',
      '  </a>',
      '</li>',
    ].join('\n');
  }).join('\n');
}

// <head> preload of the first gallery tile, mobile only (< 768 px the gallery is the default view and tile 1 is the
// LCP element; the same srcset/sizes as its <source>, so the preload is the request the <img> uses).
function galleryPreload() {
  const c = cases[0];
  const img = image(c.hero.file, c.hero.w, c.hero.h);
  return `<link rel="preload" as="image" type="image/webp" imagesrcset="${img.srcset}" imagesizes="${tileSizes(0)}" media="(max-width:767px)" fetchpriority="high">`;
}

// ------------------------------------------------------------------ run
const outputs = new Map(); // rel → content
for (const c of cases) {
  const rel = `projects/${c.slug}/index.html`;
  let html = renderCase(c);
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) html = carryOver(html, fs.readFileSync(abs, 'utf8'));
  outputs.set(rel, html);
}
outputs.set('js/i18n/projects.js', dictModule());
{
  const rel = 'projects/index.html';
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) fail(`${rel} not found (hand-authored page with @gen regions)`);
  else {
    let src = fs.readFileSync(abs, 'utf8');
    src = replaceGen(src, 'pj-preload', galleryPreload(), rel);
    src = replaceGen(src, 'pj-index', indexRows(), rel);
    src = replaceGen(src, 'pj-preview', indexPreview(), rel);
    src = replaceGen(src, 'pj-gallery', galleryTiles(), rel);
    outputs.set(rel, src);
  }
}

for (const w of warnings) console.warn('⚠ ' + w);
if (errors.length) {
  for (const e of [...new Set(errors)]) console.error('✖ ' + e);
  console.error(`gen-projects: ${new Set(errors).size} error(s); nothing written`);
  process.exit(1);
}

const changed = [];
for (const [rel, content] of outputs) {
  const abs = path.join(ROOT, rel);
  const cur = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (cur === content) continue;
  changed.push(rel);
  if (!CHECK) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, content); }
  console.log(`${CHECK ? 'would change' : 'updated'}  ${rel}`);
}
console.log(`gen-projects${CHECK ? ' --check' : ''}: ${outputs.size} output(s), ${changed.length} ${CHECK ? 'out of date' : 'written'}`);
process.exit(CHECK && changed.length ? 1 : 0);
