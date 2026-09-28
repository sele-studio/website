#!/usr/bin/env node
// SELÈ STUDIO — tools/gen-prose.mjs (P8; zero dependencies, node >= 20) — the prose engine (SPEC-ADDENDUM A6)
//
//   node tools/gen-prose.mjs                         render every built service + article page and /journal/
//   node tools/gen-prose.mjs --check                 write nothing; exit 1 if any output would differ
//   node tools/gen-prose.mjs --validate <files…>     validate data files (and the whole data set in memory);
//                                                    report only the named files' findings; write nothing
//   options: --root <dir> (another tree: tests / fixtures) · --quiet
//
// Inputs   data/site.json (optional: the A8.1 defaults are embedded; missing keys take them)
//          data/services/*.json, data/journal/*.json, data/journal/_index.json (schema A6.1, blocks A6.2)
//          tools/templates/prose-{service,article,journal}.html
// Outputs  services/<slug>/index.html · journal/<slug>/index.html · journal/index.html   (Hebrew; gen-en mirrors)
//          data/i18n/<page-id>.json   build dictionary { key: { he, en } } (never loaded by the browser)
//          data/prose-registry.json   resolved meta of every built page (array; read by tools/seo.mjs)
//
// Carry-over (A6.6): when an output page exists, the inner content of every <!-- @partial:NAME --> region, the
// <!-- @seo --> region and every ?v=<hash> (matched by URL) are copied from it byte for byte, so running this
// after sync-partials and seo.mjs changes nothing. --check compares after the carry-over. A page written for the
// first time gets its own Hebrew <title> + description inside the @seo markers (seo.mjs replaces them) and empty
// partial markers (sync-partials fills them).
//
// Exit: 0 ok (warnings allowed) · 1 errors (or --check diff) · 2 usage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------ constants (Addendum A2, A6, A8.1)
export const SITE_DEFAULTS = {
  serviceArea: null, gscToken: null, bingToken: null, launchDate: null,
  confirm: {
    styling: true, siteSupport: true, workingDrawings: true, built01Publish: true,
    drawingsPlumbingFlooring: false, built01SameAsDarkKitchen: false, renderStages: false,
    rendersStandalone: false, singleRoomProjects: false, contractorQuotes: false,
    newBuild: false, architectPartner: false, formalSupervision: false,
    englishClients: false, marketPriceReference: false,
    shohamByline: [],
  },
};
export const FLAG_NAMES = ['styling', 'siteSupport', 'workingDrawings', 'built01Publish', 'drawingsPlumbingFlooring',
  'built01SameAsDarkKitchen', 'renderStages', 'rendersStandalone', 'singleRoomProjects', 'contractorQuotes', 'newBuild',
  'architectPartner', 'formalSupervision', 'englishClients', 'marketPriceReference'];

export const SERVICE_SLUGS = ['interior-design', 'space-planning', 'kitchen-design', 'bathroom-design', 'renovation-management', '3d-visualization'];
const SVC_KEY = { 'interior-design': 'interior', 'space-planning': 'planning', 'kitchen-design': 'kitchen', 'bathroom-design': 'bathroom',
  'renovation-management': 'renovation', '3d-visualization': 'visualization' };
export const ARTICLE_SLUGS = ['how-to-choose-interior-designer', 'interior-designer-vs-architect', 'interior-design-cost', 'custom-carpentry-guide',
  'choosing-kitchen-stone', 'travertine-guide', 'home-lighting-design', 'warm-minimalism'];
const CASES = { 'stone-oak-kitchen': 'kitchen-stone-01', 'oak-living-room': 'living-01', 'travertine-bathroom': 'bath-01',
  'dark-oak-bedroom': 'bedroom-01', 'dark-oak-kitchen': 'kitchen-dark-01' };
const SECTIONS = ['hiring', 'materials', 'style'];

/** every page URL of A2 (the only link targets a prose page may use) */
export const KNOWN_PATHS = new Set(['/', '/projects/', ...Object.keys(CASES).map((s) => `/projects/${s}/`), '/film/', '/services/',
  ...SERVICE_SLUGS.map((s) => `/services/${s}/`), '/journal/', ...ARTICLE_SLUGS.map((s) => `/journal/${s}/`), '/studio/', '/contact/',
  '/contact/thanks/', '/accessibility/', '/privacy/']);

/** SEO-PLAN §1.2 link rewrite map (null = unwrap to plain text) */
const LINK_REWRITE = {
  '/projects/stone-kitchen/': '/projects/stone-oak-kitchen/',
  '/projects/oak-and-stone-living/': '/projects/oak-living-room/',
  '/projects/travertine-bath/': '/projects/travertine-bathroom/',
  '/projects/bedroom/': '/projects/dark-oak-bedroom/',
  '/services/architectural-planning/': '/services/space-planning/',
  ['/services/renovation' + '-support/']: '/services/renovation-management/',
  '/journal/master-bathroom-design/': null,
};

const BUILT_NOTE = { he: 'הצילום אינו מוצג כאן כגרסה המבוצעת של אחת ההדמיות באתר.', en: 'It is not presented here as the built version of any visualization on this site.' };
export const HERO_SIZES = '(min-width:1100px) 44vw, calc(100vw - 40px)';
const FIG_SIZES = '(min-width:1100px) 58vw, (min-width:768px) calc(100vw - 80px), calc(100vw - 40px)';
const WIDE_SIZES = '(min-width:1100px) 72vw, (min-width:768px) calc(100vw - 80px), calc(100vw - 40px)';
const TILE_SIZES = '(min-width:1100px) 24vw, (min-width:768px) calc(50vw - 52px), (min-width:480px) calc(50vw - 32px), calc(100vw - 40px)';
// a gallery of 2 or 4 tiles is two columns wide at >= 1100px (prose.css), so its tiles take the larger file
const TILE_SIZES_2UP = TILE_SIZES.replace('(min-width:1100px) 24vw', '(min-width:1100px) 36vw');
const BANNED_IN_DATA = ['TODO', '{{', '}}', 'SERVICE_AREA', 'PUBLISH_DATE', '☐', '<!--'];
const RESERVED_IDS = new Set(['main', 'pr-faq', 'pr-faq-h', 'pr-author-h', 'pr-related-h', 'pr-sources-h', 'pr-cta-title', 'pr-toc-h',
  'site-menu', 'site-menu-title', 'footer-nav', 'a11y-panel', 'a11y-title']);
const BLOCK_TYPES = new Set(['lead', 'p', 'h2', 'h3', 'ul', 'ol', 'figure', 'gallery', 'table', 'steps', 'projects', 'faq', 'note',
  'checklist', 'swatches', 'sources', 'cta']);
const NEED_H2 = new Set(['h3', 'steps', 'projects', 'faq', 'table']);

const HEB = /[֐-׿יִ-ﭏ]/;
const HE_L = '\\u05D0-\\u05EA\\u05F0-\\u05F2\\uFB1D-\\uFB4F';
const LATIN_RUN = /(?<![\p{Script=Latin}\d&#])\p{Script=Latin}(?:[\p{Script=Latin}\d]|['’.&+/-](?=[\p{Script=Latin}\d])|\s+(?=\p{Script=Latin}))*/gu;
const HEB_RUN = new RegExp(`[${HE_L}](?:[${HE_L}\\u0591-\\u05C7\\u05F3\\u05F4]|['"\\u05F3\\u05F4-](?=[${HE_L}])|\\s+(?=[${HE_L}]))*`, 'gu');
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;

// ------------------------------------------------------------------ small helpers
export const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = (s) => String(s).replace(/<[^>]*>/g, '');
const decode = (s) => String(s).replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' })[e]);
const plain = (s) => decode(stripTags(s)).replace(/\s+/g, ' ').trim();
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const toPosix = (p) => p.split(path.sep).join('/');
const parseAttrs = (s) => {
  const a = {};
  const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(s || ''))) a[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return a;
};
// words a truncated anchor must not end on ("…-seating-and", "…-for-the")
const SLUG_TAIL = /-(?:a|an|and|are|as|at|by|do|does|for|from|how|in|into|is|of|on|or|the|to|what|whats|when|where|which|who|why|with|you|your)$/;
export function slugify(s) {
  let out = plain(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['\u2019]/g, '').replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (out.length > 60) {
    out = out.slice(0, 61).replace(/-[^-]*$/, '');
    while (SLUG_TAIL.test(out) && out.includes('-')) out = out.replace(SLUG_TAIL, '');
  }
  return out || 'section';
}
function fmtDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** JPEG width/height from the SOF marker (stdlib only) */
export function jpegSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const mk = b[i + 1];
    if (mk === 0xd8 || (mk >= 0xd0 && mk <= 0xd7) || mk === 0x01 || mk === 0xff) { i += mk === 0xff ? 1 : 2; continue; }
    const len = b.readUInt16BE(i + 2);
    if (mk >= 0xc0 && mk <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(mk)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

// ------------------------------------------------------------------ markup: markdown, whitelist, links, auto-wrap
function mdToHtml(s) {
  return String(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, h) => `<a href="${h}">${t}</a>`)
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
}

/** walk tags/text of an inline HTML string: cb.text(str) → str, cb.tag(raw, {close, name, attrs, self}) → str */
function mapInline(s, cb) {
  let out = '', last = 0, m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(s))) {
    out += cb.text ? cb.text(s.slice(last, m.index)) : s.slice(last, m.index);
    const t = { close: !!m[1], name: m[2].toLowerCase(), attrs: parseAttrs(m[3]), self: !!m[4] };
    out += cb.tag ? cb.tag(m[0], t) : m[0];
    last = TAG_RE.lastIndex;
  }
  return out + (cb.text ? cb.text(s.slice(last)) : s.slice(last));
}

/** A6.2 wrapping: Latin runs in Hebrew text → <bdi lang="en">, Hebrew runs in English text → <bdi lang="he"> */
export function autoWrap(s, lang) {
  const stack = [];
  const langDepth = () => stack.filter((x) => x.lang).length;
  return mapInline(s, {
    tag(raw, t) {
      if (t.name === 'br' || t.self) return raw;
      if (!t.close) stack.push({ name: t.name, lang: 'lang' in t.attrs });
      else { const i = stack.map((x) => x.name).lastIndexOf(t.name); if (i >= 0) stack.splice(i); }
      return raw;
    },
    text(txt) {
      if (!txt || langDepth() > 0) return txt;
      if (lang === 'he') {
        return txt.replace(LATIN_RUN, (run) => ((run.match(/\p{Script=Latin}/gu) || []).length >= 2 ? `<bdi lang="en">${run}</bdi>` : run));
      }
      return txt.replace(HEB_RUN, (run, off, all) => {
        let r = run;
        const next = all[off + run.length], after = all[off + run.length + 1];
        if ((next === "'" || next === '׳') && /[גזצץתח]$/.test(run) && !(after && /[\p{L}]/u.test(after))) r += next;
        return `<bdi lang="he">${r}</bdi>`;
      });
    },
  });
}
// the geresh extension above can duplicate the apostrophe (it is inside the bdi and still in the text): fix it up
function wrapFix(s) { return s.replace(/(<bdi lang="he">[^<]*['׳])<\/bdi>['׳]/g, '$1</bdi>'); }

/** Hebrew letters outside [lang="he"] (EN values, after wrapping) */
function hebrewOutsideHe(s) {
  const stack = [];
  let bad = null;
  mapInline(s, {
    tag(raw, t) {
      if (t.name === 'br' || t.self) return raw;
      if (!t.close) stack.push({ name: t.name, he: t.attrs.lang === 'he' });
      else { const i = stack.map((x) => x.name).lastIndexOf(t.name); if (i >= 0) stack.splice(i); }
      return raw;
    },
    text(txt) { if (!bad && HEB.test(txt) && !stack.some((x) => x.he)) bad = txt.trim().slice(0, 40); return txt; },
  });
  return bad;
}

// ------------------------------------------------------------------ the engine
export function createEngine({ root = REPO } = {}) {
  const E = [], W = [];
  const report = new Map(); // flag → [lines]
  const err = (file, msg) => E.push({ file, msg });
  const warn = (file, msg) => W.push({ file, msg });
  const hold = (flag, line) => { if (!report.has(flag)) report.set(flag, []); report.get(flag).push(line); };
  const rel = (abs) => toPosix(path.relative(root, abs));

  // ---- site.json
  let site = JSON.parse(JSON.stringify(SITE_DEFAULTS));
  const siteFile = path.join(root, 'data/site.json');
  let siteSource = 'defaults (data/site.json absent)';
  if (fs.existsSync(siteFile)) {
    try {
      const s = JSON.parse(fs.readFileSync(siteFile, 'utf8'));
      site = { ...site, ...s, confirm: { ...SITE_DEFAULTS.confirm, ...(s.confirm || {}) } };
      siteSource = 'data/site.json';
    } catch (e) { err('data/site.json', `not valid JSON: ${e.message}`); }
  }
  const flag = (f) => site.confirm[f] === true;

  // ---- images
  const imgCache = new Map();
  function image(id, file, where) {
    if (imgCache.has(id)) { const c = imgCache.get(id); if (!c.ok) err(file, `${where}: image "${id}" is incomplete (${c.missing.join(', ')})`); return c; }
    const base = path.join(root, 'assets/img', id);
    const materials = id.startsWith('materials/');
    const need = materials ? ['.jpg', '.webp'] : ['.jpg', '.webp', '-640.webp'];
    const missing = need.filter((x) => !fs.existsSync(base + x)).map((x) => `/assets/img/${id}${x}`);
    let size = null;
    if (fs.existsSync(base + '.jpg')) size = jpegSize(base + '.jpg');
    if (!size && !missing.length) missing.push(`/assets/img/${id}.jpg (unreadable size)`);
    const c = { id, ok: !missing.length, missing, materials, w: size?.w || 0, h: size?.h || 0, has1024: fs.existsSync(base + '-1024.webp') };
    imgCache.set(id, c);
    if (!c.ok) err(file, `${where}: image "${id}" is incomplete (${missing.join(', ')})`);
    return c;
  }
  const srcsetOf = (c) => c.materials
    ? `/assets/img/${c.id}.webp`
    : [`/assets/img/${c.id}-640.webp 640w`, ...(c.w > 1024 && c.has1024 ? [`/assets/img/${c.id}-1024.webp 1024w`] : []), `/assets/img/${c.id}.webp ${c.w}w`].join(', ');

  // ---- string checks + bilingual resolution
  function scanStrings(v, file, where) {
    if (typeof v === 'string') {
      for (const b of BANNED_IN_DATA) if (v.includes(b)) err(file, `${where}: forbidden "${b}" in "${v.slice(0, 60)}"`);
    } else if (Array.isArray(v)) v.forEach((x, i) => scanStrings(x, file, `${where}[${i}]`));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) scanStrings(x, file, where ? `${where}.${k}` : k);
  }
  function checkFlag(f, file, where) {
    if (!FLAG_NAMES.includes(f)) { err(file, `${where}: unknown flag "${f}" (A6.1 list)`); return false; }
    return true;
  }
  /** {he,en[,variants]} → {he,en} (or null + error) */
  function bi(v, file, where, { optional = false, page = '' } = {}) {
    if (v == null) { if (!optional) err(file, `${where}: missing {he,en}`); return null; }
    if (!isObj(v)) { err(file, `${where}: expected {he,en}`); return null; }
    for (const L of ['he', 'en']) if (typeof v[L] !== 'string' || !v[L].trim()) err(file, `${where}: missing or empty "${L}"`);
    if (typeof v.he !== 'string' || typeof v.en !== 'string') return null;
    let out = { he: v.he, en: v.en };
    if (v.variants != null) {
      if (!Array.isArray(v.variants)) { err(file, `${where}.variants: expected an array`); return out; }
      let chosen = null;
      v.variants.forEach((x, i) => {
        const w = `${where}.variants[${i}]`;
        if (!isObj(x) || typeof x.requires !== 'string') return err(file, `${w}: needs "requires"`);
        checkFlag(x.requires, file, w);
        for (const L of ['he', 'en']) if (typeof x[L] !== 'string' || !x[L].trim()) err(file, `${w}: missing "${L}"`);
        if (!chosen && flag(x.requires)) chosen = x;
        else if (!flag(x.requires)) hold(x.requires, `${page} · ${where}: safe wording used`);
      });
      if (chosen) out = { he: chosen.he, en: chosen.en };
    }
    return out;
  }

  // ---- inline markup (A6.2): whitelist, links (A6.3 rule 4 + SEO-PLAN §1.2), gated unwrap
  let gatedPaths = new Set();
  function inline(value, file, where, L) {
    let unwrapNext = 0;
    const open = [];
    const out = mapInline(mdToHtml(value), {
      tag(raw, t) {
        const allowed = { a: ['href'], strong: [], em: [], br: [], span: ['lang'] }[t.name];
        if (!allowed) { err(file, `${where}.${L}: <${t.name}> is not allowed inline (a, strong, em, br, span[lang])`); return raw; }
        for (const k of Object.keys(t.attrs)) if (!allowed.includes(k)) err(file, `${where}.${L}: attribute ${k} not allowed on <${t.name}>`);
        if (t.name === 'span' && !t.close && !['he', 'en'].includes(t.attrs.lang)) err(file, `${where}.${L}: <span> needs lang="he|en"`);
        if (t.name === 'br') return '<br>';
        if (t.close) {
          if (t.name === 'a' && unwrapNext) { unwrapNext--; open.pop(); return ''; }
          if (open[open.length - 1] !== t.name) err(file, `${where}.${L}: unbalanced </${t.name}>`); else open.pop();
          return raw;
        }
        open.push(t.name);
        if (t.name !== 'a') return raw;
        let href = t.attrs.href || '';
        if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href)) { err(file, `${where}.${L}: external link ${href} (only a "sources" block may link out)`); return raw; }
        href = href.replace(/^\/en(?=\/)/, '');
        const [p0, frag] = href.split('#');
        let p = p0;
        if (p in LINK_REWRITE) {
          const to = LINK_REWRITE[p];
          warn(file, `${where}.${L}: link ${p} rewritten by SEO-PLAN §1.2 → ${to || 'plain text'}`);
          if (to === null) { unwrapNext++; return ''; }
          p = to;
        }
        if (!/^\/(?:[a-z0-9-]+\/)*$/.test(p) || (frag != null && !/^[A-Za-z0-9_-]+$/.test(frag))) {
          err(file, `${where}.${L}: link "${t.attrs.href}" must be root-absolute with a trailing slash (optional #fragment)`);
          return raw;
        }
        if (!KNOWN_PATHS.has(p)) { err(file, `${where}.${L}: link to ${p} is not a page of Addendum A2`); return raw; }
        if (gatedPaths.has(p)) { warn(file, `${where}.${L}: link to gated page ${p} rendered as plain text`); unwrapNext++; return ''; }
        return `<a href="${p}${frag != null ? '#' + frag : ''}">`;
      },
    });
    if (open.length) err(file, `${where}.${L}: unclosed <${open.join('>, <')}>`);
    return out;
  }
  /** a keyed text value: {he,en} → {he, en, html} (A6.2 hook rule decided on both final values) */
  function text(v, file, where) {
    if (!v) return null;
    const o = {};
    for (const L of ['he', 'en']) {
      if (/<bdi\b/i.test(v[L])) err(file, `${where}.${L}: <bdi> is added by gen-prose, never written in the data`);
      o[L] = wrapFix(autoWrap(inline(v[L], file, where, L), L));
      // numeric ranges never break after the en dash: a word joiner (U+2060, invisible) glues "100–" to "120"
      o[L] = mapInline(o[L], { text: (t) => t.replace(/(\d)–(\d)/g, '$1–\u2060$2') });
    }
    const bad = hebrewOutsideHe(o.en);
    if (bad) err(file, `${where}.en: Hebrew outside a lang="he" element: "${bad}"`);
    const html = /<[a-z]/i.test(o.he) || /<[a-z]/i.test(o.en);
    if (html) for (const L of ['he', 'en']) o[L] = mapInline(o[L], { text: (t) => t.replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, '&amp;').replace(/>/g, '&gt;') });
    return { he: o.he, en: o.en, html };
  }
  function attrText(v, file, where, { alt = false } = {}) {
    if (!v) return null;
    for (const L of ['he', 'en']) if (/<[a-z]/i.test(v[L]) || /\*\*|\]\(/.test(v[L])) err(file, `${where}.${L}: no markup allowed in an attribute value`);
    if (HEB.test(v.en)) err(file, `${where}.en: Hebrew letters in an attribute value`);
    if (alt) for (const L of ['he', 'en']) { const n = [...v[L]].length; if (n < 60 || n > 160) warn(file, `${where}.${L}: alt is ${n} characters (60–160 recommended)`); }
    return { he: v.he.trim(), en: v.en.trim() };
  }

  // ---- load data
  const readJson = (abs) => {
    try { return JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (e) { err(rel(abs), `not valid JSON: ${e.message}`); return null; }
  };
  const listJson = (dir) => { const d = path.join(root, dir); return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(d, f)) : []; };
  const docs = [];
  for (const abs of [...listJson('data/services'), ...listJson('data/journal').filter((f) => path.basename(f) !== '_index.json')]) {
    const data = readJson(abs);
    if (!data) continue;
    const file = rel(abs);
    scanStrings(data, file, '');
    docs.push({ file, abs, data });
  }
  const indexAbs = path.join(root, 'data/journal/_index.json');
  const indexDoc = fs.existsSync(indexAbs) ? { file: rel(indexAbs), data: readJson(indexAbs) } : null;
  if (indexDoc?.data) scanStrings(indexDoc.data, indexDoc.file, '');

  // ---- meta validation + gating
  const pages = [];
  for (const d of docs) {
    const { file, data } = d;
    const m = data.meta;
    if (!isObj(m) || !Array.isArray(data.body)) { err(file, 'needs "meta" {…} and "body" […]'); continue; }
    const kind = file.startsWith('data/services/') ? 'service' : 'article';
    const slug = path.basename(file, '.json');
    const id = `${kind === 'service' ? 'service' : 'journal'}-${slug}`;
    const wantPath = `/${kind === 'service' ? 'services' : 'journal'}/${slug}/`;
    if (m.id !== id) err(file, `meta.id must be "${id}"`);
    if (m.path !== wantPath) err(file, `meta.path must be "${wantPath}"`);
    if (m.type !== kind) err(file, `meta.type must be "${kind}"`);
    if (!(kind === 'service' ? SERVICE_SLUGS : ARTICLE_SLUGS).includes(slug)) err(file, `${slug} is not a ${kind} of Addendum A2`);
    const requires = m.requires ?? [];
    if (!Array.isArray(requires)) err(file, 'meta.requires must be an array');
    const reqs = Array.isArray(requires) ? requires.filter((f) => checkFlag(f, file, 'meta.requires')) : [];
    const gated = reqs.some((f) => !flag(f)) || (slug === '3d-visualization' && kind === 'service' && !flag('renderStages'));
    pages.push({ file, data, kind, slug, id, path: wantPath, gated, reqs });
  }
  if (!flag('renderStages')) gatedPaths.add('/services/3d-visualization/');
  for (const p of pages) if (p.gated) gatedPaths.add(p.path);
  const built = pages.filter((p) => !p.gated);
  const builtServices = SERVICE_SLUGS.filter((s) => built.some((p) => p.kind === 'service' && p.slug === s));
  for (const p of pages.filter((x) => x.gated)) {
    const why = p.reqs.filter((f) => !flag(f));
    for (const f of (why.length ? why : ['renderStages'])) hold(f, `${p.id}: whole page not built`);
  }

  // ---- render one prose page
  function renderPage(p) {
    const { file, data, kind, id } = p;
    const m = data.meta;
    const dict = {};
    const keys = [];
    const put = (key, v) => { if (key in dict) err(file, `duplicate key ${key}`); dict[key] = { he: v.he, en: v.en }; keys.push(key); };
    const pageTag = `${id}`;

    const meta = {
      crumb: bi(m.crumb, file, 'meta.crumb'),
      title: bi(m.title, file, 'meta.title', { page: pageTag }),
      desc: bi(m.desc, file, 'meta.desc', { page: pageTag }),
      h1: bi(m.h1, file, 'meta.h1', { page: pageTag }),
      ogAlt: bi(m.ogAlt, file, 'meta.ogAlt'),
    };
    if (typeof m.latin !== 'string' || !/^[A-Z0-9 ]+$/.test(m.latin)) err(file, 'meta.latin must be an uppercase Latin word');
    if (typeof m.og !== 'string' || !m.og.startsWith('/assets/img/og/')) err(file, 'meta.og must be /assets/img/og/<file>.jpg');
    if (m.index !== true && m.index !== false) err(file, 'meta.index must be true or false');
    for (const k of ['title', 'desc']) if (meta[k]) for (const L of ['he', 'en']) {
      if (L === 'en' && HEB.test(meta[k].en)) err(file, `meta.${k}.en: Hebrew letters`);
      if (/<[a-z]/i.test(meta[k][L])) err(file, `meta.${k}.${L}: no markup allowed`);
      const n = [...meta[k][L]].length;
      if (k === 'title') { if (n > 65) err(file, `meta.title.${L}: ${n} characters (max 65)`); else if (n > 60) warn(file, `meta.title.${L}: ${n} characters (60 recommended)`); }
      else { if (n < 70 || n > 165) err(file, `meta.desc.${L}: ${n} characters (70–165)`); else if (n < 110 || n > 160) warn(file, `meta.desc.${L}: ${n} characters (110–160 recommended)`); }
    }
    let service = null, article = null;
    if (kind === 'service') {
      service = { name: bi(m.service?.name, file, 'meta.service.name') };
    } else {
      const a = m.article;
      if (!isObj(a)) err(file, 'meta.article {section, service, author, published, modified} missing');
      else {
        if (!SECTIONS.includes(a.section)) err(file, `meta.article.section must be one of ${SECTIONS.join('|')}`);
        if (!SERVICE_SLUGS.includes(a.service)) err(file, 'meta.article.service must be a service slug');
        if (a.author !== 'org') err(file, 'meta.article.author must be "org" (the byline switch is confirm.shohamByline)');
        for (const k of ['published', 'modified']) if (a[k] != null && !(typeof a[k] === 'string' && ISO_DATE.test(a[k]))) err(file, `meta.article.${k} must be null or YYYY-MM-DD`);
        const published = a.published ?? site.launchDate ?? null;
        if (published != null && !ISO_DATE.test(published)) err('data/site.json', 'launchDate must be YYYY-MM-DD');
        const modified = a.modified && published && a.modified > published ? a.modified : null;
        const byShoham = Array.isArray(site.confirm.shohamByline) && site.confirm.shohamByline.includes(id);
        article = { section: a.section, service: a.service, author: byShoham ? 'shoham' : 'org', published, modified };
        if (!published) warn(file, 'no published date (article.published and site.launchDate are null): the date is omitted');
      }
    }

    // hero
    const h = m.hero;
    let hero = null;
    if (!isObj(h)) err(file, 'not exactly one hero: meta.hero {img, alt, caption?, kind, pos?} is required');
    else {
      const c = image(String(h.img || ''), file, 'meta.hero.img');
      if (!['render', 'photo'].includes(h.kind)) err(file, 'meta.hero.kind must be render|photo');
      if ((h.img === 'built-01') !== (h.kind === 'photo')) err(file, 'meta.hero.kind: built-01 is the only "photo"; every other image is a "render"');
      if (h.pos != null && !/^\d{1,3}% \d{1,3}%$/.test(h.pos)) err(file, 'meta.hero.pos must look like "50% 40%"');
      hero = { c, img: h.img, kind: h.kind, pos: h.pos || null, alt: attrText(bi(h.alt, file, 'meta.hero.alt'), file, 'meta.hero.alt', { alt: true }),
        caption: h.caption != null ? bi(h.caption, file, 'meta.hero.caption', { page: pageTag }) : null };
    }
    data.body.forEach((b, i) => { if (isObj(b) && (b.hero || b.eager)) err(file, `body[${i}]: not exactly one hero (the hero lives in meta.hero)`); });

    // optional index thumbnail (articles; lead amendment to A6.7): the /journal/ card shows meta.thumb instead of the
    // hero, so eight cards do not repeat three heroes. A render only: built-01 needs its disclosure caption (A6.3 rule 12).
    let thumb = null;
    if (m.thumb != null) {
      if (kind !== 'article') err(file, 'meta.thumb is for articles only (the /journal/ index card)');
      else if (typeof m.thumb !== 'string' || !/^[a-z0-9-]+$/.test(m.thumb) || m.thumb === 'built-01') err(file, 'meta.thumb must be a render id from assets/img (not built-01)');
      else thumb = image(m.thumb, file, 'meta.thumb');
    }

    // ---- blocks: gating + validation
    const blocks = [];
    let seenH2 = false;
    data.body.forEach((b, n) => {
      const where = `body[${n}]`;
      if (!isObj(b) || !BLOCK_TYPES.has(b.t)) { err(file, `${where}: unknown block type "${b && b.t}"`); return; }
      if (b.requires != null) {
        if (!checkFlag(b.requires, file, `${where}.requires`)) return;
        if (!flag(b.requires)) { hold(b.requires, `${id} · ${where} (${b.t})`); return; }
      }
      if (b.t === 'h2') seenH2 = true;
      if (NEED_H2.has(b.t) && !seenH2) err(file, `${where} (${b.t}) must follow an h2`);
      if (b.t === 'checklist' && b.level === 3 && !seenH2) err(file, `${where} (checklist, level 3) must follow an h2`);
      blocks.push({ b, n, where });
    });
    const itemsOf = (b, where, key = 'items') => {
      if (!Array.isArray(b[key])) { err(file, `${where}.${key} must be an array`); return []; }
      const out = [];
      b[key].forEach((it, i) => {
        if (isObj(it) && it.requires != null) {
          if (!checkFlag(it.requires, file, `${where}.${key}[${i}].requires`)) return;
          if (!flag(it.requires)) { hold(it.requires, `${id} · ${where}.${key}[${i}]`); return; }
        }
        out.push({ it, i });
      });
      if (b[key].length && !out.length) warn(file, `${where} (${b.t}): every item is gated off — block omitted (reported)`);
      return out;
    };

    const K = (n, field) => `${id}.b${n}.${field}`;
    const usedIds = new Set(RESERVED_IDS);
    const uid = (base) => { let s = base, k = 2; while (usedIds.has(s)) s = `${base}-${k++}`; usedIds.add(s); return s; };

    // keyed element
    const keyed = (tag, attrs, key, v) => {
      put(key, v);
      const a = attrs ? ' ' + attrs : '';
      return v.html ? `<${tag}${a} data-i18n-html="${key}">${v.he}</${tag}>` : `<${tag}${a} data-i18n="${key}">${escText(v.he)}</${tag}>`;
    };
    const T = (v, w) => text(bi(v, file, w, { page: pageTag }), file, w);

    // ---- images
    const picture = (c, alt, altKey, sizes, { eager = false } = {}) => {
      put(altKey, alt);
      const src = c.materials ? `<source type="image/webp" srcset="${srcsetOf(c)}">` : `<source type="image/webp" srcset="${srcsetOf(c)}" sizes="${sizes}">`;
      const load = eager ? 'loading="eager" fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
      return `<picture>${src}<img src="/assets/img/${c.id}.jpg" width="${c.w}" height="${c.h}" alt="${escAttr(alt.he)}" data-i18n-attr="alt:${altKey}" ${load}></picture>`;
    };
    const captionFor = (img, kind, cap, capKey) => {
      let v = cap;
      if (img === 'built-01') {
        if (!v) v = { he: BUILT_NOTE.he, en: BUILT_NOTE.en, html: false };
        else if (!plain(v.he).includes(BUILT_NOTE.he)) v = { he: `${v.he} ${BUILT_NOTE.he}`, en: `${v.en} ${BUILT_NOTE.en}`, html: v.html };
      }
      const status = `<span class="caption__status" data-i18n="common.status.${kind === 'photo' ? 'photo' : 'render'}">${kind === 'photo' ? 'מהביצוע' : 'הדמיה'}</span>`;
      if (!v) return `<figcaption class="caption pr-caption-solo">${status}</figcaption>`;
      return `<figcaption class="caption">${status}${keyed('span', 'class="caption__text"', capKey, v)}</figcaption>`;
    };
    const figure = (f, keyBase, where, { tile = false } = {}) => {
      if (!isObj(f)) { err(file, `${where}: expected a figure {img, alt, caption?, kind}`); return ''; }
      const c = image(String(f.img || ''), file, `${where}.img`);
      if (!['render', 'photo'].includes(f.kind)) err(file, `${where}.kind must be render|photo`);
      if ((f.img === 'built-01') !== (f.kind === 'photo')) err(file, `${where}.kind: built-01 is the only "photo"; every other image is a "render"`);
      if (f.img === 'built-01' && !flag('built01Publish')) { hold('built01Publish', `${id} · ${where} (built-01)`); return ''; }
      if (f.pos != null && !/^\d{1,3}% \d{1,3}%$/.test(f.pos)) err(file, `${where}.pos must look like "50% 40%"`);
      if (f.layout != null && !['column', 'wide'].includes(f.layout)) err(file, `${where}.layout must be column|wide`);
      const alt = attrText(bi(f.alt, file, `${where}.alt`), file, `${where}.alt`, { alt: true });
      const cap = f.caption != null ? T(f.caption, `${where}.caption`) : null;
      if (!alt || !c.ok) return '';
      const wide = f.layout === 'wide';
      const cls = tile ? 'frame arch pr-tile' : `frame arch pr-figure${wide ? ' pr-figure--wide' : ''}`;
      const style = c.materials ? `width:min(100%, ${c.w}px)` : `--w:${c.w};--h:${c.h}`;
      const clip = `--ar:${c.w}/${c.h}${f.pos ? `; --pos:${f.pos}` : ''}`;
      return `<figure class="${cls}" data-reveal="media" style="${style}"><div class="frame__clip" style="${clip}">${picture(c, alt, `${keyBase}.alt`, tile ? TILE_SIZES : wide ? WIDE_SIZES : FIG_SIZES)}</div>${captionFor(f.img, f.kind, cap, `${keyBase}.caption`)}</figure>`;
    };

    // ---- head
    const heroHtml = hero && hero.alt && hero.c.ok ? (() => {
      const cap = hero.caption ? text(hero.caption, file, 'meta.hero.caption') : null;
      const c = hero.c;
      put(`${id}.hero.alt`, hero.alt);
      return `<figure class="frame arch-door pr-hero" style="--w:${c.w};--h:${c.h}"><div class="frame__clip" style="--ar:${c.w}/${c.h}${hero.pos ? `; --pos:${hero.pos}` : ''}"><picture><source type="image/webp" srcset="${srcsetOf(c)}" sizes="${HERO_SIZES}"><img src="/assets/img/${c.id}.jpg" width="${c.w}" height="${c.h}" alt="${escAttr(hero.alt.he)}" data-i18n-attr="alt:${id}.hero.alt" loading="eager" fetchpriority="high" decoding="async"></picture></div>${captionFor(hero.img, hero.kind, cap, `${id}.hero.caption`)}</figure>`;
    })() : '';
    const preload = hero && hero.c.ok ? `<link rel="preload" as="image" type="image/webp" imagesrcset="${srcsetOf(hero.c)}" imagesizes="${HERO_SIZES}" fetchpriority="high">` : '';

    const section = kind === 'service' ? 'services' : 'journal';
    const crumbV = (meta.crumb && text(meta.crumb, file, 'meta.crumb')) || { he: '', en: '', html: false };
    const crumbs = `<nav class="crumbs label" aria-label="מיקום באתר" data-i18n-attr="aria-label:common.breadcrumb.aria">
        <ol class="crumbs__list">
          <li class="crumbs__item"><a href="/" data-i18n="common.crumb.home">ראשי</a></li>
          <li class="crumbs__item"><a href="/${section}/" data-i18n="common.nav.${section}">${section === 'services' ? 'שירותים' : 'מגזין'}</a></li>
          <li class="crumbs__item">${keyed('span', 'aria-current="page"', `${id}.crumb`, crumbV)}</li>
        </ol>
      </nav>`;
    const h1 = meta.h1 ? keyed('h1', 'class="pr-h1"', `${id}.h1`, text(meta.h1, file, 'meta.h1')) : '';
    let metaLine = '';
    if (article) {
      const by = article.author === 'shoham'
        ? '<span data-i18n="prose.meta.shoham">שוהם סלע</span>'
        : '<bdi lang="en">SELÈ STUDIO</bdi>';
      const secHe = { hiring: 'לפני שבוחרים מעצבת', materials: 'חומרים ופרטים', style: 'סגנון' }[article.section] || '';
      let dates = '';
      if (article.published) {
        const k = `${id}.date.published`;
        put(k, { he: fmtDate(article.published, 'he'), en: fmtDate(article.published, 'en') });
        dates += `<span class="pr-meta__date"><span class="pr-meta__sep"> · </span><span data-i18n="prose.meta.published">פורסם</span> <time datetime="${article.published}" data-i18n="${k}">${escText(dict[k].he)}</time></span>`;
        if (article.modified) {
          const k2 = `${id}.date.modified`;
          put(k2, { he: fmtDate(article.modified, 'he'), en: fmtDate(article.modified, 'en') });
          dates += `<span class="pr-meta__date"><span class="pr-meta__sep"> · </span><span data-i18n="prose.meta.updated">עודכן לאחרונה</span> <time datetime="${article.modified}" data-i18n="${k2}">${escText(dict[k2].he)}</time></span>`;
        }
      }
      metaLine = `<p class="pr-meta label"><span data-i18n="prose.meta.by">מאת</span> ${by} · <span data-i18n="prose.section.${article.section}">${secHe}</span>${dates}</p>`;
    }

    // ---- body
    const firstH2 = blocks.findIndex((x) => x.b.t === 'h2');
    const intro = [], body = [], toc = [];
    let faqHtml = '', sourcesHtml = '', ctaHtml = '', ctaCount = 0, faqCount = 0, sourcesCount = 0, lastHeadingId = null;
    const faqQs = [];
    let afterFaq = [];
    blocks.forEach(({ b, n, where }, idx) => {
      const out = firstH2 < 0 || idx < firstH2 ? intro : body;
      const W2 = (field) => `${where}.${field}`;
      switch (b.t) {
        case 'lead': case 'p': case 'note': {
          const v = T(b.text, W2('text'));
          if (!v) return;
          const el = keyed('p', b.t === 'lead' ? 'class="pr-lead"' : '', K(n, 'text'), v);
          out.push(b.t === 'note' ? `<aside class="pr-note">${el}</aside>` : el);
          break;
        }
        case 'h2': case 'h3': {
          const raw = bi(b.text, file, W2('text'), { page: pageTag });
          const v = text(raw, file, W2('text'));
          if (!v) return;
          if (b.id != null && !/^[a-z0-9][a-z0-9-]*$/.test(b.id)) err(file, `${W2('id')}: must be an ASCII slug`);
          const hid = uid(b.id || slugify(raw.en));
          lastHeadingId = hid;
          out.push(keyed(b.t, `id="${hid}" class="pr-${b.t}"`, K(n, 'text'), v));
          if (b.t === 'h2') toc.push({ id: hid, key: K(n, 'text'), v });
          break;
        }
        case 'ul': case 'ol': {
          const items = itemsOf(b, where);
          if (!items.length) return;
          const lis = items.map(({ it, i }) => { const v = T(it, `${where}.items[${i}]`); return v ? keyed('li', '', K(n, `i${i}`), v) : ''; }).join('');
          out.push(`<${b.t} class="pr-list"${b.t === 'ul' ? ' role="list"' : ''}>${lis}</${b.t}>`);
          break;
        }
        case 'figure': out.push(figure(b, `${id}.b${n}`, where)); break;
        case 'gallery': {
          const items = itemsOf(b, where);
          if (!items.length) return;
          const tiles = items.map(({ it, i }) => figure(it, `${id}.b${n}.i${i}`, `${where}.items[${i}]`, { tile: true })).filter(Boolean);
          const twoUp = tiles.length === 2 || tiles.length === 4;
          const figs = tiles.map((f) => `<li class="pr-gallery__item">${twoUp ? f.split(`sizes="${TILE_SIZES}"`).join(`sizes="${TILE_SIZES_2UP}"`) : f}</li>`).join('');
          if (!figs) { warn(file, `${where} (gallery): no figure left — block omitted`); return; }
          const cap = b.caption != null ? T(b.caption, W2('caption')) : null;
          out.push(`<div class="pr-gallery"><ul class="pr-gallery__list" role="list">${figs}</ul>${cap ? keyed('p', 'class="caption pr-gallery__caption"', K(n, 'caption'), cap) : ''}</div>`);
          break;
        }
        case 'table': {
          if (!Array.isArray(b.head) || !b.head.length || !Array.isArray(b.rows) || !b.rows.length) { err(file, `${where}: table needs head[] and rows[][]`); return; }
          const cols = b.head.length;
          let capHtml = '', label = lastHeadingId;
          if (b.caption != null) {
            const cv = T(b.caption, W2('caption'));
            label = uid(`${id}-t${n}`);
            if (cv) capHtml = keyed('caption', `id="${label}"`, K(n, 'caption'), cv);
          }
          const ths = b.head.map((c, j) => { const v = T(c, `${where}.head[${j}]`); return v ? keyed('th', 'scope="col"', K(n, `h${j}`), v) : ''; }).join('');
          const trs = b.rows.map((row, r) => {
            if (!Array.isArray(row) || row.length !== cols) { err(file, `${where}.rows[${r}]: expected ${cols} cells`); return ''; }
            return `<tr>${row.map((c, j) => { const v = T(c, `${where}.rows[${r}][${j}]`); return v ? keyed(j === 0 ? 'th' : 'td', j === 0 ? 'scope="row"' : '', K(n, `r${r}c${j}`), v) : ''; }).join('')}</tr>`;
          }).join('');
          out.push(`<div class="pr-table" role="region" tabindex="0" aria-labelledby="${label}"><table>${capHtml}<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`);
          break;
        }
        case 'steps': {
          const items = itemsOf(b, where);
          if (!items.length) return;
          const lis = items.map(({ it, i }) => {
            const tv = T(it.title, `${where}.items[${i}].title`), xv = T(it.text, `${where}.items[${i}].text`);
            return tv && xv ? `<li class="pr-steps__item">${keyed('h3', 'class="pr-steps__title"', K(n, `i${i}.title`), tv)}${keyed('p', 'class="pr-steps__text"', K(n, `i${i}.text`), xv)}</li>` : '';
          }).join('');
          out.push(`<ol class="pr-steps">${lis}</ol>`);
          break;
        }
        case 'projects': {
          const items = itemsOf(b, where);
          if (!items.length) return;
          const lis = items.map(({ it, i }) => {
            const w = `${where}.items[${i}]`;
            const slug = /^\/projects\/([a-z0-9-]+)\/$/.exec(it.href || '')?.[1];
            if (!slug || !CASES[slug]) { err(file, `${w}.href must be one of the five case pages`); return ''; }
            const img = it.img || CASES[slug];
            if (img !== CASES[slug]) err(file, `${w}.img must be the case hero "${CASES[slug]}"`);
            const c = image(img, file, `${w}.img`);
            const tv = T(it.title, `${w}.title`), xv = T(it.text, `${w}.text`);
            if (!tv || !xv || !c.ok) return '';
            put(K(n, `i${i}.title`), tv); put(K(n, `i${i}.text`), xv);
            return card({ href: it.href, c, titleKey: K(n, `i${i}.title`), tv, textKey: K(n, `i${i}.text`), xv, vt: true,
              label: '<p class="pr-card__label label"><span data-i18n="prose.label.privateResidence">פרויקט מגורים פרטי</span> · <span data-i18n="common.status.render">הדמיה</span></p>' });
          }).join('');
          out.push(`<ul class="pr-cards pr-cards--projects" role="list">${lis}</ul>`);
          break;
        }
        case 'faq': {
          faqCount++;
          const hv = T(b.h, W2('h'));
          const items = itemsOf(b, where);
          if (!items.length || !hv) return;
          let first = true;
          const det = items.map(({ it, i }) => {
            const w = `${where}.items[${i}]`;
            const qraw = bi(it.q, file, `${w}.q`, { page: pageTag });
            const qv = text(qraw, file, `${w}.q`), av = T(it.a, `${w}.a`);
            if (!qv || !av) return '';
            faqQs.push({ he: plain(qv.he), en: plain(qv.en), where: w });
            const o = first ? ' open' : '';
            first = false;
            return `<details class="pr-faq__item" data-faq-item${o}><summary class="pr-faq__q">${keyed('h3', 'data-faq-q', K(n, `q${i}`), qv)}</summary><div class="pr-faq__a" data-faq-a>${keyed('p', '', K(n, `a${i}`), av)}</div></details>`;
          }).join('');
          faqHtml = `<section class="pr-faq" id="pr-faq" aria-labelledby="pr-faq-h">${keyed('h2', 'id="pr-faq-h"', K(n, 'h'), hv)}${det}</section>`;
          afterFaq = [];
          return;
        }
        case 'checklist': {
          const hv = T(b.h, W2('h'));
          if (![2, 3].includes(b.level)) err(file, `${W2('level')} must be 2 or 3`);
          const items = itemsOf(b, where);
          if (!items.length || !hv) return;
          const hid = uid(slugify(bi(b.h, file, W2('h'))?.en || `checklist-${n}`));
          const lvl = b.level === 3 ? 'h3' : 'h2';
          const lis = items.map(({ it, i }) => { const v = T(it, `${where}.items[${i}]`); return v ? keyed('li', 'class="pr-checklist__item"', K(n, `i${i}`), v) : ''; }).join('');
          out.push(`<section class="pr-checklist" aria-labelledby="${hid}">${keyed(lvl, `class="pr-checklist__h" id="${hid}"`, K(n, 'h'), hv)}<ul class="pr-checklist__list" role="list">${lis}</ul></section>`);
          break;
        }
        case 'swatches': {
          const items = itemsOf(b, where);
          if (!items.length) return;
          const lis = items.map(({ it, i }) => {
            const w = `${where}.items[${i}]`;
            if (typeof it.img !== 'string' || !it.img.startsWith('materials/')) { err(file, `${w}.img must be "materials/<id>"`); return ''; }
            const c = image(it.img, file, `${w}.img`);
            const alt = attrText(bi(it.alt, file, `${w}.alt`), file, `${w}.alt`);
            const nameRaw = bi(it.name, file, `${w}.name`);
            if (nameRaw) for (const L of ['he', 'en']) nameRaw[L] = nameRaw[L].replace(/\*\*/g, '');
            const nv = text(nameRaw, file, `${w}.name`), xv = T(it.text, `${w}.text`);
            if (!c.ok || !alt || !nv || !xv) return '';
            const altKey = K(n, `i${i}.alt`);
            put(altKey, alt);
            return `<li class="pr-swatch"><span class="frame arch-quarter pr-swatch__frame" style="width:min(100%, ${c.w}px)"><span class="frame__clip" style="--ar:${c.w}/${c.h}"><picture><source type="image/webp" srcset="/assets/img/${c.id}.webp"><img src="/assets/img/${c.id}.jpg" width="${c.w}" height="${c.h}" alt="${escAttr(alt.he)}" data-i18n-attr="alt:${altKey}" loading="lazy" decoding="async"></picture></span></span>${keyed('p', 'class="pr-swatch__name"', K(n, `i${i}.name`), nv)}${keyed('p', 'class="pr-swatch__text"', K(n, `i${i}.text`), xv)}</li>`;
          }).join('');
          out.push(`<ul class="pr-swatches" role="list">${lis}</ul>`);
          break;
        }
        case 'sources': {
          sourcesCount++;
          const hv = T(b.h, W2('h'));
          const items = itemsOf(b, where);
          if (!items.length || !hv) return;
          const lis = items.map(({ it, i }) => {
            const w = `${where}.items[${i}]`;
            if (typeof it.href !== 'string' || !/^https:\/\/www\.(nevo\.co\.il|gov\.il)\//.test(it.href)) { err(file, `${w}.href must start with https://www.nevo.co.il/ or https://www.gov.il/`); return ''; }
            const lv = T(it.label, `${w}.label`);
            return lv ? `<li>${keyed('a', `class="link" href="${escAttr(it.href)}" rel="noopener"`, K(n, `i${i}`), lv)}</li>` : '';
          }).join('');
          sourcesHtml = `<aside class="pr-sources" aria-labelledby="pr-sources-h">${keyed('h2', 'id="pr-sources-h"', K(n, 'h'), hv)}<ul role="list">${lis}</ul></aside>`;
          return;
        }
        case 'cta': {
          ctaCount++;
          const hv = T(b.h, W2('h')), pv = T(b.p, W2('p')), bv = T(b.button, W2('button'));
          const href = b.href ?? '/contact/';
          if (!KNOWN_PATHS.has(href.split('#')[0]) || gatedPaths.has(href.split('#')[0])) err(file, `${W2('href')}: ${href} is not a built page of A2`);
          if (!hv || !pv || !bv) return;
          ctaHtml = `<section class="cta-band" data-theme="bordeaux" aria-labelledby="pr-cta-title" data-fx="letterpress">
      <div class="cta-band__inner l-wrap">
        <svg class="cta-band__seal" viewBox="0 0 182 210" aria-hidden="true" focusable="false" data-letterpress-seal><use href="#seal-sym"/></svg>
        ${keyed('h2', 'class="cta-band__title" id="pr-cta-title"', K(n, 'h'), hv)}
        ${keyed('p', 'class="cta-band__sub"', K(n, 'p'), pv)}
        <div class="cta-band__actions">
          ${keyed('a', `class="btn btn--light" href="${escAttr(href)}"`, K(n, 'button'), bv)}
          <a class="cta-band__mail link" href="mailto:office@sele-studio.com"><span class="u-lat" lang="en">office@sele-studio.com</span></a>
        </div>
      </div>
    </section>`;
          return;
        }
        default: break;
      }
      if (faqHtml) afterFaq.push(`${where} (${b.t})`);
    });
    if (afterFaq.length) warn(file, `blocks after the FAQ are rendered before it (A6.4 order): ${afterFaq.join(', ')}`);
    if (ctaCount !== 1) err(file, `exactly one "cta" block per page (found ${ctaCount})`);
    if (faqCount > 1) err(file, `at most one "faq" block per page (found ${faqCount})`);
    if (sourcesCount > 1) err(file, `at most one "sources" block per page (found ${sourcesCount})`);

    // ---- author + related
    let authorHtml = '', relatedHtml = '';
    if (article) {
      authorHtml = `<aside class="pr-author" aria-labelledby="pr-author-h">
        <svg class="pr-author__seal" viewBox="0 0 182 210" aria-hidden="true" focusable="false"><use href="#seal-sym"/></svg>
        <div class="pr-author__body">
          <p class="pr-author__label label" id="pr-author-h" data-i18n="prose.author.label">נכתב על ידי</p>
          ${article.author === 'shoham'
    ? '<p class="pr-author__text" data-i18n-html="prose.author.shoham">שוהם סלע, מעצבת פנים, בוגרת שנקר בהצטיינות ומייסדת <bdi lang="en">SELÈ STUDIO</bdi>.</p>'
    : '<p class="pr-author__text" data-i18n-html="prose.author.org"><bdi lang="en">SELÈ STUDIO</bdi>, סטודיו בוטיק לאדריכלות ועיצוב פנים בהובלת שוהם סלע, מעצבת פנים בוגרת שנקר בהצטיינות.</p>'}
          <a class="link" href="/studio/" data-i18n="prose.author.link">על הסטודיו</a>
        </div>
      </aside>`;
    }
    if (kind === 'service') {
      const others = builtServices.filter((s) => s !== p.slug);
      const lis = others.map((s) => `<li><a class="link" href="/services/${s}/" data-i18n="common.svc.${SVC_KEY[s]}">${SVC_HE[s]}</a></li>`).join('');
      relatedHtml = `<nav class="pr-related" aria-labelledby="pr-related-h">
        <h2 class="pr-related__h" id="pr-related-h" data-i18n="prose.related.services">שירותים נוספים</h2>
        ${lis ? `<ul class="pr-related__list" role="list">${lis}</ul>` : ''}
        <p class="pr-related__all"><a class="link" href="/services/" data-i18n="prose.related.allServices">לכל השירותים</a></p>
      </nav>`;
    } else if (article) {
      relatedHtml = '@@RELATED@@'; // filled after every article's meta is known (labels = their crumbs)
    }

    // ---- TOC (articles)
    let tocHtml = '';
    if (kind === 'article' && toc.length) {
      const lis = toc.map((x) => {
        const hasA = /<a\b/i.test(x.v.he) || /<a\b/i.test(x.v.en);
        let key = x.key, v = x.v;
        if (hasA) { key = `${x.key}.toc`; v = { he: x.v.he.replace(/<\/?a\b[^>]*>/g, ''), en: x.v.en.replace(/<\/?a\b[^>]*>/g, ''), html: x.v.html }; put(key, v); }
        const a = v.html ? `<a href="#${x.id}" data-i18n-html="${key}">${v.he}</a>` : `<a href="#${x.id}" data-i18n="${key}">${escText(v.he)}</a>`;
        return `<li>${a}</li>`;
      }).join('');
      tocHtml = `<nav class="pr-toc" aria-labelledby="pr-toc-h">
        <details class="pr-toc__details">
          <summary class="pr-toc__summary label" data-i18n="prose.toc.label">בעמוד הזה</summary>
          <ol class="pr-toc__list">${lis}</ol>
        </details>
        <div class="pr-toc__static">
          <p class="pr-toc__label label" id="pr-toc-h" data-i18n="prose.toc.label">בעמוד הזה</p>
          <ol class="pr-toc__list">${lis}</ol>
        </div>
      </nav>`;
    }

    const I = (arr, pad) => arr.filter(Boolean).map((s) => pad + s).join('\n');
    const main = [
      `    <div class="pr-head l-wrap l-grid">`,
      `      <div class="pr-head__text">`,
      `      ${crumbs}`,
      `        <p class="opener__latin pr-latin${(m.latin || '').length > 10 ? ' pr-latin--long' : ''}" lang="en" aria-hidden="true">${escText(m.latin || '')}</p>`,
      `        ${h1}`,
      metaLine ? `        ${metaLine}` : '',
      `      </div>`,
      heroHtml ? `      ${heroHtml}` : '',
      intro.length ? `      <div class="pr-intro">\n${I(intro, '        ')}\n      </div>` : '',
      `    </div>`,
      `    <div class="pr-body l-wrap l-grid${tocHtml ? ' pr-body--toc' : ''}">`,
      tocHtml ? `      ${tocHtml}` : '',
      `      <div class="pr-flow">`,
      I([...body, faqHtml, sourcesHtml, authorHtml, relatedHtml], '        '),
      `      </div>`,
      `    </div>`,
      ctaHtml ? `    ${ctaHtml}` : '',
    ].filter((x) => x !== '').join('\n');

    return { p, meta, service, article, hero, thumb, dict, keys, main, preload, faqQs, K };
  }

  function card({ href, c, titleKey, tv, textKey, xv, vt = false, label = '' }) {
    const h = Math.round((640 * c.h) / c.w);
    const cardTitle = tv.html ? `<h3 class="pr-card__title" data-i18n-html="${titleKey}">${tv.he}</h3>` : `<h3 class="pr-card__title" data-i18n="${titleKey}">${escText(tv.he)}</h3>`;
    const cardText = xv.html ? `<p class="pr-card__text" data-i18n-html="${textKey}">${xv.he}</p>` : `<p class="pr-card__text" data-i18n="${textKey}">${escText(xv.he)}</p>`;
    return `<li class="pr-card"><a class="pr-card__link" href="${href}" data-cursor="view"${vt ? ' data-vt-card' : ''}><span class="frame arch-quarter pr-card__thumb" aria-hidden="true"><span class="frame__clip" style="--ar:1/1"><img src="/assets/img/${c.id}-640.webp" width="640" height="${h}" alt="" loading="lazy" decoding="async"></span></span>${cardTitle}</a>${cardText}${label}</li>`;
  }

  // ------------------------------------------------------------------ run all pages
  const rendered = built.map(renderPage);
  const byId = new Map(rendered.map((r) => [r.p.id, r]));

  // related (articles): other built articles of the same section (labels = their crumbs)
  const index = indexDoc?.data || null;
  const indexOrder = [];
  if (index) for (const s of index.sections || []) for (const id of s.ids || []) indexOrder.push(id);
  const articleOrder = [...rendered.filter((r) => r.p.kind === 'article')].sort((a, b) => {
    const ia = indexOrder.indexOf(a.p.id), ib = indexOrder.indexOf(b.p.id);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.p.id.localeCompare(b.p.id);
  });
  for (const r of rendered) {
    if (r.p.kind !== 'article' || !r.article) continue;
    let sibs = articleOrder.filter((x) => x !== r && x.article && x.article.section === r.article.section);
    if (!sibs.length) {
      sibs = articleOrder.filter((x) => x !== r && x.article).slice(0, 3);
      warn(r.p.file, sibs.length ? `no other built article in section "${r.article.section}": "More from the journal" lists ${sibs.length} article(s) of other sections`
        : 'no other built article yet: "More from the journal" shows only its links');
    }
    const lis = sibs.map((x, i) => {
      const k = `${r.p.id}.rel${i}`;
      r.dict[k] = { he: x.meta.crumb.he, en: x.meta.crumb.en };
      return `<li><a class="link" href="${x.p.path}" data-i18n="${k}">${escText(x.meta.crumb.he)}</a></li>`;
    }).join('');
    const svc = r.article.service;
    const svcBuilt = builtServices.includes(svc);
    const svcLine = svcBuilt
      ? `<p class="pr-related__svc"><span data-i18n="prose.related.service">השירות הקשור:</span> <a class="link" href="/services/${svc}/" data-i18n="common.svc.${SVC_KEY[svc]}">${SVC_HE[svc]}</a></p>`
      : (gatedPaths.has(`/services/${svc}/`) ? (warn(r.p.file, `related service /services/${svc}/ is gated: line omitted`), '') : `<p class="pr-related__svc"><span data-i18n="prose.related.service">השירות הקשור:</span> <a class="link" href="/services/${svc}/" data-i18n="common.svc.${SVC_KEY[svc]}">${SVC_HE[svc]}</a></p>`);
    const html = `<nav class="pr-related" aria-labelledby="pr-related-h">
        <h2 class="pr-related__h" id="pr-related-h" data-i18n="prose.related.journal">עוד מהמגזין</h2>
        ${lis ? `<ul class="pr-related__list" role="list">${lis}</ul>` : ''}
        ${svcLine}
        <p class="pr-related__all"><a class="link" href="/journal/" data-i18n="prose.related.allJournal">לכל המדריכים</a></p>
      </nav>`;
    r.main = r.main.replace('@@RELATED@@', html);
  }

  // cross-page: FAQ questions unique
  const seenQ = new Map();
  for (const r of rendered) for (const q of r.faqQs) for (const L of ['he', 'en']) {
    const k = `${L}:${q[L]}`;
    if (seenQ.has(k)) { const o = seenQ.get(k); err(r.p.file, `${q.where}: FAQ question also on ${o.id} (${o.where})`); err(o.file, `${o.where}: FAQ question also on ${r.p.id} (${q.where})`); }
    else seenQ.set(k, { id: r.p.id, file: r.p.file, where: q.where });
  }

  // cross-page per page: built-01 / kitchen-dark-01 adjacency (A6.3 rule 12) + word counts
  for (const r of rendered) {
    if (!flag('built01SameAsDarkKitchen')) {
      const seq = [];
      const re = /<h2\b|<img\b[^>]*\ssrc="\/assets\/img\/([^"]+?)(?:-640\.webp|\.jpg|\.webp)"/g;
      let m;
      while ((m = re.exec(r.main))) seq.push(m[1] ? m[1] : '|');
      for (let i = 1; i < seq.length; i++) {
        const a = seq[i - 1], b = seq[i];
        if ((a === 'built-01' && b === 'kitchen-dark-01') || (a === 'kitchen-dark-01' && b === 'built-01')) err(r.p.file, 'built-01 is adjacent to kitchen-dark-01 (A6.3 rule 12): put an h2 or another image between them');
      }
    }
    for (const m of r.main.matchAll(/data-i18n(?:-html)?="([^"]+)"|data-i18n-attr="[a-z-]+:([^"]+)"/g)) {
      const k = m[1] || m[2];
      if (!(k in r.dict) && !/^(common|prose)\./.test(k)) err(r.p.file, `internal: key ${k} rendered without a dictionary entry`);
    }
    const words = plain(r.main).split(' ');
    const heWords = words.filter((w) => HEB.test(w)).length;
    r.words = heWords;
    if (r.p.kind === 'service' && heWords < 450) err(r.p.file, `service page has ${heWords} Hebrew words in main (min 450)`);
    if (r.p.kind === 'article' && heWords < 1200) warn(r.p.file, `article has ${heWords} Hebrew words in main (1,200 recommended)`);
  }

  // ---- journal index
  let journal = null;
  if (indexDoc && index) {
    const file = indexDoc.file;
    const m = index.meta || {};
    if (m.id !== 'journal' || m.path !== '/journal/' || m.type !== 'journal') err(file, 'meta must be {id:"journal", path:"/journal/", type:"journal", …}');
    const meta = { crumb: bi(m.crumb, file, 'meta.crumb'), title: bi(m.title, file, 'meta.title'), desc: bi(m.desc, file, 'meta.desc'), h1: bi(m.h1, file, 'meta.h1'), ogAlt: bi(m.ogAlt, file, 'meta.ogAlt') };
    const lead = bi(index.lead, file, 'lead');
    const dict = {};
    const put = (k, v) => { dict[k] = { he: v.he, en: v.en }; };
    const kv = (tag, attrs, key, v) => { put(key, v); return v.html ? `<${tag} ${attrs} data-i18n-html="${key}">${v.he}</${tag}>` : `<${tag} ${attrs} data-i18n="${key}">${escText(v.he)}</${tag}>`; };
    const collection = [];
    const secs = [];
    for (const s of index.sections || []) {
      if (!SECTIONS.includes(s.key)) { err(file, `sections: unknown key "${s.key}"`); continue; }
      const cards = [];
      for (const aid of s.ids || []) {
        if (!ARTICLE_SLUGS.map((x) => `journal-${x}`).includes(aid)) { err(file, `sections.${s.key}: unknown article id ${aid}`); continue; }
        const r = byId.get(aid);
        if (!r) continue; // not built (data missing or gated)
        if (r.article && r.article.section !== s.key) err(file, `${aid} is in section "${s.key}" but its data says "${r.article.section}"`);
        collection.push(aid);
        const tv = text(r.meta.h1, file, `${aid}.h1`), xv = text(r.meta.desc, file, `${aid}.desc`);
        const c = r.thumb || r.hero?.c;
        if (!tv || !xv || !c?.ok) continue;
        let label = '';
        if (r.article?.published) {
          const dk = `journal.card.${aid}.date`;
          put(dk, { he: fmtDate(r.article.published, 'he'), en: fmtDate(r.article.published, 'en') });
          label = `<p class="pr-card__label label"><time datetime="${r.article.published}" data-i18n="${dk}">${escText(dict[dk].he)}</time></p>`;
        }
        put(`journal.card.${aid}.title`, tv); put(`journal.card.${aid}.desc`, xv);
        cards.push(card({ href: r.p.path, c, titleKey: `journal.card.${aid}.title`, tv, textKey: `journal.card.${aid}.desc`, xv, label }));
      }
      if (!cards.length) { warn(file, `section "${s.key}" has no built article yet: omitted`); continue; }
      const secHe = { hiring: 'לפני שבוחרים מעצבת', materials: 'חומרים ופרטים', style: 'סגנון' }[s.key];
      secs.push(`<section class="pr-index__section" aria-labelledby="pr-sec-${s.key}">
        <h2 class="pr-index__h" id="pr-sec-${s.key}" data-i18n="prose.section.${s.key}">${secHe}</h2>
        <ul class="pr-cards" role="list">${cards.join('')}</ul>
      </section>`);
    }
    const leadV = lead ? text(lead, file, 'lead') : null;
    const crumb = meta.crumb ? kv('span', 'aria-current="page"', 'journal.crumb', { ...meta.crumb, html: false }) : '';
    const h1 = meta.h1 ? kv('h1', 'class="pr-h1"', 'journal.h1', text(meta.h1, file, 'meta.h1')) : '';
    const main = [
      `    <div class="pr-head pr-head--index l-wrap l-grid">`,
      `      <div class="pr-head__text">`,
      `      <nav class="crumbs label" aria-label="מיקום באתר" data-i18n-attr="aria-label:common.breadcrumb.aria">
        <ol class="crumbs__list">
          <li class="crumbs__item"><a href="/" data-i18n="common.crumb.home">ראשי</a></li>
          <li class="crumbs__item">${crumb}</li>
        </ol>
      </nav>`,
      `        <p class="opener__latin pr-latin" lang="en" aria-hidden="true">${escText(m.latin || 'JOURNAL')}</p>`,
      `        ${h1}`,
      leadV ? `        ${kv('p', 'class="pr-lead"', 'journal.lead', leadV)}` : '',
      `      </div>`,
      `    </div>`,
      `    <div class="pr-index l-wrap">`,
      secs.map((s) => '      ' + s).join('\n'),
      `    </div>`,
      `    <!-- @partial:cta -->`,
      `    <!-- /@partial:cta -->`,
    ].filter((x) => x !== '').join('\n');
    for (const k of ['title', 'desc']) if (meta[k]) for (const L of ['he', 'en']) {
      const n = [...meta[k][L]].length;
      if (k === 'title' && n > 65) err(file, `meta.title.${L}: ${n} characters (max 65)`);
      if (k === 'desc' && (n < 70 || n > 165)) err(file, `meta.desc.${L}: ${n} characters (70–165)`);
    }
    journal = { file, meta, m, dict, main, collection };
  } else if (!indexDoc) warn('data/journal/_index.json', 'missing: /journal/ is not generated');

  return { E, W, report, site, siteSource, pages, built, rendered, journal, gatedPaths, root };
}
const SVC_HE = { 'interior-design': 'עיצוב פנים', 'space-planning': 'תכנון דירה', 'kitchen-design': 'עיצוב מטבח', 'bathroom-design': 'עיצוב חדר רחצה',
  'renovation-management': 'ליווי שיפוץ דירה', '3d-visualization': 'הדמיות תלת מימד' };

// ------------------------------------------------------------------ templates + carry-over
const REGION = /(<!--\s*(@partial:[A-Za-z0-9_-]+|@seo)\s*-->)([\s\S]*?)(<!--\s*\/\2\s*-->)/g;
export function regionsOf(html) {
  const out = new Map();
  for (const m of html.matchAll(REGION)) out.set(m[2], m[3]);
  return out;
}
export function carryOver(fresh, existing) {
  if (existing == null) return fresh;
  const old = regionsOf(existing);
  let out = fresh.replace(REGION, (all, open, name, inner, close) => (old.has(name) ? open + old.get(name) + close : all));
  const hashes = new Map();
  for (const m of existing.matchAll(/((?:href|src)="(\/(?:css|js)\/[^"?#]+))\?v=([A-Za-z0-9]+)"/g)) hashes.set(m[2], m[3]);
  out = out.replace(/((?:href|src)="(\/(?:css|js)\/[^"?#]+))\?v=([A-Za-z0-9]+)"/g, (all, a, url) => (hashes.has(url) ? `${a}?v=${hashes.get(url)}"` : all));
  return out;
}
function fillTemplate(tpl, { id, preload, main, title, desc }) {
  let out = tpl
    .replace(/\{\{id\}\}/g, id)
    .replace(/[ \t]*\{\{preload\}\}\n?/, preload ? `  ${preload}\n` : '')
    .replace(/[ \t]*\{\{main\}\}/, () => main);
  // first write: the page's own Hebrew title + description inside the @seo markers (seo.mjs replaces them)
  out = out.replace(/(<!--\s*@seo\s*-->)[\s\S]*?(<!--\s*\/@seo\s*-->)/, (all, a, b) =>
    `${a}\n  <title>${escText(title)}</title>\n  <meta name="description" content="${escAttr(desc)}">\n  ${b}`);
  return out;
}

// ------------------------------------------------------------------ outputs
export function plan(engine) {
  const { root, rendered, journal, pages } = engine;
  const files = new Map(); // rel → content (null = delete)
  const tplCache = {};
  const tpl = (name) => (tplCache[name] ??= fs.readFileSync(path.join(root, 'tools/templates', `prose-${name}.html`), 'utf8'));
  const existing = (rel) => { const f = path.join(root, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
  const registry = [];
  const json = (o) => JSON.stringify(o, null, 2) + '\n';

  for (const r of rendered) {
    const outRel = `${r.p.kind === 'service' ? 'services' : 'journal'}/${r.p.slug}/index.html`;
    const fresh = fillTemplate(tpl(r.p.kind), { id: r.p.id, preload: r.preload, main: r.main, title: r.meta.title?.he || '', desc: r.meta.desc?.he || '' });
    files.set(outRel, carryOver(fresh, existing(outRel)));
    files.set(`data/i18n/${r.p.id}.json`, json(r.dict));
    const m = r.p.data.meta;
    const entry = {
      id: r.p.id, file: outRel, path: r.p.path, type: r.p.kind,
      crumbs: ['home', r.p.kind === 'service' ? 'services' : 'journal'],
      crumb: r.meta.crumb, title: r.meta.title, desc: r.meta.desc, h1: r.meta.h1, latin: m.latin,
      hero: r.hero ? { img: r.hero.img, kind: r.hero.kind, alt: r.hero.alt, width: r.hero.c.w, height: r.hero.c.h } : null,
      og: m.og, ogAlt: r.meta.ogAlt, index: m.index !== false,
    };
    if (r.service) entry.service = r.service;
    if (r.article) entry.article = r.article;
    entry.words = r.words;
    registry.push(entry);
  }
  for (const p of pages.filter((x) => x.gated)) {
    const outRel = `${p.kind === 'service' ? 'services' : 'journal'}/${p.slug}/index.html`;
    if (fs.existsSync(path.join(root, outRel))) files.set(outRel, null);
    if (fs.existsSync(path.join(root, `data/i18n/${p.id}.json`))) files.set(`data/i18n/${p.id}.json`, null);
  }
  if (journal) {
    const fresh = fillTemplate(tpl('journal'), { id: 'journal', preload: '', main: journal.main, title: journal.meta.title?.he || '', desc: journal.meta.desc?.he || '' });
    files.set('journal/index.html', carryOver(fresh, existing('journal/index.html')));
    files.set('data/i18n/journal.json', json(journal.dict));
    registry.push({
      id: 'journal', file: 'journal/index.html', path: '/journal/', type: 'journal', crumbs: ['home'],
      crumb: journal.meta.crumb, title: journal.meta.title, desc: journal.meta.desc, h1: journal.meta.h1, latin: journal.m.latin,
      hero: null, og: journal.m.og, ogAlt: journal.meta.ogAlt, index: journal.m.index !== false, collection: journal.collection,
    });
  }
  // stable order: services (hub order), journal index, articles (index order via collection, then the rest)
  const order = (e) => (e.type === 'service' ? SERVICE_SLUGS.indexOf(e.path.split('/')[2]) : e.type === 'journal' ? 100 : 200 + (journal?.collection.indexOf(e.id) ?? 0));
  registry.sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
  files.set('data/prose-registry.json', json(registry));
  return files;
}

// ------------------------------------------------------------------ CLI
function printFindings(engine, { onlyFiles = null, quiet = false } = {}) {
  const keep = (x) => !onlyFiles || onlyFiles.has(x.file);
  const E = engine.E.filter(keep), W = engine.W.filter(keep);
  const uniq = (arr) => [...new Map(arr.map((x) => [`${x.file}\u0000${x.msg}`, x])).values()];
  if (!quiet || E.length) {
    for (const w of uniq(W)) console.log(`  warn  ${w.file}: ${w.msg}`);
    for (const e of uniq(E)) console.log(`  ✖     ${e.file}: ${e.msg}`);
  }
  return { errors: uniq(E).length, warnings: uniq(W).length };
}
function printReport(engine) {
  console.log(`\nOWNER REPORT — flags from ${engine.siteSource}; what is held back while a flag is not true:`);
  if (!engine.report.size) { console.log('  (nothing held back)'); return; }
  for (const f of [...engine.report.keys()].sort()) {
    console.log(`  ${f} = ${JSON.stringify(engine.site.confirm[f])}`);
    for (const line of [...new Set(engine.report.get(f))]) console.log(`    - ${line}`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  let root = REPO, check = false, validate = null, quiet = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') root = path.resolve(argv[++i] || '.');
    else if (a === '--check') check = true;
    else if (a === '--quiet') quiet = true;
    else if (a === '--validate') { validate = []; while (argv[i + 1] && !argv[i + 1].startsWith('--')) validate.push(argv[++i]); }
    else { console.error(`unknown argument ${a}`); return 2; }
  }
  const engine = createEngine({ root });
  if (validate) {
    const want = new Set(validate.map((f) => toPosix(path.relative(root, path.resolve(process.cwd(), f)))));
    for (const f of want) if (!fs.existsSync(path.join(root, f))) engine.E.push({ file: f, msg: 'file not found' });
    console.log(`gen-prose --validate: ${want.size} file(s)`);
    const { errors, warnings } = printFindings(engine, { onlyFiles: want });
    console.log(errors ? `✖ ${errors} error(s), ${warnings} warning(s)` : `✔ 0 errors, ${warnings} warning(s)`);
    return errors ? 1 : 0;
  }
  const { errors, warnings } = printFindings(engine, { quiet });
  if (errors) { console.log(`✖ ${errors} error(s), ${warnings} warning(s) — nothing written`); return 1; }
  const files = plan(engine);
  let diff = 0;
  for (const [relFile, content] of files) {
    const abs = path.join(root, relFile);
    const cur = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (cur === content) continue;
    diff++;
    if (check) { console.log(`  would ${content == null ? 'delete' : cur == null ? 'create' : 'change'}  ${relFile}`); continue; }
    if (content == null) fs.rmSync(abs);
    else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, content); }
    if (!quiet) console.log(`  ${content == null ? 'deleted' : cur == null ? 'created' : 'updated'}  ${relFile}`);
  }
  if (!quiet) printReport(engine);
  console.log(`gen-prose: ${engine.rendered.length} page(s) + ${engine.journal ? 'journal index' : 'no journal index'}; ${check ? `${diff} out of date` : `${diff} file(s) written`}; ${warnings} warning(s)`);
  return check && diff ? 1 : 0;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) process.exit(await main());
