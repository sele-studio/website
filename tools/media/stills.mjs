#!/usr/bin/env node
// P7 stills (SPEC §10 + Addendum A8.8): vein displacement map, material tiles, palette-rhyme story strips,
// OG images, the case-study light-study crops (assets/img/light/<slug>, SPEC §4.1 + §5.3 item 6), /favicon.ico
// and the 144 px square row thumbnails (assets/img/thumb/<id>-144.webp) shown at 72 CSS px (2x).
//
//   node tools/media/stills.mjs                     build every still + contact sheets in tools/media/out/
//   node tools/media/stills.mjs --sheets            contact sheets only (no writes under assets/ or the root)
//   node tools/media/stills.mjs --only og,favicon   build only the named groups (vein, tiles, story, light, og,
//                                                   favicon, thumb, mid), then the contact sheets
//
// Media modules (sharp) resolve from $SELE_TOOLS (a folder holding node_modules), defaulting to the
// scratchpad tools folder. Nothing here adds pixels to her work: crops and resamples only, no text,
// tint, grade or glow. Labels and box outlines exist only on the contact sheets in tools/media/out/.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const TOOLS = process.env.SELE_TOOLS ||
  '/private/tmp/claude-501/-Users-tohargueta-Library-CloudStorage-OneDrive-YouCCTechnologies-Desktop-Systems-YouCC-lion8/bb4e0756-6dc9-4593-9e3c-84596b23b1d1/scratchpad/tools';
const require = createRequire(path.join(TOOLS, 'node_modules', '_'));
const sharp = require('sharp');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..', '..');
const IMG = path.join(SITE, 'assets/img');
const OUT = path.join(HERE, 'out');
const SHEETS_ONLY = process.argv.includes('--sheets');
const GROUPS = ['vein', 'tiles', 'story', 'light', 'og', 'favicon', 'thumb', 'mid'];
const ONLY = (() => {
  const i = process.argv.indexOf('--only');
  if (i < 0) return null;
  const v = process.argv[i + 1];
  const s = new Set(v && !v.startsWith('--') ? v.split(',') : []);
  const bad = [...s].filter((g) => !GROUPS.includes(g));
  if (!s.size || bad.length) throw new Error(`--only takes a comma list of ${GROUPS.join(', ')}${bad.length ? ` (unknown: ${bad.join(', ')})` : ''}`);
  return s;
})();
const want = (g) => !ONLY || ONLY.has(g);

// ---------------------------------------------------------------------------------------------
// Crop boxes: [x, y, w, h] in source px, output at the crop's own size (1.0x, never upscaled).
// Final values after viewing the contact sheets (spec starting boxes noted beside each).
// ---------------------------------------------------------------------------------------------
const TILES = [ // 4:5
  { id: 'stone',      src: 'kitchen-stone-03.jpg', box: [922, 120, 360, 450] },
  { id: 'light-oak',  src: 'living-02.jpg',        box: [352, 100, 384, 480] },
  { id: 'travertine', src: 'bath-02.jpg',          box: [652, 318, 216, 270] },
  { id: 'walnut',     src: 'bath-01.jpg',          box: [720, 913, 188, 235] },
  { id: 'linen',      src: 'bedroom-02.jpg',       box: [442, 392, 176, 220] },
  { id: 'dark-oak',   src: 'bedroom-02.jpg',       box: [650, 180, 260, 325] },
];
const STORY = [ // architecture only, never her body
  { id: 'ny-marble',     src: 'shoham-portrait.jpg',  ar: [1, 3], box: [1314, 420, 124, 372] },
  { id: 'ny-bronze',     src: 'shoham-portrait.jpg',  ar: [1, 3], box: [295, 120, 110, 330] },
  { id: 'ny-oak',        src: 'shoham-portrait.jpg',  ar: [4, 1], box: [555, 318, 336, 84] },
  { id: 'studio-stone',  src: 'kitchen-stone-03.jpg', ar: [1, 3], box: [1000, 60, 150, 450] },
  { id: 'studio-bronze', src: 'bath-02.jpg',          ar: [1, 3], box: [368, 312, 156, 468] },
  { id: 'studio-oak',    src: 'kitchen-stone-01.jpg', ar: [4, 1], box: [538, 141, 576, 144] },
];
// Light study (SPEC §5.3 item 6): a real 4:5 detail crop at native resolution showing exactly what the
// case's light alt describes; never a re-framing of a render already on the page. P2 displays it at
// width:min(100%, 1.2 × crop width), so the crop width below is what P2 writes into data/projects.mjs.
// SPEC §10: every crop is >= 480 px wide (frame cap >= 576 px). Starting boxes are SPEC §10's; the ones
// moved by eye on the contact sheet note the SPEC box beside them.
const LIGHT_MIN_W = 480;
const LIGHT = [
  // "a warm line of light at the top of the stone splashback" — the lit niche under the oak uppers (SPEC box)
  { id: 'stone-oak-kitchen',   src: 'kitchen-stone-01.jpg', box: [533, 34, 560, 700] },
  // "a warm line of light between the oak paneling and the stone plinth" — moved left to clear the TV
  // (its left edge is at x ≈ 747); SPEC (278, 636, 560, 700)
  { id: 'oak-living-room',     src: 'living-02.jpg',        box: [180, 636, 560, 700] },
  // "the edge of a backlit mirror on a travertine wall" — the right mirror, its glowing edges on travertine (SPEC box)
  { id: 'travertine-bathroom', src: 'bath-01.jpg',          box: [560, 40, 520, 650] },
  // "a wedge of sunlight on a pale wall above dark-oak paneling" — centred on the wedge, clear of the right
  // pendant, the curtain and the ceiling; SPEC (665, 0, 560, 700)
  { id: 'dark-oak-bedroom',    src: 'bedroom-01.jpg',       box: [600, 50, 480, 600] },
  // "dark metal shelving with warm backlighting" — lowered so the lit shelving fills the frame (the tap
  // cannot be avoided at >= 480 px: the shelving is only ~460 px wide); SPEC (232, 111, 560, 700)
  { id: 'dark-oak-kitchen',    src: 'kitchen-dark-01.jpg',  box: [232, 220, 560, 700] },
];
// Row thumbnails: 72 CSS px `arch-quarter` 1:1 frames (Services S2 `.sv-row__thumb`, Home H4 `.home-works__thumb`)
// were fed the 640 px renders (19-35 KB each). These are the same 1:1 window the frame showed, baked at 144 px
// (2x DPR): the square side is the source's short edge, placed by the row's own `--pos` (object-position
// semantics, so the page looks identical and `--pos` becomes a no-op). pos = SPEC H4 table / services S2 rows.
const THUMB_PX = 144;
const THUMB = [
  { id: 'living-01',        pos: [0.50, 0.40] }, // services interior-design; home 2
  { id: 'living-02',        pos: [0.50, 0.45] }, // services space-planning
  { id: 'kitchen-stone-01', pos: [0.50, 0.55] }, // services kitchen-design; home 1
  { id: 'bath-01',          pos: [0.50, 0.35] }, // services bathroom-design; home 3
  { id: 'built-01',         pos: [0.50, 0.42] }, // services renovation-management
  { id: 'living-03',        pos: [0.50, 0.40] }, // services 3d-visualization
  { id: 'bedroom-01',       pos: [0.55, 0.55] }, // home 4
  { id: 'kitchen-dark-01',  pos: [0.50, 0.38] }, // home 5
];
const OG_W = 1200, OG_H = 630;
const OG = [ // cover-crop at 1.905:1; py = object-position y (0..1)
  { id: 'home', copy: 'og.jpg' },
  { id: 'projects',            src: 'kitchen-stone-02.jpg', py: 0.50 },
  { id: 'stone-oak-kitchen',   src: 'kitchen-stone-01.jpg', py: 0.58 },
  { id: 'oak-living-room',     src: 'living-01.jpg',        py: 0.45 },
  { id: 'travertine-bathroom', src: 'bath-01.jpg',          py: 0.40 },
  { id: 'dark-oak-bedroom',    src: 'bedroom-01.jpg',       py: 0.58 },
  { id: 'dark-oak-kitchen',    src: 'kitchen-dark-01.jpg',  py: 0.35 },
  { id: 'studio',              src: 'bath-02.jpg',          py: 0.31 }, // spec 0.45 cut the tap at the top edge; 0.31 frames tap + vanity
  { id: 'contact',             src: 'kitchen-stone-03.jpg', py: 0.45 },
  // Addendum A8.8: 17 more, cover-cropped by sharp's attention strategy (no hand-set position).
  // og-approach.jpg is no longer produced (A8.8; /approach/ is retired, A1 L4) and is removed if present.
  { id: 'services',                                   src: 'living-04.jpg',        att: true },
  { id: 'journal',                                    src: 'living-03.jpg',        att: true },
  { id: 'film',                                       src: 'video/hero-16x9-poster.jpg', att: true },
  { id: 'service-interior-design',                    src: 'living-01.jpg',        att: true },
  { id: 'service-space-planning',                     src: 'bedroom-01.jpg',       att: true },
  { id: 'service-kitchen-design',                     src: 'kitchen-stone-01.jpg', att: true },
  { id: 'service-bathroom-design',                    src: 'bath-01.jpg',          att: true },
  { id: 'service-renovation-management',              src: 'living-02.jpg',        att: true }, // not built-01 (A8.8: upscale)
  { id: 'service-3d-visualization',                   src: 'video/hero-16x9-poster.jpg', att: true },
  { id: 'journal-how-to-choose-interior-designer',    src: 'kitchen-stone-02.jpg', att: true },
  { id: 'journal-interior-designer-vs-architect',     src: 'bedroom-02.jpg',       att: true },
  { id: 'journal-interior-design-cost',               src: 'kitchen-stone-01.jpg', att: true },
  { id: 'journal-choosing-kitchen-stone',             src: 'kitchen-stone-02.jpg', att: true },
  { id: 'journal-travertine-guide',                   src: 'bath-01.jpg',          att: true },
  { id: 'journal-home-lighting-design',               src: 'kitchen-stone-03.jpg', att: true },
  { id: 'journal-custom-carpentry-guide',             src: 'living-01.jpg',        att: true },
  { id: 'journal-warm-minimalism',                    src: 'bedroom-01.jpg',       att: true },
];
const OG_RETIRED = ['approach'];
const OG_UPSCALE_LIMIT = 1.07;
// /favicon.ico (A8.8): 48×48 PNG of the dark seal, wrapped in a single-image ICO container.
const FAVICON = { src: path.join(SITE, 'assets/brand/seal-dark-512.png'), out: path.join(SITE, 'favicon.ico'), size: 48 };

// ---------------------------------------------------------------------------------------------
const warnings = [];
// Sources are file names under assets/img/, or 'video/<file>' for a poster under assets/video/.
const srcPath = (f) => (f.startsWith('video/') ? path.join(SITE, 'assets', f) : path.join(IMG, f));
const meta = async (f) => sharp(srcPath(f)).metadata();
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });

function checkBox(label, m, [x, y, w, h], ar) {
  if (x < 0 || y < 0 || x + w > m.width || y + h > m.height)
    throw new Error(`${label}: box ${[x, y, w, h]} outside ${m.width}x${m.height}`);
  if (ar && w * ar[1] !== h * ar[0]) throw new Error(`${label}: ${w}x${h} is not ${ar[0]}:${ar[1]}`);
}

const crop = (src, [x, y, w, h]) =>
  sharp(srcPath(src)).extract({ left: x, top: y, width: w, height: h });

async function writePair(dir, name, pipeline, { webpQ, jpgQ }) {
  mkdir(dir);
  const buf = await pipeline.toBuffer(); // raw-ish intermediate, re-encoded twice below
  const files = [];
  if (webpQ) {
    const f = path.join(dir, `${name}.webp`);
    await sharp(buf).webp({ quality: webpQ, effort: 6 }).toFile(f); files.push(f);
  }
  const j = path.join(dir, `${name}.jpg`);
  await sharp(buf).jpeg({ quality: jpgQ, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(j); files.push(j);
  return files;
}

// ---------------------------------------------------------------------------------------------
async function veinDisp() {
  const dir = path.join(IMG, 'fx'); mkdir(dir);
  const f = path.join(dir, 'vein-disp.jpg');
  await sharp(path.join(IMG, 'materials/marble.jpg'))
    .resize(512, 512, { fit: 'cover' }).greyscale().normalise().linear(1.35, -40).blur(1.2)
    .jpeg({ quality: 85 }).toFile(f);
  return [f];
}

async function tiles() {
  const out = [];
  for (const t of TILES) {
    const m = await meta(t.src); checkBox(`tile-${t.id}`, m, t.box, [4, 5]);
    // extract then encode via a lossless PNG intermediate so each format is encoded once
    out.push(...await writePair(path.join(IMG, 'materials'), `tile-${t.id}`, crop(t.src, t.box).png(), { webpQ: 82, jpgQ: 86 }));
  }
  return out;
}

async function story() {
  const out = [];
  for (const s of STORY) {
    const m = await meta(s.src); checkBox(`story-${s.id}`, m, s.box, s.ar);
    out.push(...await writePair(path.join(IMG, 'story'), s.id, crop(s.src, s.box).png(), { webpQ: 82, jpgQ: 86 }));
  }
  return out;
}

async function light() {
  const out = [];
  for (const l of LIGHT) {
    const m = await meta(l.src); checkBox(`light-${l.id}`, m, l.box, [4, 5]);
    if (l.box[2] < LIGHT_MIN_W) throw new Error(`light-${l.id}: ${l.box[2]} px wide, SPEC §10 needs >= ${LIGHT_MIN_W}`);
    out.push(...await writePair(path.join(IMG, 'light'), l.id, crop(l.src, l.box).png(), { webpQ: 82, jpgQ: 86 }));
  }
  return out;
}

function ogBox(m, py) {
  const ar = OG_W / OG_H;
  let w = m.width, h = Math.round(m.width / ar);
  if (h > m.height) { h = m.height; w = Math.round(h * ar); }
  const x = Math.round((m.width - w) / 2);
  const y = Math.round((m.height - h) * py);
  return [x, y, w, h];
}

// A8.8 recipe: sharp(src).resize(1200, 630, {fit:'cover', position:'attention'}). Returns the JPEG and the
// window it kept, mapped back to source px (for the in-context sheet).
async function ogAttention(src) {
  const m = await meta(src);
  const { data, info } = await sharp(srcPath(src))
    .resize(OG_W, OG_H, { fit: 'cover', position: 'attention', kernel: 'lanczos3' })
    .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const k = Math.max(OG_W / m.width, OG_H / m.height);
  const box = [-info.cropOffsetLeft / k, -info.cropOffsetTop / k, OG_W / k, OG_H / k].map(Math.round);
  return { data, box, up: k };
}

async function og() {
  const dir = path.join(IMG, 'og'); mkdir(dir);
  const out = [];
  for (const id of OG_RETIRED) {
    const f = path.join(dir, `og-${id}.jpg`);
    if (fs.existsSync(f)) { fs.unlinkSync(f); console.log(`removed\t${path.relative(SITE, f)} (A8.8: not produced)`); }
  }
  for (const o of OG) {
    const f = path.join(dir, `og-${o.id}.jpg`);
    if (o.copy) { fs.copyFileSync(path.join(IMG, o.copy), f); out.push(f); continue; }
    const m = await meta(o.src);
    let up;
    if (o.att) {
      const r = await ogAttention(o.src);
      fs.writeFileSync(f, r.data); up = r.up;
    } else {
      const box = ogBox(m, o.py);
      up = OG_W / box[2];
      await crop(o.src, box).resize(OG_W, OG_H, { kernel: 'lanczos3' })
        .jpeg({ quality: 82, mozjpeg: true }).toFile(f);
    }
    if (m.height > m.width && up > OG_UPSCALE_LIMIT + 1e-9)
      warnings.push(`og-${o.id}: portrait source ${o.src} is ${m.width}px wide -> ${up.toFixed(3)}x upscale (limit ${OG_UPSCALE_LIMIT}); source is spec-mandated and no larger original exists`);
    out.push(f);
  }
  return out;
}

function thumbBox(m, [px, py]) {
  const side = Math.min(m.width, m.height);
  return [Math.round((m.width - side) * px), Math.round((m.height - side) * py), side, side];
}

async function thumbs() {
  const dir = path.join(IMG, 'thumb'); mkdir(dir);
  const out = [];
  for (const t of THUMB) {
    const src = `${t.id}.jpg`, box = thumbBox(await meta(src), t.pos);
    const f = path.join(dir, `${t.id}-${THUMB_PX}.webp`);
    await crop(src, box).resize(THUMB_PX, THUMB_PX, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6 }).toFile(f);
    out.push(f);
  }
  return out;
}

// Mid-size WebPs (lead, integration pass): a 768w step between -640 and -1024 for the Studio threshold images. On a
// 1.75-2x phone the 372 CSS px slot needs 651-744 px, so the browser skipped the 640 and fetched the 1024 (portrait
// 168 KB, the mobile LCP of /studio/). Resamples of the full-size file only; the existing variants are not touched.
const MID = [
  { id: 'shoham-portrait', w: 768, q: 72 },
  { id: 'bath-02', w: 768, q: 76 },
];
async function mids() {
  const out = [];
  for (const m of MID) {
    const f = path.join(IMG, `${m.id}-${m.w}.webp`);
    await sharp(path.join(IMG, `${m.id}.jpg`)).resize(m.w, null, { kernel: 'lanczos3' }).webp({ quality: m.q, effort: 6 }).toFile(f);
    out.push(f);
  }
  return out;
}

// ICO container with one PNG payload (ICO allows PNG images since Vista; every current browser reads it).
function icoFromPng(png, w, h) {
  const head = Buffer.alloc(6 + 16);
  head.writeUInt16LE(0, 0);          // reserved
  head.writeUInt16LE(1, 2);          // type 1 = icon
  head.writeUInt16LE(1, 4);          // one image
  head.writeUInt8(w >= 256 ? 0 : w, 6);
  head.writeUInt8(h >= 256 ? 0 : h, 7);
  head.writeUInt8(0, 8);             // no palette
  head.writeUInt8(0, 9);             // reserved
  head.writeUInt16LE(1, 10);         // colour planes
  head.writeUInt16LE(32, 12);        // bits per pixel
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18);        // payload offset = 6 + 16
  return Buffer.concat([head, png]);
}

async function favicon() {
  const n = FAVICON.size;
  // The dark seal alone is transparent and vanishes on a dark tab strip, so it sits on the same bone plate as
  // assets/brand/favicon.svg (fill #F2EFE9, corner radius 36/202 of the width, seal ≈ 90% of the plate height).
  // seal-dark-512 is 444×512: contained, never distorted.
  const sh = Math.round(n * 210 / 230), sw = Math.round(sh * 444 / 512);
  const seal = await sharp(FAVICON.src).resize(sw, sh, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).png().toBuffer();
  const r = +(n * 36 / 202).toFixed(2);
  const plate = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><rect width="${n}" height="${n}" rx="${r}" fill="#F2EFE9"/></svg>`);
  const png = await sharp(plate).composite([{ input: seal, left: Math.round((n - sw) / 2), top: Math.round((n - sh) / 2) }])
    .png({ compressionLevel: 9, palette: false }).toBuffer();
  fs.writeFileSync(FAVICON.out, icoFromPng(png, n, n));
  return [FAVICON.out];
}

// ---------------------------------------------------------------------------------------------
// Contact sheets (tools/media/out/ only; labels and outlines never touch the shipped files)
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const label = (w, text) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34"><rect width="100%" height="100%" fill="#1a1613"/>` +
  `<text x="8" y="23" font-family="Helvetica,Arial" font-size="16" fill="#f2efe9">${esc(text)}</text></svg>`);

async function cell(input, text, tw, th) {
  const img = await sharp(input).resize(tw, th, { fit: 'contain', background: '#d9d4cc' }).png().toBuffer();
  return sharp({ create: { width: tw, height: th + 34, channels: 3, background: '#d9d4cc' } })
    .composite([{ input: label(tw, text), top: 0, left: 0 }, { input: img, top: 34, left: 0 }]).png().toBuffer();
}

async function sheet(file, cells, cols, tw, th) {
  const rows = Math.ceil(cells.length / cols), gap = 12, ch = th + 34;
  const W = cols * tw + (cols + 1) * gap, H = rows * ch + (rows + 1) * gap;
  const comp = cells.map((input, i) => ({ input, left: gap + (i % cols) * (tw + gap), top: gap + Math.floor(i / cols) * (ch + gap) }));
  await sharp({ create: { width: W, height: H, channels: 3, background: '#b7aa9b' } })
    .composite(comp).jpeg({ quality: 88 }).toFile(path.join(OUT, file));
  return path.join(OUT, file);
}

// source with the crop box outlined, for judging context
async function inContext(src, box, text, tw, th) {
  const m = await meta(src);
  const [x, y, w, h] = box, sw = Math.max(3, Math.round(m.width / 250));
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ff2d55" stroke-width="${sw}"/></svg>`);
  const buf = await sharp(srcPath(src)).composite([{ input: svg }]).png().toBuffer();
  return cell(buf, text, tw, th);
}

async function sheets() {
  mkdir(OUT);
  const made = [];
  const tileCells = [];
  for (const t of TILES) {
    tileCells.push(await inContext(t.src, t.box, `${t.id} ctx`, 360, 400));
    tileCells.push(await cell(await crop(t.src, t.box).png().toBuffer(), `tile-${t.id} ${t.box[2]}x${t.box[3]}`, 360, 450));
  }
  made.push(await sheet('sheet-tiles.jpg', tileCells, 4, 360, 450));

  const storyCells = [];
  for (const s of STORY) {
    storyCells.push(await inContext(s.src, s.box, `${s.id} ctx`, 420, 460));
    storyCells.push(await cell(await crop(s.src, s.box).png().toBuffer(), `${s.id} ${s.box[2]}x${s.box[3]}`, 420, 460));
  }
  made.push(await sheet('sheet-story.jpg', storyCells, 4, 420, 460));

  const ogCells = [], a88Cells = [];
  for (const o of OG) {
    const f = path.join(IMG, 'og', `og-${o.id}.jpg`);
    const input = fs.existsSync(f) ? f : (o.copy ? path.join(IMG, o.copy) : o.att ? (await ogAttention(o.src)).data : await crop(o.src, ogBox(await meta(o.src), o.py)).png().toBuffer());
    ogCells.push(await cell(input, `og-${o.id}${o.src ? ' <- ' + o.src.replace(/\.jpg$/, '') : ''}`, 600, 315));
    if (o.att) {
      // A8.8 sheet: the shipped file beside its source with the attention window outlined
      const m = await meta(o.src), { box, up } = await ogAttention(o.src);
      const a = await cell(input, `og-${o.id}.jpg`, 600, 315);
      const b = await inContext(o.src, box, `${o.src.replace(/\.jpg$/, '')} ${m.width}x${m.height} ${up.toFixed(3)}x`, 300, 315);
      a88Cells.push(await sharp({ create: { width: 912, height: 349, channels: 3, background: '#b7aa9b' } })
        .composite([{ input: a, left: 0, top: 0 }, { input: b, left: 612, top: 0 }]).png().toBuffer());
    }
  }
  made.push(await sheet('sheet-og.jpg', ogCells, 2, 600, 315));
  if (a88Cells.length) made.push(await sheet('sheet-og-a88.jpg', a88Cells, 2, 912, 315));
  if (fs.existsSync(FAVICON.out)) {
    // favicon: the ICO's PNG payload at 1× on paper and on night, and at 8× (nearest) to judge the pixels
    const png = fs.readFileSync(FAVICON.out).subarray(22);
    const on = async (bg, scale, kernel) => sharp(png).resize(48 * scale, 48 * scale, { kernel })
      .flatten({ background: bg }).png().toBuffer();
    const favCells = [
      await cell(await sharp(await on('#f2efe9', 1, 'nearest')).extend({ top: 168, bottom: 168, left: 168, right: 168, background: '#f2efe9' }).png().toBuffer(), 'favicon 48 on paper 1x', 384, 384),
      await cell(await sharp(await on('#1a1613', 1, 'nearest')).extend({ top: 168, bottom: 168, left: 168, right: 168, background: '#1a1613' }).png().toBuffer(), 'favicon 48 on night 1x', 384, 384),
      await cell(await on('#f2efe9', 8, 'nearest'), 'favicon 48 at 8x (nearest)', 384, 384),
    ];
    made.push(await sheet('sheet-favicon.jpg', favCells, 3, 384, 384));
  }

  const lightCells = [];
  for (const l of LIGHT) {
    lightCells.push(await inContext(l.src, l.box, `${l.id} ctx`, 400, 500));
    lightCells.push(await cell(await crop(l.src, l.box).png().toBuffer(), `light/${l.id} ${l.box[2]}x${l.box[3]}`, 400, 500));
  }
  made.push(await sheet('sheet-light.jpg', lightCells, 4, 400, 500));

  // thumbnails: the shipped 144 px file at 2x (what a 2x screen shows at 72 CSS px) beside its window in the source
  const thumbCells = [];
  for (const t of THUMB) {
    const f = path.join(IMG, 'thumb', `${t.id}-${THUMB_PX}.webp`);
    const box = thumbBox(await meta(`${t.id}.jpg`), t.pos);
    thumbCells.push(await inContext(`${t.id}.jpg`, box, `${t.id} ctx`, 288, 288));
    if (fs.existsSync(f)) thumbCells.push(await cell(f, `thumb/${t.id}-${THUMB_PX}`, 288, 288));
  }
  made.push(await sheet('sheet-thumb.jpg', thumbCells, 4, 288, 288));
  return made;
}

// ---------------------------------------------------------------------------------------------
const produced = [];
if (!SHEETS_ONLY) {
  if (want('vein')) produced.push(...await veinDisp());
  if (want('tiles')) produced.push(...await tiles());
  if (want('story')) produced.push(...await story());
  if (want('light')) produced.push(...await light());
  if (want('og')) produced.push(...await og());
  if (want('favicon')) produced.push(...await favicon());
  if (want('thumb')) produced.push(...await thumbs());
  if (want('mid')) produced.push(...await mids());
}
const sheetFiles = await sheets();
for (const f of produced) {
  const m = f.endsWith('.ico') ? { width: FAVICON.size, height: FAVICON.size } : await sharp(f).metadata();
  console.log(`${path.relative(SITE, f)}\t${m.width}x${m.height}\t${(fs.statSync(f).size / 1024).toFixed(1)} KB`);
}
for (const f of sheetFiles) console.log(`sheet\t${path.relative(SITE, f)}`);
for (const w of warnings) console.warn(`WARN ${w}`);
