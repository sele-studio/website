#!/usr/bin/env node
// SELÈ STUDIO — vendor + font fetcher (P0). Run ONCE by a developer; the site never contacts these hosts at runtime.
//
//   node tools/fetch-vendor.mjs            download GSAP 3.13.0 + Lenis 1.3.8 + the self-hosted fonts,
//                                          write assets/vendor/VERSIONS.txt (SHA-384 + sizes)
//   node tools/fetch-vendor.mjs --measure  additionally measure metric-matched fallback faces in headless Chrome
//                                          and (re)write css/fonts.css with the measured values.
//                                          Needs puppeteer-core: resolved from $SELE_TOOLS/node_modules
//                                          (default ../../tools relative to the repo root) and Chrome at
//                                          $CHROME or /Applications/Google Chrome.app.
//   node tools/fetch-vendor.mjs --measure-only   skip downloads; only measure + write css/fonts.css.
//
// Node >= 20, no dependencies for the download step.
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const MEASURE = args.has('--measure') || args.has('--measure-only');
const DOWNLOAD = !args.has('--measure-only');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const GSAP = '3.13.0', LENIS = '1.3.8';
const GSAP_FILES = ['gsap', 'ScrollTrigger', 'SplitText', 'CustomEase', 'Flip'];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Assistant:wght@200..600&family=Bodoni+Moda:opsz,wght@6..96,400&family=Frank+Ruhl+Libre:wght@300..500&family=Jost:wght@300..500&display=swap';

// Bodoni Moda ships its FULL optical-size axis (opsz 6..96), not the opsz-96 poster master alone: at 96 the hairlines
// vanish below ~36px (QA: "V eined stone", "W ant a space…"). With `font-optical-sizing:auto` (css/base.css) the browser
// maps font-size to opsz, so the mega openers still render the 96 master and EN H3 / mini-CTA lines get the text cut.
// family (as in Google's CSS) + subset comment -> local file + CSS family + weight range + preload
const FONTS = [
  { family: 'Frank Ruhl Libre', subset: 'hebrew',    file: 'frank-ruhl-libre-hebrew.woff2', preload: true },
  { family: 'Frank Ruhl Libre', subset: 'latin',     file: 'frank-ruhl-libre-latin.woff2' },
  { family: 'Assistant',        subset: 'hebrew',    file: 'assistant-hebrew.woff2', preload: true },
  { family: 'Assistant',        subset: 'latin',     file: 'assistant-latin.woff2' },
  { family: 'Bodoni Moda',      subset: 'latin',     file: 'bodoni-moda-latin.woff2' },
  { family: 'Bodoni Moda',      subset: 'latin-ext', file: 'bodoni-moda-latin-ext.woff2' },
  { family: 'Jost',             subset: 'latin',     file: 'jost-latin.woff2' },
];

const sha384 = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

async function get(url, { text = false, ua = false } = {}) {
  const res = await fetch(url, { headers: ua ? { 'User-Agent': UA } : {} });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return text ? res.text() : Buffer.from(await res.arrayBuffer());
}

async function save(rel, buf) {
  const abs = join(ROOT, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);
  return abs;
}

function parseFontCss(css) {
  // Google's css2 output: "/* subset */\n@font-face { ... }"
  const out = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const body = m[2];
    const pick = (p) => (body.match(new RegExp(p + '\\s*:\\s*([^;]+);')) || [])[1]?.trim();
    out.push({
      subset: m[1],
      family: pick('font-family')?.replace(/['"]/g, ''),
      weight: pick('font-weight'),
      style: pick('font-style') || 'normal',
      url: (body.match(/url\(([^)]+)\)/) || [])[1],
      range: pick('unicode-range'),
    });
  }
  return out;
}

async function download() {
  const lines = [
    '# SELÈ STUDIO — self-hosted third-party files',
    `# Fetched by tools/fetch-vendor.mjs on ${new Date().toISOString()}`,
    '# path  size  integrity  source',
    '',
    `## GSAP ${GSAP} (GreenSock standard "no charge" license; SplitText/Flip/CustomEase are free since 3.13)`,
  ];
  for (const f of GSAP_FILES) {
    const url = `https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP}/${f}.min.js`;
    const buf = await get(url);
    const rel = `assets/vendor/gsap/${GSAP}/${f}.min.js`;
    await save(rel, buf);
    lines.push(`/${rel}  ${buf.length} B  ${sha384(buf)}  ${url}`);
    console.log('✓', rel, kb(buf.length));
  }
  lines.push('', `## Lenis ${LENIS} (MIT)`);
  {
    const url = `https://cdn.jsdelivr.net/npm/lenis@${LENIS}/dist/lenis.min.js`;
    const buf = await get(url);
    const rel = `assets/vendor/lenis/${LENIS}/lenis.min.js`;
    await save(rel, buf);
    lines.push(`/${rel}  ${buf.length} B  ${sha384(buf)}  ${url}`);
    console.log('✓', rel, kb(buf.length));
  }

  lines.push('', '## Fonts (SIL Open Font License 1.1) — discovered from', `## ${FONT_CSS}`);
  const css = await get(FONT_CSS, { text: true, ua: true });
  const faces = parseFontCss(css);
  const manifest = [];
  for (const f of FONTS) {
    const face = faces.find((x) => x.family === f.family && x.subset === f.subset && x.style === 'normal');
    if (!face) throw new Error(`font face not found in Google CSS: ${f.family} / ${f.subset}`);
    const buf = await get(face.url);
    const rel = `assets/fonts/${f.file}`;
    await save(rel, buf);
    lines.push(`/${rel}  ${buf.length} B  ${sha384(buf)}  ${face.url}  weight=${face.weight}  range=${face.range}`);
    manifest.push({ ...f, weight: face.weight, range: face.range, size: buf.length });
    console.log('✓', rel, kb(buf.length), face.weight);
  }
  await save('assets/fonts/fonts.json', JSON.stringify(manifest, null, 2) + '\n');
  await save('assets/vendor/VERSIONS.txt', lines.join('\n') + '\n');
  console.log('✓ assets/vendor/VERSIONS.txt');
}

// ---------------------------------------------------------------- fallback metrics
const SAMPLE_HE = 'סטודיו בוטיק לאדריכלות ועיצוב פנים עם יחס אישי וחם נקי מדויק';     // 60 chars
const SAMPLE_LAT = 'A boutique studio for architecture and interior design, clean'; // 60+ chars (trimmed below)
const FALLBACKS = [
  { name: 'FRL Fallback',       web: 'Frank Ruhl Libre', weight: 300, local: 'Times New Roman', sample: SAMPLE_HE },
  { name: 'Assistant Fallback', web: 'Assistant',        weight: 400, local: 'Arial',           sample: SAMPLE_HE },
  { name: 'Bodoni Fallback',    web: 'Bodoni Moda',      weight: 400, local: 'Times New Roman', sample: SAMPLE_LAT },
  { name: 'Jost Fallback',      web: 'Jost',             weight: 400, local: 'Arial',           sample: SAMPLE_LAT },
];

function loadPuppeteer() {
  const tools = process.env.SELE_TOOLS || resolve(ROOT, '../../tools');
  const req = createRequire(join(tools, 'package.json'));
  return req('puppeteer-core');
}

async function measure() {
  const manifest = JSON.parse(await readFile(join(ROOT, 'assets/fonts/fonts.json'), 'utf8'));
  const puppeteer = loadPuppeteer();
  const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  // tiny static server so the woff2 files load same-origin
  const server = createServer(async (req, res) => {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': p.endsWith('.woff2') ? 'font/woff2' : 'text/html; charset=utf-8' });
    res.end(await readFile(p));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const faceCss = manifest.map((f) => `@font-face{font-family:"${f.family}";src:url(/assets/fonts/${f.file}) format("woff2");font-weight:${f.weight};font-display:block;unicode-range:${f.range}}`).join('\n');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = {};
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/assets/fonts/fonts.json`);
    for (const fb of FALLBACKS) {
      const sample = [...fb.sample].slice(0, 60).join('');
      const r = await page.evaluate(async ({ faceCss, fb, sample }) => {
        document.head.innerHTML = `<style>${faceCss}</style>`;
        await document.fonts.load(`${fb.weight} 100px "${fb.web}"`, sample);
        const c = document.createElement('canvas').getContext('2d');
        c.font = `${fb.weight} 100px "${fb.web}"`;
        const web = c.measureText(sample);
        c.font = `${fb.weight} 100px "${fb.local}"`;
        const loc = c.measureText(sample);
        return { webW: web.width, locW: loc.width, asc: web.fontBoundingBoxAscent, desc: web.fontBoundingBoxDescent,
                 locAsc: loc.fontBoundingBoxAscent, locDesc: loc.fontBoundingBoxDescent };
      }, { faceCss, fb, sample });
      const sizeAdjust = r.webW / r.locW;
      // overrides are scaled by size-adjust, so divide to land on the web font's line box
      const ascent = r.asc / 100 / sizeAdjust, descent = r.desc / 100 / sizeAdjust;
      results[fb.name] = { ...fb, sizeAdjust, ascent, descent, raw: r };
      // verify: apply the face and re-measure
      const check = await page.evaluate(async ({ fb, sizeAdjust, ascent, descent, sample }) => {
        const f = new FontFace(fb.name + ' Check', `local("${fb.local}")`, { sizeAdjust: (sizeAdjust * 100).toFixed(2) + '%', ascentOverride: (ascent * 100).toFixed(2) + '%', descentOverride: (descent * 100).toFixed(2) + '%', lineGapOverride: '0%' });
        await f.load(); document.fonts.add(f);
        const c = document.createElement('canvas').getContext('2d');
        c.font = `${fb.weight} 100px "${fb.name} Check"`;
        const m = c.measureText(sample);
        return { w: m.width, asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent };
      }, { fb, sizeAdjust, ascent, descent, sample });
      results[fb.name].check = check;
      console.log(`${fb.name.padEnd(20)} size-adjust ${(sizeAdjust * 100).toFixed(2)}%  ascent ${(ascent * 100).toFixed(2)}%  descent ${(descent * 100).toFixed(2)}%  ` +
        `| web w=${r.webW.toFixed(1)} asc=${r.asc} desc=${r.desc}  → fallback w=${check.w.toFixed(1)} asc=${check.asc} desc=${check.desc}`);
    }
  } finally { await browser.close(); server.close(); }
  await writeFontsCss(manifest, results);
}

async function writeFontsCss(manifest, fb) {
  const pct = (n) => (n * 100).toFixed(2) + '%';
  const out = [
    '/* SELÈ STUDIO — self-hosted fonts (SPEC §3.3). GENERATED by `node tools/fetch-vendor.mjs --measure`; edit the script, not this file.',
    '   Files: /assets/fonts/*.woff2 (OFL 1.1), subset by unicode-range exactly as Google Fonts serves them. No runtime request leaves the origin.',
    '   Preloaded (partials/head.html): frank-ruhl-libre-hebrew.woff2, assistant-hebrew.woff2.',
    '   Bodoni Moda carries its full optical-size axis (opsz 6..96); css/base.css sets font-optical-sizing:auto on body so the',
    '   browser picks the cut from font-size (the opsz-96 master alone loses its hairlines below ~36px). */',
    '',
  ];
  for (const f of manifest) {
    out.push(`@font-face{`,
      `  font-family:"${f.family}";`,
      `  src:url("/assets/fonts/${f.file}") format("woff2");`,
      `  font-weight:${f.weight};`,
      `  font-style:normal;`,
      `  font-display:swap;`,
      `  unicode-range:${f.range};`,
      `}`);
  }
  out.push('', '/* Metric-matched fallbacks (measured in headless Chrome: 60-char string at 100px; size-adjust = web width / local width;',
    '   ascent/descent = web fontBoundingBox / size-adjust, so the fallback line box equals the web font\'s). */');
  for (const f of FALLBACKS) {
    const m = fb[f.name];
    out.push(`@font-face{`,
      `  font-family:"${f.name}";`,
      `  src:local("${f.local}");`,
      `  size-adjust:${pct(m.sizeAdjust)};`,
      `  ascent-override:${pct(m.ascent)};`,
      `  descent-override:${pct(m.descent)};`,
      `  line-gap-override:0%;`,
      `}`);
  }
  await save('css/fonts.css', out.join('\n') + '\n');
  console.log('✓ css/fonts.css');
}

if (DOWNLOAD) await download();
if (MEASURE) await measure();
