// Studio page module (SPEC §5.4). Owner: P3.
//   The W5 Threshold sequence was removed at the owner's request (05/10/2026); the portrait is now a static
//   figure in the opener and needs no script.
//   S5: the seal's rings draw once on enter (motion on, any viewport); static state = fully drawn.
import { motion } from '/js/core/sele.js';

const html = document.documentElement;
let ctxSeal = null;

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

export async function init({ root } = {}) {
  destroy();
  const r = root || document;
  if (!motion.on || html.classList.contains('motion-off')) return;
  mountSeal(r);
}

export function destroy() {
  if (ctxSeal) { try { ctxSeal.revert(); } catch (e) { /* ignore */ } }
  ctxSeal = null;
}
