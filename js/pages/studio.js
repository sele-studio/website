// Studio page module (SPEC §5.4; W5 Threshold). Owner: P3.
//   W5 mounts only under html.fx-desktop with motion on; it adds html.threshold-ready once its ScrollTriggers
//   exist and removes it (plus every inline style) in destroy(), so a failed load, "stop animations",
//   a resize below 1100 px or reduced motion always leave the static reading order (inline bath figure visible).
//   The portrait is never scaled beyond 1.06 and only toward the transom glass (transform-origin 50% 16%).
//   S5: the seal's rings draw once on enter (motion on, any viewport); static state = fully drawn.
import { motion } from '/js/core/sele.js';

const html = document.documentElement;
let ctxThreshold = null;
let ctxSeal = null;
let bathCap = null;

function mountThreshold(root) {
  const g = motion.gsap;
  const ST = motion.ScrollTrigger;
  const section = root.querySelector('[data-threshold]');
  if (!section || !g || !ST) return;
  const frame = section.querySelector('[data-threshold-frame]');
  const portrait = frame && frame.querySelector('[data-layer="portrait"] img');
  const bath = frame && frame.querySelector('[data-layer="bath"]');
  const bathImg = bath && bath.querySelector('img');
  const p2 = section.querySelector('[data-step="2"]');
  const p3 = section.querySelector('[data-step="3"]');
  const capPortrait = frame && frame.querySelector('[data-cap="portrait"]');
  bathCap = frame && frame.querySelector('[data-cap="bath"]');
  if (!portrait || !bath || !bathImg || !p2 || !p3 || !capPortrait || !bathCap) return;

  // Layout first (inline figure out, stage layer in), then measure.
  html.classList.add('threshold-ready');
  bathCap.hidden = false;
  // the bath is a duplicate of a decorative layer; its image is exposed only once as the inline figure,
  // so only the visible caption is read out
  const setCap = (bathOn) => {
    capPortrait.setAttribute('aria-hidden', bathOn ? 'true' : 'false');
    bathCap.setAttribute('aria-hidden', bathOn ? 'false' : 'true');
  };

  // One scrubbed driver for the whole sequence. The three SPEC segments are measured in scroll pixels on every
  // refresh and rendered from one progress value, so they can never fight each other in either direction
  // (a jump from the bottom to the top lands on the portrait, always).
  //   A  p2 top 75% → p2 center center      portrait scale 1 → 1.06 (toward the transom, origin 50% 16%)
  //   B  p2 center center → p2 bottom center bath layer 0 → 1, its image 1.04 → 1, captions cross-fade
  //   C  p3 top 80% → p3 top 40%             bath layer 1 → 0, portrait 1.06 → 1, captions swap back
  //      (C never starts before B has ended)
  const pos = { a0: 0, a1: 0, b1: 0, c0: 0, c1: 0 };
  const measure = () => {
    const vh = window.innerHeight;
    const y = window.scrollY;
    const r2 = p2.getBoundingClientRect();
    const r3 = p3.getBoundingClientRect();
    const t2 = r2.top + y, b2 = r2.bottom + y, t3 = r3.top + y;
    pos.a0 = t2 - 0.75 * vh;
    pos.a1 = Math.max((t2 + b2) / 2 - 0.5 * vh, pos.a0 + 1);
    pos.b1 = Math.max(b2 - 0.5 * vh, pos.a1 + 1);
    pos.c0 = Math.max(t3 - 0.8 * vh, pos.b1);
    pos.c1 = Math.max(t3 - 0.4 * vh, pos.c0 + 0.15 * vh);
  };
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (y, a, b) => clamp((y - a) / (b - a));
  let bathOn = null;
  const render = (p) => {
    const y = pos.a0 + p * (pos.c1 - pos.a0);
    const A = seg(y, pos.a0, pos.a1);
    const B = seg(y, pos.a1, pos.b1);
    const C = seg(y, pos.c0, pos.c1);
    portrait.style.scale = String(1 + 0.06 * clamp(A - C));
    bath.style.opacity = String(clamp(B - C));
    bathImg.style.scale = String(1.04 - 0.04 * B);
    capPortrait.style.opacity = String(clamp(1 - clamp(2 * B) + clamp(2 * C - 1)));
    bathCap.style.opacity = String(clamp(clamp(2 * B - 1) - clamp(2 * C)));
    const on = clamp(B - C) > 0.5;
    if (on !== bathOn) { bathOn = on; setCap(on); }
  };
  const proxy = { p: 0 };

  ctxThreshold = g.context(() => {
    measure();
    g.timeline({
      scrollTrigger: {
        trigger: section,
        start: () => { measure(); return pos.a0; },
        end: () => pos.c1,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onRefresh: () => render(proxy.p),
      },
    }).fromTo(proxy, { p: 0 }, { p: 1, ease: 'none', duration: 1, onUpdate: () => render(proxy.p) });
  }, section);
  render(0);
  setCap(false);
}

function unmountThreshold() {
  if (ctxThreshold) { try { ctxThreshold.revert(); } catch (e) { /* ignore */ } }
  ctxThreshold = null;
  html.classList.remove('threshold-ready');
  document.querySelectorAll('[data-threshold-frame] [data-layer], [data-threshold-frame] img, [data-threshold-frame] [data-cap]').forEach((el) => {
    el.style.removeProperty('scale');
    el.style.removeProperty('opacity');
  });
  if (bathCap) {
    bathCap.hidden = true;
    bathCap.setAttribute('aria-hidden', 'true');
    const cp = bathCap.parentElement && bathCap.parentElement.querySelector('[data-cap="portrait"]');
    if (cp) cp.removeAttribute('aria-hidden');
  }
  bathCap = null;
}

function mountSeal(root) {
  const g = motion.gsap;
  const mark = root.querySelector('[data-seal-draw]');
  if (!mark || !g || !motion.ScrollTrigger) return;
  const rings = mark.querySelectorAll('[data-seal-ring]');
  const s = mark.querySelector('[data-seal-s]');
  if (!rings.length || !s) return;
  ctxSeal = g.context(() => {
    const tl = g.timeline({ scrollTrigger: { trigger: mark, start: 'top 80%', once: true } });
    tl.fromTo(rings, { strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.2, stagger: 0.15, ease: motion.ease('ink') }, 0)
      .fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: motion.ease('paper') }, '>-0.1');
  }, mark);
}

export async function init({ root }) {
  destroy();
  const r = root || document;
  if (!motion.on || html.classList.contains('motion-off')) return;
  if (html.classList.contains('fx-desktop')) mountThreshold(r);
  mountSeal(r);
}

export function destroy() {
  unmountThreshold();
  if (ctxSeal) { try { ctxSeal.revert(); } catch (e) { /* ignore */ } }
  ctxSeal = null;
}
