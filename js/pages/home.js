// Home page module (SPEC §5.1, §8 P1). Owner: P1.
// - The works index preview: hovering or focusing a row wipes its image in above the previous one with a
//   rectangular curtain rising from the bottom edge, the site's media wipe (instant under reduced motion). The static HTML already shows image 1, so no-JS is complete.
// - Mounts the P6 signature moments, each guarded: frame.js (W2) on [data-fx="frame"] when html.fx-frame is set,
//   vein-cut.js (W4) on [data-fx="vein-cut"] when html.fx-desktop is set. destroy() unmounts both.
//   aperture.js (W1) is mounted by app.js, never here.
import { motion } from '/js/core/sele.js';

const html = document.documentElement;
let gen = 0;               // bumps on every destroy(); late module loads from an older init are discarded
let unmounts = [];
let works = null;

// ------------------------------------------------------------------ works preview
function setupWorks(root) {
  const rows = [...root.querySelectorAll('[data-works-row]')];
  const prevs = new Map([...root.querySelectorAll('[data-works-prev]')].map((f) => [f.getAttribute('data-works-prev'), f]));
  if (!rows.length || !prevs.size) return null;

  const initial = [...prevs.values()].find((f) => f.classList.contains('is-active')) || prevs.get('1');
  const state = { active: initial ? initial.getAttribute('data-works-prev') : '1', tween: null, listeners: [] };

  const clipOf = (fig) => fig.querySelector('.frame__clip');
  const animated = () => motion.on && !!motion.gsap && !html.classList.contains('motion-off');
  // the preview only exists (display:grid) at >= 1100 px
  const previewShown = () => {
    const any = prevs.get(state.active) || initial;
    return !!(any && any.parentElement && any.parentElement.getClientRects().length);
  };

  function settle(keep) {
    for (const [n, f] of prevs) {
      f.classList.toggle('is-active', n === keep);
      f.classList.remove('is-prev');
    }
  }

  function show(n) {
    if (n === state.active || !prevs.has(n)) return;
    const next = prevs.get(n);
    const prev = prevs.get(state.active);
    if (state.tween) { state.tween.kill(); state.tween = null; }
    for (const f of prevs.values()) {
      const c = clipOf(f);
      if (c) c.style.removeProperty('clip-path');   // an interrupted wipe never leaves a half-open image behind
      if (f !== next && f !== prev) f.classList.remove('is-active', 'is-prev');
    }
    if (prev) { prev.classList.remove('is-active'); prev.classList.add('is-prev'); }
    next.classList.remove('is-prev');
    next.classList.add('is-active');
    state.active = n;

    const clip = clipOf(next);
    if (clip && animated() && previewShown()) {
      const g = motion.gsap;
      state.tween = g.fromTo(clip,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: motion.ease('paper'),
          onComplete() { g.set(clip, { clearProps: 'clipPath' }); state.tween = null; settle(n); },
        });
    } else {
      if (clip) clip.style.removeProperty('clip-path');
      settle(n);
    }
  }

  for (const row of rows) {
    const n = row.getAttribute('data-works-row');
    const on = () => show(n);
    row.addEventListener('pointerenter', on);
    row.addEventListener('focus', on);
    state.listeners.push([row, on]);
  }

  return {
    destroy() {
      for (const [row, on] of state.listeners) {
        row.removeEventListener('pointerenter', on);
        row.removeEventListener('focus', on);
      }
      if (state.tween) { state.tween.kill(); state.tween = null; }
      for (const f of prevs.values()) { const c = clipOf(f); if (c) c.style.removeProperty('clip-path'); }
      settle(state.active);
    },
  };
}

// ------------------------------------------------------------------ signature moments (P6)
async function mountFx(my, root, selector, url, allowed, ctx) {
  const el = root.querySelector(selector) || document.querySelector(selector);
  if (!el || !allowed()) return;
  try {
    const mod = await import(url);
    if (my !== gen || !allowed() || typeof mod.default !== 'function') return;
    const unmount = await mod.default(el, ctx);
    if (typeof unmount !== 'function') return;
    if (my !== gen) { try { unmount(); } catch (e) { /* ignore */ } return; }
    unmounts.push(unmount);
  } catch (e) {
    console.warn('[home] effect not mounted:', url, e && e.message);
  }
}

export async function init(ctx = {}) {
  const root = ctx.root || document.getElementById('main') || document;
  const my = gen;
  if (!works) works = setupWorks(root);
  await Promise.all([
    mountFx(my, root, '[data-fx="frame"]', '/js/fx/frame.js', () => html.classList.contains('fx-frame'), ctx),
    mountFx(my, root, '[data-fx="vein-cut"]', '/js/fx/vein-cut.js', () => html.classList.contains('fx-desktop'), ctx),
  ]);
}

export function destroy() {
  gen++;
  const list = unmounts;
  unmounts = [];
  for (const u of list.reverse()) { try { u(); } catch (e) { console.warn('[home] unmount failed', e); } }
  if (works) { works.destroy(); works = null; }
}
