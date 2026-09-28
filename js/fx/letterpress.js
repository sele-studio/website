// W6 — Letterpress pointer light (SPEC §1.3, §4.4 cta). The CTA band's seal is debossed in CSS (chrome.css) by two
// 1.2 px drop-shadows whose offsets are var(--lp-x) / var(--lp-y) (default −.7, −.7: the lamp at the top-left).
// Here the pointer is the lamp: while a fine pointer moves inside the band, the direction from the seal's centre to
// the pointer sets --lp-x / --lp-y in −1…1 on the seal, rAF-throttled (one write per frame at most, nothing while
// the pointer is outside). On pointerleave the light eases back to the default. This is the sanctioned exception to
// "never animate filter": the seal is ≤ 200 × 230 px.
// Mounted by app.js on [data-fx="letterpress"] only when html.fx-desktop is set (which excludes reduced motion).
//
// export default mount(el, ctx) → unmount()

const DEFAULT = -0.7;
const REACH = 360;      // px from the seal's centre at which the light reaches full strength
const MIN_STRENGTH = 0.45; // the deboss never flattens completely, even with the pointer over the seal

export default function mount(band, ctx = {}) {
  const seal = band && band.querySelector('[data-letterpress-seal]');
  if (!seal) return () => {};
  const gsap = (ctx.motion && ctx.motion.gsap) || window.gsap || null;

  let frame = 0;
  let px = 0;
  let py = 0;
  let back = null;

  const fine = (e) => e.pointerType === 'mouse' || e.pointerType === 'pen';

  function write(x, y) {
    seal.style.setProperty('--lp-x', x.toFixed(3));
    seal.style.setProperty('--lp-y', y.toFixed(3));
  }

  function apply() {
    frame = 0;
    const r = seal.getBoundingClientRect();
    const dx = px - (r.left + r.width / 2);
    const dy = py - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return;
    const strength = MIN_STRENGTH + (1 - MIN_STRENGTH) * Math.min(dist / REACH, 1);
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    // Shadow falls toward the lamp in a debossed (pressed-in) mark. Far away on a diagonal this gives (±.71, ±.71),
    // the same strength as the static default (−.7, −.7: a lamp at the top-left).
    write(clamp((dx / dist) * strength), clamp((dy / dist) * strength));
  }

  function onMove(e) {
    if (!fine(e)) return;
    px = e.clientX;
    py = e.clientY;
    if (back) { back.kill(); back = null; }
    if (!frame) frame = requestAnimationFrame(apply);
  }

  function onLeave(e) {
    if (e && !fine(e)) return;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    const cs = getComputedStyle(seal);
    const x = parseFloat(cs.getPropertyValue('--lp-x'));
    const y = parseFloat(cs.getPropertyValue('--lp-y'));
    if (gsap && Number.isFinite(x) && Number.isFinite(y)) {
      const s = { x, y };
      back = gsap.to(s, {
        x: DEFAULT, y: DEFAULT, duration: 0.6, ease: (ctx.motion && ctx.motion.ease) ? ctx.motion.ease('paper') : 'power3.out',
        onUpdate: () => write(s.x, s.y),
        onComplete: () => { back = null; reset(); },
      });
    } else {
      reset();
    }
  }

  function reset() {
    seal.style.removeProperty('--lp-x');
    seal.style.removeProperty('--lp-y');
  }

  band.addEventListener('pointermove', onMove, { passive: true });
  band.addEventListener('pointerleave', onLeave, { passive: true });

  return function unmount() {
    band.removeEventListener('pointermove', onMove);
    band.removeEventListener('pointerleave', onLeave);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (back) { back.kill(); back = null; }
    reset();
  };
}
