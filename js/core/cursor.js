// Cursor label (SPEC §4.11): a seal-oval "צפייה / View" label that ACCOMPANIES the native cursor over
// [data-cursor="view"]. Desktop only (html.fx-desktop), never under motion-off, never hides the cursor.
// Nothing runs while the pointer is outside such elements (pointermove is bound only while inside).
import { motion } from './motion.js';
import { i18n } from './i18n.js';

const html = document.documentElement;
const SEL = '[data-cursor="view"]';
let label = null, current = null, qx = null, qy = null, mounted = false;

function move(e) { if (qx) { qx(e.clientX); qy(e.clientY); } }

function enter(el, e) {
  const g = motion.gsap;
  current = el;
  label.textContent = i18n.has('common.cursor.view') ? i18n.t('common.cursor.view') : 'צפייה';
  g.set(label, { x: e.clientX, y: e.clientY });
  label.classList.add('is-active');
  g.to(label, { autoAlpha: 1, scale: 1, duration: 0.3, ease: motion.ease('paper'), overwrite: 'auto' });
  el.addEventListener('pointermove', move, { passive: true });
}

function leave() {
  if (!current) return;
  current.removeEventListener('pointermove', move);
  current = null;
  label.classList.remove('is-active');
  motion.gsap.to(label, { autoAlpha: 0, scale: 0.6, duration: 0.2, ease: motion.ease('paper'), overwrite: 'auto' });
}

function over(e) {
  if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  const el = e.target instanceof Element ? e.target.closest(SEL) : null;
  if (el === current) return;
  if (current) leave();
  if (el) enter(el, e);
}

function out(e) {
  if (!current) return;
  const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest(SEL) : null;
  if (to !== current) leave();
}

export const cursor = {
  mount() {
    if (mounted) return;
    const g = motion.gsap;
    if (!g || !motion.on || !html.classList.contains('fx-desktop') || html.classList.contains('motion-off')) return;
    mounted = true;
    label = document.createElement('div');
    label.className = 'cursor-label';
    label.setAttribute('aria-hidden', 'true');
    // Position, centering (negative margins) and look are in chrome.css (.cursor-label, hidden by default);
    // JS writes x/y (quickTo) and tweens autoAlpha + scale .6 → 1. `is-active` mirrors the state.
    label.style.pointerEvents = 'none';
    document.body.appendChild(label);
    g.set(label, { autoAlpha: 0, scale: 0.6 });
    qx = g.quickTo(label, 'x', { duration: 0.18, ease: motion.ease('paper') });
    qy = g.quickTo(label, 'y', { duration: 0.18, ease: motion.ease('paper') });
    document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('pointerout', out, { passive: true });
  },
  unmount() {
    if (!mounted) return;
    mounted = false;
    if (current) current.removeEventListener('pointermove', move);
    current = null;
    document.removeEventListener('pointerover', over);
    document.removeEventListener('pointerout', out);
    if (label) { motion.gsap && motion.gsap.killTweensOf(label); label.remove(); }
    label = qx = qy = null;
  },
};
