// Services hub module (SPEC-ADDENDUM A5). Owner: P3.
//   • Sticky preview (≥ 1100 px): a row's pointerenter or keyboard focus shows its image; the new preview wipes in
//     as a rectangular curtain rising from its bottom edge (clip-path inset(100% 0 0 0) → inset(0), 600 ms paper)
//     above the previous one.
//     Motion off: instant swap. Without JS the first preview (is-active in the HTML) stays.
//   • Timeline hairline (#process): scales Y 0 → 1 with scroll on desktop fx only (scrub .4); static = full.
import { motion } from '/js/core/sele.js';

const html = document.documentElement;
let listeners = [];
let ctx = null;
let active = 1;
let wipe = null;
let rows = [];

function listen(el, type, fn) {
  el.addEventListener(type, fn);
  listeners.push(() => el.removeEventListener(type, fn));
}

function previews(root) {
  const map = new Map();
  root.querySelectorAll('[data-sv-prev]').forEach((el) => map.set(Number(el.dataset.svPrev), el));
  return map;
}

function activate(map, n) {
  const next = map.get(n);
  if (!next || n === active) return;
  const prev = map.get(active);
  active = n;
  rows.forEach((row) => row.classList.toggle('is-active', Number(row.dataset.svRow) === n));
  const g = motion.gsap;
  if (wipe) { wipe.progress(1); wipe = null; }
  map.forEach((el) => { if (el !== next && el !== prev) el.classList.remove('is-active', 'is-leaving'); });
  if (prev) { prev.classList.remove('is-active'); prev.classList.add('is-leaving'); }
  next.classList.remove('is-leaving');
  next.classList.add('is-active');
  const clip = next.querySelector('.frame__clip');
  const finish = () => {
    if (prev && prev !== next) prev.classList.remove('is-leaving');
    if (clip) clip.style.removeProperty('clip-path');
    wipe = null;
  };
  if (!g || !motion.on || html.classList.contains('motion-off') || !clip) { finish(); return; }
  wipe = g.fromTo(clip, { clipPath: 'inset(100% 0% 0% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: motion.ease('paper'), onComplete: finish,
  });
}

export async function init({ root }) {
  destroy();
  const r = root || document;
  const map = previews(r);
  // restore the static default (row 1) so a re-init never leaves two previews visible
  active = 0;
  map.forEach((el, n) => { el.classList.toggle('is-active', n === 1); el.classList.remove('is-leaving'); });
  active = 1;
  rows = [...r.querySelectorAll('[data-sv-row]')];
  rows.forEach((row) => row.classList.toggle('is-active', Number(row.dataset.svRow) === 1));
  rows.forEach((row) => {
    const n = Number(row.dataset.svRow);
    const on = () => activate(map, n);
    listen(row, 'pointerenter', on);
    listen(row, 'focus', on);
  });

  const g = motion.gsap;
  const rule = r.querySelector('[data-sv-rule]');
  const steps = r.querySelector('[data-sv-steps]');
  if (rule && steps && g && motion.ScrollTrigger && motion.on && html.classList.contains('fx-desktop')) {
    ctx = g.context(() => {
      g.fromTo(rule, { scaleY: 0 }, {
        scaleY: 1, ease: 'none', transformOrigin: '50% 0%',
        scrollTrigger: { trigger: steps, start: 'top 70%', end: 'bottom 70%', scrub: 0.4 },
      });
    });
  }
}

export function destroy() {
  listeners.forEach((off) => off());
  listeners = [];
  rows.forEach((row) => row.classList.remove('is-active'));
  rows = [];
  if (wipe) { try { wipe.progress(1); } catch (e) { /* ignore */ } wipe = null; }
  if (ctx) { try { ctx.revert(); } catch (e) { /* ignore */ } }
  ctx = null;
}
