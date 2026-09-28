#!/usr/bin/env node
// P7 media QA (SPEC §8 P7 acceptance, §10, §1.2 rule 4). Independent of films.mjs / stills.mjs:
// it only reads the shipped files under assets/ and the source renders, never writes under assets/.
//
//   node tools/media/qa-media.mjs            checks + verify-*.jpg contact sheets in tools/media/out/
//
// Checks:
//   films   existence of every §10 variant (mp4, webm, poster jpg+webp at 1080 and 720); clean decode;
//           codec (H.264 High / VP9); dims; SAR 1:1; no audio; duration; exact frame count; budget;
//           loop seam (full-film luma difference curve: the wrap last→first must look like any other step);
//           no grading (frame 0 colour statistics vs the source crop); poster = the §10 poster frame (not
//           frame 0, not from the plate directly above the film), in Chrome too.
//   hero    re-encoded mp4s SAR 1:1 + same duration as the WebMs; untouched hero-16x9 files; WebP posters.
//   stills  tile 4:5 at native size; story strips' aspect + upscale at their CSS display width;
//           OG 1200×630 + upscale (SPEC §10 + the 17 of Addendum A8.8; og-approach must be absent);
//           light crops 4:5 + upscale; vein map 512²; row thumbnails (assets/img/thumb/<id>-144.webp): 144²,
//           ≤ 8 KB, pixels = the row's `--pos` 1:1 window of its render, and no stray files in thumb/.
//   favicon /favicon.ico: a single-image ICO whose PNG payload decodes at 48 × 48 (A8.8).
// Modules (sharp, ffmpeg-static) resolve from $SELE_TOOLS, defaulting to the scratchpad tools folder.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const TOOLS = process.env.SELE_TOOLS ||
  '/private/tmp/claude-501/-Users-tohargueta-Library-CloudStorage-OneDrive-YouCCTechnologies-Desktop-Systems-YouCC-lion8/bb4e0756-6dc9-4593-9e3c-84596b23b1d1/scratchpad/tools';
const require = createRequire(path.join(path.resolve(TOOLS), 'node_modules', '_'));
const sharp = require('sharp');
const FF = require('ffmpeg-static');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..', '..');
const IMG = path.join(SITE, 'assets/img');
const VID = path.join(SITE, 'assets/video');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MB = 1_000_000, KB = 1000, FPS = 30;

const problems = [], notes = [];
const fail = (m) => { problems.push(m); console.log('FAIL', m); };
const pass = (m) => console.log('ok  ', m);
const rel = (f) => path.relative(SITE, f);
const size = (f) => fs.statSync(f).size;
const ffRun = (args, opts = {}) => spawnSync(FF, ['-hide_banner', ...args], { maxBuffer: 1 << 30, ...opts });
// A raw-video decode that must yield bytes. Under heavy machine load a spawn can come back empty (killed or
// failed to start), which used to crash the run far from the cause; retry, then fail loudly with the reason.
function ffRaw(args) {
  let r;
  for (let i = 0; i < 4; i++) {
    r = ffRun(args);
    if (!r.error && r.status === 0 && r.stdout?.length) return r;
  }
  throw new Error(`ffmpeg ${args.join(' ')} → no output (status ${r.status}, signal ${r.signal}, ${r.error?.code || r.error || String(r.stderr || '').trim().slice(0, 200)})`);
}

// ---------------------------------------------------------------------------------------------
// §10 film table (what must exist). src/crop = shot 0, used for the no-grading check on frame 0.
// posterT/posterShot = §10 (amended): the poster is the loop frame at posterT s, inside the clean part of
// posterShot, never frame 0. `above` = the render shown directly above the film on its case page
// (data/projects.mjs, last plate); the poster must not come from it (the plate would repeat on mobile).
const FILMS = [
  { name: 'case-kitchen-4x5', dur: 13.2, L: 5.6, s0: { z: [1.00, 1.06], fx: [0.30, 0.45], fy: [0.50, 0.44] }, b1080: { webm: 1.4 * MB, mp4: 2.2 * MB }, b720: { webm: 0.8 * MB, mp4: 1.2 * MB },
    posterShot: 2, posterT: 9.3, above: 'kitchen-stone-03.jpg',
    shots: [['kitchen-stone-02.jpg', [959, 1199, 176, 0], 1.06], ['kitchen-stone-03.jpg', [959, 1199, 353, 0], 1.06], ['kitchen-stone-01.jpg', [959, 1199, 240, 0], 1.06]] },
  { name: 'case-living-4x5', dur: 13.2, L: 5.6, s0: { z: [1.04, 1.04], fx: [0.5, 0.5], fy: [0.30, 0.70] }, b1080: { webm: 1.4 * MB, mp4: 2.2 * MB }, b720: { webm: 0.8 * MB, mp4: 1.2 * MB },
    posterShot: 2, posterT: 9.3, above: 'living-02.jpg',
    shots: [['living-02.jpg', [1117, 1396, 0, 6], 1.04], ['living-03.jpg', [1099, 1374, 23, 0], 1.06], ['living-04.jpg', [959, 1199, 300, 0], 1.06]] },
  // §10 gives no 720 budget for the 7.6 s films; the 1080 budget is the hard ceiling for them.
  { name: 'bath-threshold-4x5', dur: 7.6, L: 5.0, s0: { z: [1.00, 1.12], fx: [0.5, 0.5], fy: [0.50, 0.44] }, b1080: { webm: 1.0 * MB, mp4: 1.6 * MB }, b720: { webm: 1.0 * MB, mp4: 1.6 * MB },
    posterShot: 1, posterT: 4.3, above: 'bath-02.jpg',
    shots: [['bath-02.jpg', [1024, 1280, 0, 128], 1.12], ['bath-01.jpg', [1112, 1390, 10, 0], 1.10]] },
  { name: 'case-bedroom-4x5', dur: 7.6, L: 5.0, s0: { z: [1.00, 1.06], fx: [0.5, 0.5], fy: [0.55, 0.47] }, b1080: { webm: 1.0 * MB, mp4: 1.6 * MB }, b720: { webm: 1.0 * MB, mp4: 1.6 * MB },
    posterShot: 0, posterT: 2.3, above: 'bedroom-02.jpg',
    shots: [['bedroom-01.jpg', [959, 1199, 176, 0], 1.06], ['bedroom-02.jpg', [1064, 1330, 60, 0], 1.06]] },
];
const SIZES = [{ w: 1080, h: 1350, sfx: '' }, { w: 720, h: 900, sfx: '-720' }];

function probe(file) {
  const e = ffRun(['-i', file], { encoding: 'utf8' }).stderr;
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(e);
  const v = /Stream #\S+.*Video: (\w+)(?: \((\w[\w ]*)\))?.*?, (\d+)x(\d+)/.exec(e);
  const sar = /SAR (\d+):(\d+)/.exec(e);
  return {
    dur: d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : NaN, codec: v?.[1], profile: v?.[2], w: +v?.[3], h: +v?.[4],
    sar: sar ? `${sar[1]}:${sar[2]}` : 'unset', audio: /Audio:/.test(e),
    colour: (/Video: .*?yuv420p\(([^)]*)\)/.exec(e)?.[1] || '').replace(/,?\s*progressive/, '') || 'untagged',
  };
}

// Decode the whole clip to small grey frames: clean-decode check, frame count, and a difference curve.
function lumaFrames(file, w = 96, h = 120) {
  const r = ffRaw(['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-']);
  const n = Math.floor(r.stdout.length / (w * h));
  const frames = Array.from({ length: n }, (_, i) => r.stdout.subarray(i * w * h, (i + 1) * w * h));
  return { frames, err: r.stderr.toString().trim() };
}
const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const pct = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

// ffmpeg 6 ignores the stream's matrix tag when converting to RGB, so pass it explicitly.
function frameAt(file, n, w, h) {
  const m = /bt709/.test(probe(file).colour) ? 'bt709' : 'bt601';
  const r = ffRaw(['-v', 'error', '-i', file, '-vf', `select=eq(n\\,${n}),scale=${w}:${h}:flags=lanczos+accurate_rnd+full_chroma_int:in_color_matrix=${m}:in_range=tv,format=rgb24`, '-frames:v', '1', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-']);
  return sharp(r.stdout, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

async function checkVideo(file, { w, h, dur, budget, kind, tags = true }) {
  if (!fs.existsSync(file)) return fail(`${rel(file)} missing`);
  const p = probe(file);
  const { frames, err } = lumaFrames(file);
  const exp = Math.round(dur * FPS);
  const errs = [];
  if (err) errs.push('decode: ' + err.slice(0, 160));
  if (kind === 'mp4' && !(p.codec === 'h264' && p.profile === 'High')) errs.push(`codec ${p.codec} ${p.profile}`);
  if (kind === 'webm' && p.codec !== 'vp9') errs.push(`codec ${p.codec}`);
  if (p.w !== w || p.h !== h) errs.push(`dims ${p.w}x${p.h}`);
  if (p.sar !== '1:1') errs.push(`SAR ${p.sar}`);
  if (p.audio) errs.push('audio track');
  if (tags && !/bt709\/bt709\/iec61966-2-1/.test(p.colour)) errs.push(`colour tags "${p.colour}" (want bt709/bt709/iec61966-2-1)`);
  if (Math.abs(p.dur - dur) > 0.1) errs.push(`duration ${p.dur}`);
  if (frames.length !== exp) errs.push(`frames ${frames.length}≠${exp}`);
  if (budget && size(file) > budget) errs.push(`size ${size(file)} > ${budget}`);
  // Loop seam: the wrap step must not stand out from the steps around it.
  const steps = frames.slice(1).map((f, i) => mad(frames[i], f));
  const wrap = mad(frames[frames.length - 1], frames[0]);
  const around = Math.max(...steps.slice(0, 6), ...steps.slice(-6));
  const p95 = pct(steps, 0.95), mx = Math.max(...steps);
  if (wrap > Math.max(2 * around, 1.5 * p95, 1.0)) errs.push(`loop seam jump ${wrap.toFixed(2)} (neighbours ≤ ${around.toFixed(2)}, p95 ${p95.toFixed(2)})`);
  if (mx > Math.max(4 * p95, 6)) errs.push(`hard cut inside the film: max step ${mx.toFixed(2)} vs p95 ${p95.toFixed(2)}`);
  const msg = `${rel(file)} ${size(file)} B ${p.w}x${p.h} [${p.colour}] ${p.codec}${p.profile ? '/' + p.profile : ''} SAR ${p.sar} ${p.dur}s ${frames.length}f seam ${wrap.toFixed(2)} (nbr ${around.toFixed(2)}, p95 ${p95.toFixed(2)}, max ${mx.toFixed(2)})`;
  errs.length ? fail(`${msg} ← ${errs.join('; ')}`) : pass(msg);
  return frames.length;
}

async function checkImage(file, { w, h, maxBytes, fmt }) {
  if (!fs.existsSync(file)) return fail(`${rel(file)} missing`);
  const m = await sharp(file).metadata();
  const errs = [];
  if (w && (m.width !== w || m.height !== h)) errs.push(`dims ${m.width}x${m.height} ≠ ${w}x${h}`);
  if (fmt && m.format !== fmt) errs.push(`format ${m.format}`);
  if (maxBytes && size(file) > maxBytes) errs.push(`size ${size(file)} > ${maxBytes}`);
  const msg = `${rel(file)} ${m.width}x${m.height} ${m.format} ${size(file)} B`;
  errs.length ? fail(`${msg} ← ${errs.join('; ')}`) : pass(msg);
  return m;
}

// Colour statistics (mean + std per channel) of an RGB buffer/file.
async function stats(input) { const s = await sharp(input).removeAlpha().stats(); return s.channels.map((c) => [c.mean, c.stdev]); }

// ---------------------------------------------------------------------------------------------
// Contact-sheet helpers (sheets live in tools/media/out/ only).
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const labelSvg = (w, t, hgt = 26) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}"><rect width="100%" height="100%" fill="#1a1613"/><text x="6" y="${hgt - 8}" font-family="Helvetica,Arial" font-size="14" fill="#f2efe9">${esc(t)}</text></svg>`);
async function cell(input, text, tw, th, kernel = 'lanczos3') {
  const img = await sharp(input).resize(tw, th, { fit: 'contain', background: '#ff00ff', kernel }).png().toBuffer();
  return sharp({ create: { width: tw, height: th + 26, channels: 3, background: '#ff00ff' } })
    .composite([{ input: labelSvg(tw, text), top: 0, left: 0 }, { input: img, top: 26, left: 0 }]).png().toBuffer();
}
async function sheet(file, cells, cols, tw, th) {
  const gap = 10, ch = th + 26, rows = Math.ceil(cells.length / cols);
  const W = cols * tw + (cols + 1) * gap, H = rows * ch + (rows + 1) * gap;
  await sharp({ create: { width: W, height: H, channels: 3, background: '#8c8177' } })
    .composite(cells.map((input, i) => ({ input, left: gap + (i % cols) * (tw + gap), top: gap + Math.floor(i / cols) * (ch + gap) })))
    .jpeg({ quality: 90 }).toFile(path.join(OUT, file));
  console.log('sheet', rel(path.join(OUT, file)));
}

// ---------------------------------------------------------------------------------------------
async function films() {
  const cells = [];
  for (const f of FILMS) {
    // Zoom ceiling from the §10 table (1080 output ÷ crop × max zoom).
    for (const [src, c, zmax] of f.shots) {
      const m = await sharp(path.join(IMG, src)).metadata();
      if (c[2] + c[0] > m.width || c[3] + c[1] > m.height) fail(`${f.name}: crop ${c} outside ${src}`);
      const up = Math.max(1080 / c[0], 1350 / c[1]) * zmax;
      up > 1.2 + 1e-9 ? fail(`${f.name}: ${src} upscale ${up.toFixed(3)} > 1.20`) : pass(`${f.name}: ${src} upscale ${up.toFixed(3)}`);
    }
    let N = 0;
    for (const S of SIZES) {
      const base = path.join(VID, f.name + S.sfx);
      const b = S.w === 1080 ? f.b1080 : f.b720;
      for (const kind of ['mp4', 'webm']) {
        const n = await checkVideo(`${base}.${kind}`, { w: S.w, h: S.h, dur: f.dur, budget: b[kind], kind });
        if (S.w === 1080 && kind === 'mp4') N = n;
      }
      await checkImage(`${base}-poster.jpg`, { w: S.w, h: S.h, fmt: 'jpeg' });
      await checkImage(`${base}-poster.webp`, { w: S.w, h: S.h, fmt: 'webp' });
    }
    const mp4 = path.join(VID, f.name + '.mp4');
    // No grading: frame 0 vs the same window of the source render. Frame 0 is shot 0 at on = 1.2 s·30
    // (the loop is trimmed from the crossfade length), so reconstruct its zoompan window on the crop.
    const [src, c] = f.shots[0];
    const N0 = Math.round(f.L * FPS), on = Math.round(1.2 * FPS), E = 0.5 - 0.5 * Math.cos(Math.PI * on / (N0 - 1));
    const lerp = ([a, b]) => a + (b - a) * E;
    const z = lerp(f.s0.z), vw = c[0] / z, vh = c[1] / z;
    const win = { left: Math.round(c[2] + (c[0] - vw) * lerp(f.s0.fx)), top: Math.round(c[3] + (c[1] - vh) * lerp(f.s0.fy)), width: Math.round(vw), height: Math.round(vh) };
    const ref = await sharp(path.join(IMG, src)).extract(win).resize(270, 338).png().toBuffer();
    fs.writeFileSync(path.join(OUT, `verify-ref-${f.name}.png`), ref); // for the in-browser check
    const f0 = await frameAt(mp4, 0, 270, 338);
    const [a, bb] = [await stats(ref), await stats(f0)];
    const dMean = Math.max(...a.map((ch, i) => Math.abs(ch[0] - bb[i][0])));
    const dStd = Math.max(...a.map((ch, i) => Math.abs(ch[1] - bb[i][1])));
    dMean > 2 || dStd > 2 ? fail(`${f.name}: frame 0 colour differs from ${src} (Δmean ${dMean.toFixed(2)}, Δstd ${dStd.toFixed(2)})`)
      : pass(`${f.name}: frame 0 matches ${src} colour (Δmean ${dMean.toFixed(2)}, Δstd ${dStd.toFixed(2)})`);
    // Poster = the §10 poster frame, from a clean stretch of a shot whose render is not the plate above.
    const D = 1.2, k = f.posterShot, pn = Math.round(f.posterT * FPS);
    const [lo, hi] = k === 0 ? [0, f.L - 2 * D] : [k * (f.L - D), (k + 1) * (f.L - D) - D];
    f.posterT < lo || f.posterT > hi ? fail(`${f.name}: poster t ${f.posterT}s outside shot ${k}'s clean span [${lo.toFixed(1)}, ${hi.toFixed(1)}]`)
      : pass(`${f.name}: poster t ${f.posterT}s (frame ${pn}) inside shot ${k}'s clean span`);
    f.shots[k][0] === f.above ? fail(`${f.name}: poster comes from ${f.above}, the plate directly above the film`)
      : pass(`${f.name}: poster render ${f.shots[k][0]} ≠ plate above (${f.above})`);
    const pj = await sharp(path.join(VID, f.name + '-poster.jpg')).resize(270, 338).png().toBuffer();
    const grey = async (b) => sharp(b).greyscale().raw().toBuffer();
    const pd = mad(await grey(pj), await grey(await frameAt(mp4, pn, 270, 338)));
    pd > 3 ? fail(`${f.name}: poster is not frame ${pn} (|Δ| ${pd.toFixed(2)})`) : pass(`${f.name}: poster = frame ${pn} (|Δ| ${pd.toFixed(2)})`);
    const p0 = mad(await grey(pj), await grey(f0));
    p0 < 8 ? fail(`${f.name}: poster too close to frame 0 (|Δ| ${p0.toFixed(2)})`) : pass(`${f.name}: poster ≠ frame 0 (|Δ| ${p0.toFixed(2)})`);
    // Sheet row: first, ¼, ½, ¾, last frame, then the seam pair (last | first) side by side, then the posters.
    const picks = [0, Math.round((N - 1) / 4), Math.round((N - 1) / 2), Math.round((3 * (N - 1)) / 4), N - 1];
    for (const n of picks) cells.push(await cell(await frameAt(mp4, n, 270, 338), `${f.name.replace('-4x5', '')} f${n}`, 216, 270));
    cells.push(await cell(path.join(VID, f.name + '-poster.webp'), 'poster.webp', 216, 270));
    cells.push(await cell(await frameAt(path.join(VID, f.name + '-720.webm'), 0, 270, 338), '720.webm f0', 216, 270));
  }
  // hero rows (re-encoded mp4s)
  for (const S of SIZES) {
    const mp4 = path.join(VID, `hero-4x5${S.sfx}.mp4`);
    const webm = path.join(VID, `hero-4x5${S.sfx}.webm`);
    const wd = probe(webm).dur;
    await checkVideo(mp4, { w: S.w, h: S.h, dur: wd, kind: 'mp4', tags: false }); // re-encoded as today (§10)
  }
  const hm = path.join(VID, 'hero-4x5.mp4'); const hn = Math.round(probe(hm).dur * FPS);
  for (const n of [0, Math.round((hn - 1) / 4), Math.round((hn - 1) / 2), Math.round((3 * (hn - 1)) / 4), hn - 1])
    cells.push(await cell(await frameAt(hm, n, 270, 338), `hero-4x5 f${n}`, 216, 270));
  cells.push(await cell(path.join(VID, 'hero-4x5-poster.webp'), 'hero poster.webp', 216, 270));
  cells.push(await cell(path.join(VID, 'hero-4x5-720-poster.webp'), 'hero 720 poster.webp', 216, 270));
  await sheet('verify-films.jpg', cells, 7, 216, 270);

  // Seam close-up: last frame | first frame at 540 px for every film.
  const seam = [];
  for (const f of FILMS) {
    const mp4 = path.join(VID, f.name + '.mp4'); const N = Math.round(f.dur * FPS);
    seam.push(await cell(await frameAt(mp4, N - 2, 432, 540), `${f.name} f${N - 2}`, 432, 540));
    seam.push(await cell(await frameAt(mp4, N - 1, 432, 540), `${f.name} LAST f${N - 1}`, 432, 540));
    seam.push(await cell(await frameAt(mp4, 0, 432, 540), `${f.name} FIRST f0`, 432, 540));
  }
  await sheet('verify-seams.jpg', seam, 3, 432, 540);
}

async function hero() {
  // Files that must be untouched (sizes from SPEC §10 and the committed originals).
  const keep = { 'hero-16x9.webm': 1551519, 'hero-16x9.mp4': 3343753 };
  for (const [f, b] of Object.entries(keep)) {
    const p = path.join(VID, f);
    size(p) === b ? pass(`${f} untouched (${b} B)`)
      : fail(`${f} changed: ${size(p)} B ≠ ${b} [now ${probe(p).colour}] (SPEC §10: must not be touched; restore with git checkout, or the lead accepts the new file and updates this map)`);
  }
  const p = probe(path.join(VID, 'hero-16x9.webm')); Math.abs(p.dur - 21.5) < 0.05 ? pass('hero-16x9.webm 21.5 s') : fail(`hero-16x9.webm ${p.dur}s`);
  await checkImage(path.join(VID, 'hero-16x9-poster.webp'), { w: 1600, h: 900, fmt: 'webp', maxBytes: 90 * KB });
  await checkImage(path.join(VID, 'hero-16x9-poster-1024.webp'), { w: 1024, h: 576, fmt: 'webp' });
  await checkImage(path.join(VID, 'hero-4x5-poster.webp'), { w: 1080, h: 1350, fmt: 'webp' });
  await checkImage(path.join(VID, 'hero-4x5-720-poster.webp'), { w: 720, h: 900, fmt: 'webp', maxBytes: 45 * KB });
}

// ---------------------------------------------------------------------------------------------
const TILE_IDS = ['stone', 'light-oak', 'travertine', 'walnut', 'linen', 'dark-oak'];
const STORY = [['ny-marble', 1, 3, 132], ['studio-stone', 1, 3, 132], ['ny-bronze', 1, 3, 132], ['studio-bronze', 1, 3, 132], ['ny-oak', 4, 1, 360], ['studio-oak', 4, 1, 360]];
// SPEC §10 (minus approach) + Addendum A8.8 → id: source (null = copy of og.jpg). Sources under assets/img
// unless prefixed 'video/' (assets/video).
const OG_SRC = { home: null, projects: 'kitchen-stone-02', 'stone-oak-kitchen': 'kitchen-stone-01', 'oak-living-room': 'living-01',
  'travertine-bathroom': 'bath-01', 'dark-oak-bedroom': 'bedroom-01', 'dark-oak-kitchen': 'kitchen-dark-01',
  studio: 'bath-02', contact: 'kitchen-stone-03',
  services: 'living-04', journal: 'living-03', film: 'video/hero-16x9-poster',
  'service-interior-design': 'living-01', 'service-space-planning': 'bedroom-01', 'service-kitchen-design': 'kitchen-stone-01',
  'service-bathroom-design': 'bath-01', 'service-renovation-management': 'living-02', 'service-3d-visualization': 'video/hero-16x9-poster',
  'journal-how-to-choose-interior-designer': 'kitchen-stone-02', 'journal-interior-designer-vs-architect': 'bedroom-02',
  'journal-interior-design-cost': 'kitchen-stone-01', 'journal-choosing-kitchen-stone': 'kitchen-stone-02',
  'journal-travertine-guide': 'bath-01', 'journal-home-lighting-design': 'kitchen-stone-03',
  'journal-custom-carpentry-guide': 'living-01', 'journal-warm-minimalism': 'bedroom-01' };
const OG_PAGES = Object.keys(OG_SRC);
const OG_A88 = OG_PAGES.slice(OG_PAGES.indexOf('services'));
// Portrait sources the spec itself names that cannot meet the 1.07× OG limit (no larger original exists).
// They are reported, not failed, as long as they stay under the §1.2 rule-4 ceiling of 1.20×.
const OG_SPEC_MANDATED = {
  studio: 'SPEC §10 names bath-02 (1024 px wide)',
  'dark-oak-kitchen': 'SPEC §10 names kitchen-dark-01 (1023 px wide)',
  'service-renovation-management': 'A8.8 names living-02 (1117 px wide) as the in-limit alternative to built-01',
};
// Row thumbnails (72 CSS px 1:1 frames on Services S2 + Home H4): id → the row's --pos (object-position).
const THUMB = { 'living-01': [0.50, 0.40], 'living-02': [0.50, 0.45], 'kitchen-stone-01': [0.50, 0.55], 'bath-01': [0.50, 0.35],
  'built-01': [0.50, 0.42], 'living-03': [0.50, 0.40], 'bedroom-01': [0.55, 0.55], 'kitchen-dark-01': [0.50, 0.38] };
const THUMB_PX = 144, THUMB_MAX = 8 * KB;
const LIGHT = ['stone-oak-kitchen', 'oak-living-room', 'travertine-bathroom', 'dark-oak-bedroom', 'dark-oak-kitchen'];

async function stills() {
  await checkImage(path.join(IMG, 'fx/vein-disp.jpg'), { w: 512, h: 512, fmt: 'jpeg' });

  const tcells = [];
  for (const id of TILE_IDS) {
    const f = path.join(IMG, `materials/tile-${id}`);
    const m = await checkImage(f + '.webp', { fmt: 'webp' });
    await checkImage(f + '.jpg', { w: m?.width, h: m?.height, fmt: 'jpeg' });
    if (m && m.width * 5 !== m.height * 4) fail(`tile-${id} ${m.width}x${m.height} is not 4:5`);
    // shown at 2× with nearest-neighbour so slivers at the edges stay visible
    tcells.push(await cell(f + '.jpg', `tile-${id} ${m?.width}x${m?.height}`, 384, 480, 'nearest'));
  }
  await sheet('verify-tiles.jpg', tcells, 3, 384, 480);

  const scells = [];
  for (const [id, aw, ah, cssW] of STORY) {
    const f = path.join(IMG, `story/${id}`);
    const m = await checkImage(f + '.webp', { fmt: 'webp' });
    await checkImage(f + '.jpg', { w: m?.width, h: m?.height, fmt: 'jpeg' });
    if (m && m.width * ah !== m.height * aw) fail(`story ${id} ${m.width}x${m.height} is not ${aw}:${ah}`);
    const up = m ? cssW / m.width : 0; // displayed at clamp(84px, 9vw, 132px) (1:3) / min(100%, 360px) (4:1)
    up > 1.2 + 1e-9 ? fail(`story ${id}: ${m.width}px shown at ${cssW} CSS px = ${up.toFixed(3)}× > 1.2`) : pass(`story ${id}: max upscale ${up.toFixed(3)}×`);
    scells.push(aw < ah ? await cell(f + '.jpg', `${id} ${m?.width}x${m?.height}`, 200, 600) : await cell(f + '.jpg', `${id} ${m?.width}x${m?.height}`, 620, 155));
  }
  // 1:3 strips on one sheet (tall), 4:1 on another (wide)
  await sheet('verify-story.jpg', scells.slice(0, 4), 4, 200, 600);
  await sheet('verify-story-wide.jpg', scells.slice(4), 1, 620, 155);

  // A cover crop at 1200:630 of a portrait render keeps the full width, so upscale = 1200 / width.
  const ocells = [];
  for (const id of OG_PAGES) {
    const f = path.join(IMG, `og/og-${id}.jpg`);
    await checkImage(f, { w: 1200, h: 630, fmt: 'jpeg' });
    const src = OG_SRC[id];
    if (src) {
      const sf = src.startsWith('video/') ? path.join(SITE, 'assets', src + '.jpg') : path.join(IMG, src + '.jpg');
      const m = await sharp(sf).metadata();
      const up = Math.max(1200 / m.width, 630 / m.height);
      const tag = `og-${id}: ${src} ${m.width}x${m.height} upscale ${up.toFixed(3)}x`;
      if (up > 1.2 + 1e-9) fail(`${tag} > 1.20 (SPEC §1.2 rule 4)`);
      else if (m.height > m.width && up > 1.07 + 1e-9) {
        if (OG_SPEC_MANDATED[id]) { notes.push(`${tag} > 1.07 (SPEC §10): ${OG_SPEC_MANDATED[id]}`); pass(`${tag} (spec-mandated source, see note)`); }
        else fail(`${tag} > 1.07 (SPEC §10)`);
      } else pass(tag);
      // A8.8 files are attention crops of their named source: their pixels must come from it.
      if (OG_A88.includes(id)) {
        const k = Math.max(1200 / m.width, 630 / m.height);
        const { data, info } = await sharp(sf).resize(1200, 630, { fit: 'cover', position: 'attention' }).raw().toBuffer({ resolveWithObject: true });
        const shipped = await sharp(f).removeAlpha().raw().toBuffer();
        const d = mad(data, shipped);
        d > 3 ? fail(`og-${id}: pixels differ from the attention crop of ${src} (|Δ| ${d.toFixed(2)})`)
          : pass(`og-${id}: = attention crop of ${src} (|Δ| ${d.toFixed(2)}, window ${Math.round(-info.cropOffsetLeft / k)},${Math.round(-info.cropOffsetTop / k)})`);
      }
    } else {
      fs.readFileSync(f).equals(fs.readFileSync(path.join(IMG, 'og.jpg'))) ? pass(`og-${id} = og.jpg`) : fail(`og-${id} is not a copy of og.jpg`);
    }
    ocells.push(await cell(f, `og-${id}`, 600, 315));
  }
  const ogFiles = fs.readdirSync(path.join(IMG, 'og')).filter((x) => x.endsWith('.jpg'));
  const extra = ogFiles.filter((x) => !OG_PAGES.includes(x.replace(/^og-|\.jpg$/g, '')));
  extra.length ? fail(`unexpected OG files (A8.8: og-approach is not produced): ${extra.join(', ')}`) : pass(`assets/img/og holds exactly the ${OG_PAGES.length} expected files (${OG_A88.length} from A8.8)`);
  await sheet('verify-og.jpg', ocells, 3, 600, 315);

  const lcells = [];
  for (const id of LIGHT) {
    const f = path.join(IMG, `light/${id}`);
    if (!fs.existsSync(f + '.webp') && !fs.existsSync(f + '.jpg')) { fail(`assets/img/light/${id}.webp|jpg missing (SPEC §4.1, §5.3 light study: a P7 crop)`); continue; }
    const m = await checkImage(f + '.webp', { fmt: 'webp' });
    await checkImage(f + '.jpg', { w: m?.width, h: m?.height, fmt: 'jpeg' });
    if (m && m.width * 5 !== m.height * 4) fail(`light/${id} ${m.width}x${m.height} is not 4:5`);
    lcells.push(await cell(f + '.jpg', `light/${id} ${m?.width}x${m?.height}`, 400, 500));
  }
  if (lcells.length) await sheet('verify-light.jpg', lcells, 5, 400, 500);

  const thcells = [];
  for (const [id, [px, py]] of Object.entries(THUMB)) {
    const f = path.join(IMG, `thumb/${id}-${THUMB_PX}.webp`);
    const m = await checkImage(f, { w: THUMB_PX, h: THUMB_PX, maxBytes: THUMB_MAX, fmt: 'webp' });
    if (!m) continue;
    // independent reference: the 1:1 object-position window of the source render, resampled to 144²
    const sf = path.join(IMG, `${id}.jpg`), sm = await sharp(sf).metadata(), side = Math.min(sm.width, sm.height);
    const ref = await sharp(sf).extract({ left: Math.round((sm.width - side) * px), top: Math.round((sm.height - side) * py), width: side, height: side })
      .resize(THUMB_PX, THUMB_PX).removeAlpha().raw().toBuffer();
    const d = mad(ref, await sharp(f).removeAlpha().raw().toBuffer());
    d > 4 ? fail(`thumb/${id}: pixels differ from the --pos ${Math.round(px * 100)}% ${Math.round(py * 100)}% window of ${id}.jpg (|Δ| ${d.toFixed(2)})`)
      : pass(`thumb/${id}: = --pos ${Math.round(px * 100)}% ${Math.round(py * 100)}% window of ${id}.jpg (|Δ| ${d.toFixed(2)}, downscale ${(side / THUMB_PX).toFixed(2)}x)`);
    thcells.push(await cell(f, `thumb/${id}`, 288, 288, 'nearest'));
  }
  const thumbDir = path.join(IMG, 'thumb');
  const strayThumbs = fs.existsSync(thumbDir) ? fs.readdirSync(thumbDir).filter((x) => !Object.keys(THUMB).some((id) => x === `${id}-${THUMB_PX}.webp`)) : [];
  strayThumbs.length ? fail(`unexpected files in assets/img/thumb: ${strayThumbs.join(', ')}`) : pass(`assets/img/thumb holds exactly the ${Object.keys(THUMB).length} expected files`);
  if (thcells.length) await sheet('verify-thumb.jpg', thcells, 4, 288, 288);
}

// ---------------------------------------------------------------------------------------------
// /favicon.ico (A8.8): ICONDIR + one ICONDIRENTRY + a PNG payload that decodes at 48 × 48.
async function favicon() {
  const f = path.join(SITE, 'favicon.ico');
  if (!fs.existsSync(f)) return fail('favicon.ico missing');
  const b = fs.readFileSync(f), errs = [];
  if (b.readUInt16LE(0) !== 0 || b.readUInt16LE(2) !== 1) errs.push('not an ICO header');
  if (b.readUInt16LE(4) !== 1) errs.push(`${b.readUInt16LE(4)} images (want 1)`);
  const [w, h, bpp, len, off] = [b.readUInt8(6), b.readUInt8(7), b.readUInt16LE(12), b.readUInt32LE(14), b.readUInt32LE(18)];
  if (w !== 48 || h !== 48) errs.push(`directory says ${w}x${h}`);
  if (off + len !== b.length) errs.push(`payload ${off}+${len} ≠ file ${b.length}`);
  const png = b.subarray(off, off + len);
  if (!png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) errs.push('payload is not PNG');
  let m = {};
  try { m = await sharp(png).metadata(); } catch (e) { errs.push('PNG does not decode: ' + e.message); }
  if (m.width !== 48 || m.height !== 48) errs.push(`PNG is ${m.width}x${m.height}`);
  const msg = `favicon.ico ${b.length} B, 1 image ${w}x${h} ${bpp}bpp, PNG ${m.width}x${m.height} ${m.channels}ch`;
  errs.length ? fail(`${msg} ← ${errs.join('; ')}`) : pass(msg);
  // Chrome's own ICO decoder (served by the local preview server when it is up).
  const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let puppeteer; try { puppeteer = require('puppeteer-core'); } catch { return notes.push('favicon browser check skipped: no puppeteer-core'); }
  if (!fs.existsSync(CHROME)) return notes.push('favicon browser check skipped: no Chrome');
  const br = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  try {
    const page = await br.newPage();
    await page.goto('file://' + OUT + '/');
    const dim = await page.evaluate(async (u) => { const i = new Image(); i.src = u; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, 'file://' + f);
    dim[0] === 48 && dim[1] === 48 ? pass(`favicon.ico opens in Chrome as ${dim.join(' × ')}`) : fail(`favicon.ico opens in Chrome as ${dim.join(' × ')}`);
  } finally { await br.close(); }
}

// ---------------------------------------------------------------------------------------------
// In-browser colour: what Chrome paints for frame 0 of each variant vs the render window, and for the
// poster vs the same variant seeked to the poster time.
// Skipped (with a note) when Chrome or puppeteer-core is not available.
async function browserColour() {
  const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let puppeteer; try { puppeteer = require('puppeteer-core'); } catch { notes.push('browser colour check skipped: no puppeteer-core'); return; }
  if (!fs.existsSync(CHROME)) { notes.push('browser colour check skipped: no Chrome at ' + CHROME); return; }
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await b.newPage();
  await page.goto('file://' + OUT + '/');
  const paint1 = (file, t = 0) => page.evaluate(async (u, t) => {
    let el;
    if (/\.(jpg|webp|png)$/.test(u)) { el = new Image(); el.src = u; await el.decode(); }
    else {
      el = document.createElement('video'); el.muted = true; el.preload = 'auto'; el.src = u;
      await new Promise((res, rej) => { el.onloadeddata = res; el.onerror = () => rej(new Error(`video error ${el.error?.code} ${el.error?.message || ''} (${u})`)); });
      await new Promise((r) => { el.onseeked = r; el.currentTime = t + 0.001; });
      await new Promise((r) => setTimeout(r, 250));
    }
    const c = document.createElement('canvas'); c.width = 270; c.height = 338;
    const x = c.getContext('2d'); x.drawImage(el, 0, 0, 270, 338);
    const d = x.getImageData(0, 0, 270, 338).data; const m = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; }
    return m.map((v) => v / (d.length / 4));
  }, 'file://' + file, t);
  // A media-pipeline error under heavy machine load is transient; retry before failing the run.
  const paint = async (file, t = 0) => {
    for (let i = 0; ; i++) {
      try { return await paint1(file, t); } catch (e) { if (i >= 2) throw e; await new Promise((r) => setTimeout(r, 1000)); }
    }
  };
  const dmax = (a, b2) => Math.max(...a.map((v, i) => Math.abs(v - b2[i])));
  try {
    for (const f of FILMS) {
      const ref = await paint(path.join(OUT, `verify-ref-${f.name}.png`));
      const poster = await paint(path.join(VID, f.name + '-poster.jpg'));
      for (const v of ['.mp4', '.webm', '-720.mp4', '-720.webm']) {
        const f0 = await paint(path.join(VID, f.name + v));
        const d0 = dmax(f0, ref);
        d0 > 2 ? fail(`${f.name}${v} frame 0 in Chrome differs from the render window by ${d0.toFixed(2)}`) : pass(`${f.name}${v} frame 0 in Chrome ≈ render window (Δ ${d0.toFixed(2)})`);
        const fr = await paint(path.join(VID, f.name + v), f.posterT);
        const d = dmax(fr, poster);
        d > 1.0 ? fail(`${f.name}${v} at ${f.posterT}s in Chrome differs from its poster by ${d.toFixed(2)} (RGB ${fr.map((x) => x.toFixed(1))} vs ${poster.map((x) => x.toFixed(1))})`)
          : pass(`${f.name}${v} at ${f.posterT}s in Chrome = poster (Δ ${d.toFixed(2)})`);
      }
    }
    for (const v of ['hero-4x5.mp4', 'hero-4x5.webm']) {
      const d = dmax(await paint(path.join(VID, v)), await paint(path.join(VID, 'hero-4x5-poster.jpg')));
      notes.push(`${v} [${probe(path.join(VID, v)).colour}] frame 0 vs hero-4x5-poster.jpg in Chrome: Δ ${d.toFixed(2)}`);
    }
  } finally { await b.close(); }
}

// ---------------------------------------------------------------------------------------------
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!only.length || only.includes('films')) await films();
if (!only.length || only.includes('films')) await browserColour();
if (!only.length || only.includes('hero')) await hero();
if (!only.length || only.includes('stills')) await stills();
if (!only.length || only.includes('stills') || only.includes('favicon')) await favicon();
for (const n of notes) console.log('note', n);
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nALL MEDIA CHECKS PASS');
process.exit(problems.length ? 1 : 0);
