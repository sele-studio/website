#!/usr/bin/env node
// SELÈ STUDIO — P7 films (SPEC §10). Ken-Burns loops built from the studio's own renders.
//
//   node tools/media/films.mjs [targets...] [--verify-only] [--keep-work]
//   targets: case-kitchen case-living bath-threshold case-bedroom hero-reencode hero-posters  (default: all)
//
// Media modules (sharp, ffmpeg-static) resolve from $SELE_TOOLS (a folder holding node_modules/),
// defaulting to the build machine's tools folder. Nothing here is loaded by the website.
//
// Rules this script enforces (SPEC §1.2 rule 4, §10):
//   - no pixels are added to the renders: crop → lanczos upscale → zoompan → encode, nothing else
//     (no text, tints, glows, grading); setsar=1 everywhere; yuv420p; silent.
//   - total upscale (1080 output px ÷ source crop px × max zoom) ≤ 1.20 — checked before rendering.
//   - eased camera path E = 0.5 − 0.5·cos(π·on/(N−1)); seamless loop with a 1.2 s crossfade to shot 0.
//   - size budgets: an output over budget is re-encoded one CRF step higher until it fits.
//   - colour: the renders are sRGB. RGB→YUV uses the BT.709 matrix and every stream is tagged
//     bt709 / bt709 / iec61966-2-1 (sRGB transfer). Untagged BT.601 video (ffmpeg's default) is
//     decoded by Chrome as BT.709, which shifted every film warm (R +1.7, B −0.8 on 0–255) against the
//     renders and against its own poster; tagged, Chrome reproduces the render within ±0.2.
//
// Scratch (shots, masters, frames, contact sheets) goes to tools/media/out/ — not deployed.
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = process.env.SELE_TOOLS ||
  '/private/tmp/claude-501/-Users-tohargueta-Library-CloudStorage-OneDrive-YouCCTechnologies-Desktop-Systems-YouCC-lion8/bb4e0756-6dc9-4593-9e3c-84596b23b1d1/scratchpad/tools';
const require = createRequire(path.join(path.resolve(TOOLS), 'noop.js'));
const FF = require('ffmpeg-static');
const sharp = require('sharp');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const IMG = path.join(SITE, 'assets/img');
const VID = path.join(SITE, 'assets/video');
const OUT = path.join(HERE, 'out');
const WORK = path.join(OUT, 'work');
// The hero master lives in the build scratch folder, next to the tools folder.
const HERO_MASTER = process.env.SELE_HERO_MASTER || path.join(path.resolve(TOOLS), '..', 'videowork', 'hero45-master.mp4');
fs.mkdirSync(WORK, { recursive: true });

const FPS = 30;
const D = 1.2;               // loop crossfade (s)
const UP = 3;                // zoompan works on a ×3 lanczos-upscaled crop (sub-pixel smooth motion)
const MAX_UPSCALE = 1.20;    // SPEC §1.2 rule 4 / §10 zoom ceiling (1080 variant)
const MB = 1_000_000;
// Colour handling (see header). CSC = the one RGB/JPEG → BT.709 limited-range conversion; TAGS = stream tags.
const SWS = 'accurate_rnd+full_chroma_int';
const CSC = `scale=out_color_matrix=bt709:out_range=tv:flags=${SWS}`;
const TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1'];
// Decoding a tagged film back to RGB (posters, sheets): ffmpeg 6 ignores the tag, so name the matrix.
const TO_RGB = (w, h) => `scale=${w}:${h}:flags=lanczos+${SWS}:in_color_matrix=bt709:in_range=tv,format=rgb24`;

const ff = (args) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const ffErr = (args) => spawnSync(FF, ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 }).stderr || '';
const kb = (f) => (fs.statSync(f).size / 1000).toFixed(1) + ' KB';

// ---------------------------------------------------------------------------------------------
// Film table — SPEC §10 verbatim. c = crop w:h:x:y in source px; z/fx/fy = [start, end].
// Unspecified fx/fy = centred (0.5).
// poster = the still the page shows before/without playback (reduced motion, no JS, autoplay blocked):
//   { shot, t } with t in seconds on the shipped loop (master time). §10 amended: NOT frame 0, which is
//   shot 0 = the render the case page already shows as a plate or hero. Never take it from the plate
//   directly above the film (on mobile the two stack as the same image twice), and prefer a render the
//   page shows in a different framing (full-bleed hero, wide plate) over one it already shows as a 4:5
//   arch; then the one farthest up the page. 0.5 s after that shot's crossfade completes
//   (shot k ≥ 1 is clean on [k·(L−D), (k+1)·(L−D) − D]; shot 0 on [0, L − 2D]).
// Budgets in bytes. The 720 budgets for the two 7.6 s films are not given in §10; they are
// scaled from the 13.2 s films' 720/1080 ratio (webm 0.8/1.4, mp4 1.2/2.2) → 0.6 MB / 0.9 MB.
// ---------------------------------------------------------------------------------------------
const FILMS = {
  'case-kitchen': {
    name: 'case-kitchen-4x5', L: 5.6,
    shots: [
      { src: 'kitchen-stone-02.jpg', c: [959, 1199, 176, 0], z: [1.00, 1.06], fx: [0.30, 0.45], fy: [0.50, 0.44] },
      { src: 'kitchen-stone-03.jpg', c: [959, 1199, 353, 0], z: [1.00, 1.06], fx: [0.62, 0.52], fy: [0.45, 0.52] },
      { src: 'kitchen-stone-01.jpg', c: [959, 1199, 240, 0], z: [1.06, 1.00], fx: [0.50, 0.50], fy: [0.55, 0.50] },
    ],
    // stone-02 is pl-2 and stone-03 is pl-3, directly above the film; stone-01 is the full-bleed hero.
    poster: { shot: 2, t: 2 * (5.6 - D) + 0.5 },
    budget: { 1080: { webm: 1.4 * MB, mp4: 2.2 * MB }, 720: { webm: 0.8 * MB, mp4: 1.2 * MB } },
  },
  'case-living': {
    name: 'case-living-4x5', L: 5.6,
    shots: [
      { src: 'living-02.jpg', c: [1117, 1396, 0, 6], z: [1.04, 1.04], fx: [0.50, 0.50], fy: [0.30, 0.70] },
      { src: 'living-03.jpg', c: [1099, 1374, 23, 0], z: [1.00, 1.06], fx: [0.40, 0.58], fy: [0.50, 0.50] },
      { src: 'living-04.jpg', c: [959, 1199, 300, 0], z: [1.00, 1.06], fx: [0.50, 0.50], fy: [0.55, 0.50] },
    ],
    // living-02 is pl-4, directly above the film; living-03 is pl-2, already a 4:5 arch of the same
    // shelves (a poster from it reprints that plate); living-04 is pl-3, a WIDE plate, so its 4:5
    // push-in reads as a close detail of the coffee table.
    poster: { shot: 2, t: 2 * (5.6 - D) + 0.5 },
    budget: { 1080: { webm: 1.4 * MB, mp4: 2.2 * MB }, 720: { webm: 0.8 * MB, mp4: 1.2 * MB } },
  },
  'bath-threshold': {
    name: 'bath-threshold-4x5', L: 5.0,
    shots: [
      // through the doorway: the dark jambs slide out of frame
      { src: 'bath-02.jpg', c: [1024, 1280, 0, 128], z: [1.00, 1.12], fx: [0.50, 0.50], fy: [0.50, 0.44] },
      { src: 'bath-01.jpg', c: [1112, 1390, 10, 0], z: [1.10, 1.00], fx: [0.50, 0.50], fy: [0.36, 0.44] },
    ],
    // bath-02 is pl-2 (the door plate), directly above the film; bath-01 is the hero, and the pull-back
    // starts tight (z ≈ 1.08 at the poster) on the upper wall, a different framing from the hero.
    poster: { shot: 1, t: 1 * (5.0 - D) + 0.5 },
    budget: { 1080: { webm: 1.0 * MB, mp4: 1.6 * MB }, 720: { webm: 0.6 * MB, mp4: 0.9 * MB } },
  },
  'case-bedroom': {
    name: 'case-bedroom-4x5', L: 5.0,
    shots: [
      { src: 'bedroom-01.jpg', c: [959, 1199, 176, 0], z: [1.00, 1.06], fx: [0.50, 0.50], fy: [0.55, 0.47] },
      { src: 'bedroom-02.jpg', c: [1064, 1330, 60, 0], z: [1.06, 1.00], fx: [0.45, 0.60], fy: [0.50, 0.50] },
    ],
    // Two renders only: bedroom-02 is pl-2, directly above the film (the bath defect again), so the poster
    // stays on bedroom-01 (the hero, the full-bleed wide room) but at the tight end of the push-in
    // (z ≈ 1.05, fy ≈ .49): a 4:5 detail of the bed, not the hero's framing.
    poster: { shot: 0, t: (5.0 - 2 * D) - 0.3 },
    budget: { 1080: { webm: 1.0 * MB, mp4: 1.6 * MB }, 720: { webm: 0.6 * MB, mp4: 0.9 * MB } },
  },
};
const SIZES = [{ w: 1080, h: 1350, suffix: '' }, { w: 720, h: 900, suffix: '-720' }];
const CRF = { mp4: 24, webm: 36 };   // §10 starting points; raised only if a budget fails

// ---------------------------------------------------------------------------------------------
function checkUpscale(film) {
  for (const s of film.shots) {
    const [cw, ch, cx, cy] = s.c;
    const meta = srcDims[s.src];
    if (cx + cw > meta.w || cy + ch > meta.h) throw new Error(`${film.name}: crop ${s.c} outside ${s.src} ${meta.w}x${meta.h}`);
    const up = Math.max(1080 / cw, 1350 / ch) * Math.max(...s.z);
    s.upscale = up;
    if (up > MAX_UPSCALE + 1e-9) throw new Error(`${film.name}: ${s.src} upscale ${up.toFixed(3)} > ${MAX_UPSCALE}`);
  }
}

// One shot: crop → ×3 lanczos → eased zoompan → setsar=1. Near-lossless intermediate.
function shot(film, s, i, W, H) {
  const N = Math.round(film.L * FPS);
  const E = `(0.5-0.5*cos(PI*on/${N - 1}))`;
  const path_ = (a, b) => (a === b ? `${a}` : `(${a}+(${b}-(${a}))*${E})`);
  const vf = [
    `crop=${s.c.join(':')}`,
    `scale=${W * UP}:${H * UP}:flags=lanczos`,
    `zoompan=z='${path_(s.z[0], s.z[1])}':x='(iw-iw/zoom)*${path_(s.fx[0], s.fx[1])}':y='(ih-ih/zoom)*${path_(s.fy[0], s.fy[1])}':d=${N}:s=${W}x${H}:fps=${FPS}`,
    'setsar=1',
    CSC,
    'format=yuv420p',
  ].join(',');
  const out = path.join(WORK, `${film.name}-shot${i}.mp4`);
  ff(['-i', path.join(IMG, s.src), '-vf', vf, '-frames:v', String(N), '-an', '-c:v', 'libx264', '-crf', '8', '-preset', 'fast', ...TAGS, out]);
  return out;
}

// Seamless loop (as SCR/tools/video.js loopFilm): S0..Sn-1 then S0 again, crossfaded by D;
// keep [D, D + n·(L−D)) so the last frame is the frame just before frame 0.
function master(film) {
  const clips = film.shots.map((s, i) => shot(film, s, i, 1080, 1350));
  clips.push(clips[0]);
  const n = clips.length - 1;
  let fc = '', prev = '[0:v]';
  for (let k = 1; k <= n; k++) {
    const lab = k === n ? '[chain]' : `[x${k}]`;
    fc += `${prev}[${k}:v]xfade=transition=fade:duration=${D}:offset=${(k * (film.L - D)).toFixed(3)}${lab};`;
    prev = lab;
  }
  const total = n * (film.L - D);
  fc += `[chain]trim=start=${D}:duration=${total.toFixed(3)},setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v]`;
  const m = path.join(WORK, `${film.name}-master.mp4`);
  ff([...clips.flatMap((c) => ['-i', c]), '-filter_complex', fc, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '8', '-preset', 'medium', ...TAGS, m]);
  film.total = total;
  return m;
}

// bt709 = the source is one of our tagged BT.709 masters: keep the matrix through the 720 scale and tag
// the output. The hero master predates this (untagged BT.601) and is re-encoded exactly as today.
const scaleVf = (scale, bt709) => !scale ? '' : bt709
  ? `scale=${scale.w}:${scale.h}:flags=lanczos+${SWS}:in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=tv,`
  : `scale=${scale.w}:${scale.h}:flags=lanczos,`;
function encodeMp4(src, dst, crf, scale, bt709 = true) {
  const vf = scaleVf(scale, bt709) + 'setsar=1,format=yuv420p';
  ff(['-i', src, '-vf', vf, '-an', '-c:v', 'libx264', '-profile:v', 'high', '-crf', String(crf), '-preset', 'slow',
    '-pix_fmt', 'yuv420p', ...(bt709 ? TAGS : []), '-movflags', '+faststart', dst]);
}
function encodeWebm(src, dst, crf, scale, bt709 = true) {
  const vf = scaleVf(scale, bt709) + 'setsar=1,format=yuv420p';
  ff(['-i', src, '-vf', vf, '-an', '-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-row-mt', '1',
    '-deadline', 'good', '-cpu-used', '2', ...(bt709 ? TAGS : []), dst]);
}

// Encode at the §10 CRF; if over budget, step CRF up until it fits.
function encodeWithinBudget(kind, src, dst, budget, scale) {
  let crf = CRF[kind];
  for (;;) {
    (kind === 'mp4' ? encodeMp4 : encodeWebm)(src, dst, crf, scale);
    const size = fs.statSync(dst).size;
    if (!budget || size <= budget) return { crf, size };
    console.log(`  ${path.basename(dst)} ${size} B > ${budget} B at crf ${crf}; retrying at crf ${crf + 1}`);
    if (crf >= CRF[kind] + 10) throw new Error(`${dst}: cannot meet budget`);
    crf += 1;
  }
}

// Poster frame n → -poster.jpg (ffmpeg q 3) + -poster.webp (q 78), taken from the master (then scaled).
const posterFrame = (film) => Math.round(film.poster.t * FPS);
async function posters(masterFile, base, w, h, n, webpQ = 78, webpBudget) {
  const png = path.join(WORK, path.basename(base) + `-f${n}.png`);
  ff(['-i', masterFile, '-vf', `select=eq(n\\,${n}),${TO_RGB(w, h)},setsar=1`, '-frames:v', '1', '-fps_mode', 'passthrough', png]);
  ff(['-i', png, '-vf', `scale=out_color_matrix=bt601:out_range=pc:flags=${SWS},format=yuvj420p`, '-q:v', '3', base + '-poster.jpg']);
  return webpFrom(png, base + '-poster.webp', w, h, webpQ, webpBudget);
}
async function webpFrom(input, dst, w, h, q = 78, budget) {
  for (;;) {
    await sharp(input).resize(w, h, { kernel: 'lanczos3' }).webp({ quality: q, effort: 6 }).toFile(dst);
    const size = fs.statSync(dst).size;
    if (!budget || size <= budget) return { q, size };
    console.log(`  ${path.basename(dst)} ${size} B > ${budget} B at q ${q}; retrying at q ${q - 2}`);
    q -= 2;
    if (q < 50) throw new Error(`${dst}: cannot meet budget`);
  }
}

// ---------------------------------------------------------------------------------------------
// Verification: clean decode, duration, frame count, SAR 1:1, dimensions, budget.
function probe(file) {
  const e = ffErr(['-i', file]);
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(e);
  const st = /Video: .*?, (\d+)x(\d+)(?: \[SAR (\d+):(\d+)|, SAR (\d+):(\d+))?/.exec(e);
  const sar = st && (st[3] ? `${st[3]}:${st[4]}` : st[5] ? `${st[5]}:${st[6]}` : '1:1 (implicit)');
  return {
    duration: dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + (+dur[3]) : NaN,
    w: st ? +st[1] : 0, h: st ? +st[2] : 0, sar,
    audio: /Audio:/.test(e),
  };
}
function verify(file, { w, h, duration, budget }) {
  const decodeErrors = spawnSync(FF, ['-v', 'error', '-i', file, '-f', 'null', '-'], { encoding: 'utf8' }).stderr.trim();
  const stats = ffErr(['-i', file, '-map', '0:v', '-c', 'copy', '-f', 'null', '-']);
  const frames = +([...stats.matchAll(/frame=\s*(\d+)/g)].pop()?.[1] ?? NaN);
  const p = probe(file);
  const size = fs.statSync(file).size;
  const expFrames = duration ? Math.round(duration * FPS) : null;
  const problems = [];
  if (decodeErrors) problems.push('decode errors: ' + decodeErrors.slice(0, 200));
  if (!/^1:1/.test(p.sar)) problems.push('SAR ' + p.sar);
  if (p.w !== w || p.h !== h) problems.push(`dims ${p.w}x${p.h}`);
  if (p.audio) problems.push('has audio');
  if (expFrames && frames !== expFrames) problems.push(`frames ${frames} ≠ ${expFrames}`);
  if (duration && Math.abs(p.duration - duration) > 0.1) problems.push(`duration ${p.duration} ≠ ${duration}`);
  if (budget && size > budget) problems.push(`size ${size} > ${budget}`);
  const row = { file: path.relative(SITE, file), bytes: size, duration: p.duration, frames, sar: p.sar, ok: problems.length === 0, problems };
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.file}  ${size} B  ${p.duration}s  ${frames}f  SAR ${p.sar}${problems.length ? '  ← ' + problems.join('; ') : ''}`);
  return row;
}

// Contact sheet: frame 0 | last frame (large) + a strip of 8 frames across the loop, and a seam
// metric: mean |Δ| between last and first frame vs the median |Δ| between consecutive frames.
async function contactSheet(film, file) {
  const N = Math.round(film.total * FPS);
  const picks = [0, N - 1, ...Array.from({ length: 8 }, (_, i) => Math.round((i * (N - 1)) / 7))];
  const frames = [];
  for (const n of new Set([...picks, 1, N - 2])) {
    const png = path.join(WORK, `${film.name}-n${n}.png`);
    ff(['-i', file, '-vf', `select=eq(n\\,${n}),${TO_RGB(1080, 1350)}`, '-frames:v', '1', '-fps_mode', 'passthrough', png]);
    frames[n] = png;
  }
  const raw = async (f) => sharp(f).resize(270, 338).greyscale().raw().toBuffer();
  const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
  const [f0, f1, fl, fl1] = await Promise.all([raw(frames[0]), raw(frames[1]), raw(frames[N - 1]), raw(frames[N - 2])]);
  const seam = { lastToFirst: +mad(fl, f0).toFixed(3), firstStep: +mad(f0, f1).toFixed(3), lastStep: +mad(fl1, fl).toFixed(3) };

  const big = { w: 540, h: 675 }, th = { w: 135, h: 169 }, pad = 10, lab = 26;
  const W = big.w * 2 + pad * 3, H = lab + big.h + pad * 2 + lab + th.h + pad;
  const label = (t, x, y) => ({ input: Buffer.from(`<svg width="${W}" height="${lab}"><text x="${x}" y="18" font-family="Helvetica" font-size="15" fill="#222">${t}</text></svg>`), top: y, left: 0 });
  const comps = [
    label(`${film.name}  ·  frame 0 (left) vs last frame ${N - 1} (right)  ·  |Δ| last→first ${seam.lastToFirst}  vs step ${seam.firstStep}`, pad, 0),
    { input: await sharp(frames[0]).resize(big.w, big.h).toBuffer(), top: lab, left: pad },
    { input: await sharp(frames[N - 1]).resize(big.w, big.h).toBuffer(), top: lab, left: pad * 2 + big.w },
    label('timeline: 8 frames from 0 to last', pad, lab + big.h + pad),
  ];
  const strip = picks.slice(2);
  for (let i = 0; i < strip.length; i++) {
    comps.push({ input: await sharp(frames[strip[i]]).resize(th.w, th.h).toBuffer(), top: lab * 2 + big.h + pad, left: pad + i * (th.w + 1) });
  }
  const sheet = path.join(OUT, `${film.name}-seam.jpg`);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#f2efe9' } }).composite(comps).jpeg({ quality: 85 }).toFile(sheet);
  console.log(`seam ${film.name}: ${JSON.stringify(seam)} → ${path.relative(SITE, sheet)}`);
  return { sheet, seam };
}

// ---------------------------------------------------------------------------------------------
const srcDims = {};
async function loadDims() {
  for (const f of new Set(Object.values(FILMS).flatMap((x) => x.shots.map((s) => s.src)))) {
    const m = await sharp(path.join(IMG, f)).metadata();
    srcDims[f] = { w: m.width, h: m.height };
  }
}

async function buildFilm(key, verifyOnly) {
  const film = FILMS[key];
  checkUpscale(film);
  film.total = (film.shots.length) * (film.L - D);
  const m = verifyOnly ? path.join(WORK, `${film.name}-master.mp4`) : master(film);
  const report = { film: film.name, loop: +film.total.toFixed(3),
    upscale: film.shots.map((s) => `${s.src} ${s.upscale.toFixed(3)}`),
    poster: { src: film.shots[film.poster.shot].src, t: +film.poster.t.toFixed(3), frame: posterFrame(film) }, outputs: [] };
  for (const S of SIZES) {
    const base = path.join(VID, film.name + S.suffix);
    const scale = S.w === 1080 ? null : S;
    const b = film.budget[S.w];
    if (!verifyOnly) {
      const mp4 = encodeWithinBudget('mp4', m, base + '.mp4', b.mp4, scale);
      const webm = encodeWithinBudget('webm', m, base + '.webm', b.webm, scale);
      await posters(m, base, S.w, S.h, posterFrame(film));
      report.outputs.push({ size: S.w, mp4Crf: mp4.crf, webmCrf: webm.crf });
    }
    for (const ext of ['mp4', 'webm']) report.outputs.push(verify(`${base}.${ext}`, { w: S.w, h: S.h, duration: film.total, budget: b[ext] }));
    for (const ext of ['jpg', 'webp']) {
      const f = `${base}-poster.${ext}`; const md = await sharp(f).metadata();
      report.outputs.push({ file: path.relative(SITE, f), bytes: fs.statSync(f).size, dims: `${md.width}x${md.height}` });
    }
  }
  report.contact = await contactSheet(film, path.join(VID, film.name + '.mp4'));
  // Drop the bulky intermediates (shot clips, frame PNGs); keep the master for --verify-only.
  if (!argv.includes('--keep-work')) {
    for (const f of fs.readdirSync(WORK)) {
      if (f.startsWith(film.name + '-') && !f.endsWith('-master.mp4')) fs.rmSync(path.join(WORK, f));
    }
  }
  return report;
}

// hero-4x5.mp4 / hero-4x5-720.mp4 re-encoded from the hero master with setsar=1 (was SAR 2395:2396).
// CRF 26 = the settings that produced today's files ("as today"); the WebMs are untouched.
function heroReencode(verifyOnly) {
  const dur = probe(HERO_MASTER).duration;
  const out = [];
  for (const S of SIZES) {
    const dst = path.join(VID, `hero-4x5${S.suffix}.mp4`);
    if (!verifyOnly) encodeMp4(HERO_MASTER, dst, 26, S.w === 1080 ? null : S, false);
    out.push(verify(dst, { w: S.w, h: S.h, duration: dur }));
  }
  return out;
}

// WebP twins of the existing hero posters (the JPGs are not touched).
async function heroPosters() {
  const jobs = [
    ['hero-16x9-poster.jpg', 'hero-16x9-poster.webp', 1600, 900, 90_000],
    ['hero-16x9-poster.jpg', 'hero-16x9-poster-1024.webp', 1024, 576, null],
    ['hero-4x5-poster.jpg', 'hero-4x5-poster.webp', 1080, 1350, null],
    ['hero-4x5-720-poster.jpg', 'hero-4x5-720-poster.webp', 720, 900, 45_000],
  ];
  const out = [];
  for (const [src, dst, w, h, budget] of jobs) {
    const r = await webpFrom(path.join(VID, src), path.join(VID, dst), w, h, 78, budget);
    out.push({ file: 'assets/video/' + dst, bytes: r.size, q: r.q, budget });
    console.log(`poster ${dst} ${r.size} B (q ${r.q})${budget ? ' budget ' + budget : ''}`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const verifyOnly = argv.includes('--verify-only');
const ALL = [...Object.keys(FILMS), 'hero-reencode', 'hero-posters'];
const targets = argv.filter((a) => !a.startsWith('--'));
const run = targets.length ? targets : ALL;
for (const t of run) if (!ALL.includes(t)) throw new Error(`unknown target ${t}; one of ${ALL.join(', ')}`);

await loadDims();
const results = {};
for (const t of run) {
  const t0 = Date.now();
  if (FILMS[t]) results[t] = await buildFilm(t, verifyOnly);
  else if (t === 'hero-reencode') results[t] = heroReencode(verifyOnly);
  else if (t === 'hero-posters') results[t] = await heroPosters();
  console.log(`${t} done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const reportFile = path.join(OUT, `films-report-${run.join('+')}.json`);
fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
const failed = Object.values(results).flatMap((r) => (Array.isArray(r) ? r : r.outputs || [])).filter((o) => o.ok === false);
if (failed.length) { console.error(`${failed.length} output(s) FAILED`); process.exit(1); }
console.log('report →', path.relative(SITE, reportFile));
