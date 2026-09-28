// Motion core (SPEC §4.9): GSAP registration, the three brand eases, Lenis (desktop only).
// GSAP/Lenis are classic `defer` scripts that run before app.js; everything here tolerates their absence.
//
// No idle rAF: Lenis is driven by gsap.ticker only while it is moving. A wheel event (or scrollTo)
// wakes the driver; it detaches itself after a few still frames.
import { emit } from './events.js';

const html = document.documentElement;
const EASES = { paper: '.22,1,.36,1', leaf: '.65,0,.35,1', ink: '.3,0,.1,1' };
const FALLBACK_EASE = { paper: 'power3.out', leaf: 'power2.inOut', ink: 'power3.out' };

let resolveReady;
let registered = false;
let tick = null;
let idleFrames = 0;
let wakeBound = null;

function headerOffset() {
  const h = parseFloat(getComputedStyle(html).getPropertyValue('--header-h'));
  return -(Number.isFinite(h) ? h : 64);
}

export const motion = {
  ready: new Promise((r) => { resolveReady = r; }),
  on: false,
  gsap: null,
  ScrollTrigger: null,
  SplitText: null,
  CustomEase: null,
  lenis: null,
  mm: null,

  // Name of a registered brand ease ('paper' | 'leaf' | 'ink'), or a core fallback.
  ease(name) { return this.CustomEase ? name : FALLBACK_EASE[name] || name; },

  // Register plugins once, set motion.on. Returns true when animation is allowed and GSAP exists.
  init() {
    const g = window.gsap;
    const off = html.classList.contains('motion-off');
    if (g && !registered) {
      registered = true;
      this.gsap = g;
      this.ScrollTrigger = window.ScrollTrigger || null;
      this.SplitText = window.SplitText || null;
      this.CustomEase = window.CustomEase || null;
      const plugins = [this.ScrollTrigger, this.SplitText, this.CustomEase].filter(Boolean);
      if (plugins.length) g.registerPlugin(...plugins);
      if (this.CustomEase) for (const [n, v] of Object.entries(EASES)) this.CustomEase.create(n, v);
      g.defaults({ ease: this.ease('paper') });
    }
    this.on = !!g && !off;
    if (this.on) {
      if (!this.mm) this.mm = g.matchMedia();
      html.classList.add('can-animate');
      if (html.classList.contains('fx-desktop')) this.createLenis();
    } else {
      html.classList.remove('can-animate', 'will-animate');
      this.destroyLenis();
    }
    resolveReady(this.on);
    return this.on;
  },

  // Re-evaluate after the motion setting or the layout changed (called by app.js).
  refresh() {
    const wasOn = this.on;
    this.init();
    if (this.on && !html.classList.contains('fx-desktop')) this.destroyLenis();
    if (wasOn && !this.on && this.mm) { this.mm.revert(); this.mm = null; }
    return this.on;
  },

  createLenis() {
    const g = this.gsap;
    const L = window.Lenis;
    if (this.lenis || !g || !L || !this.on) return this.lenis;
    try {
      this.lenis = new L({ lerp: 0.09, smoothWheel: true, syncTouch: false, autoRaf: false });
    } catch (e) {
      console.warn('[motion] Lenis failed', e);
      this.lenis = null;
      return null;
    }
    const lenis = this.lenis;
    if (this.ScrollTrigger) lenis.on('scroll', this.ScrollTrigger.update);
    g.ticker.lagSmoothing(0);
    tick = (time) => {
      lenis.raf(time * 1000);
      if (lenis.isScrolling) idleFrames = 0;
      else if (++idleFrames > 8) sleep();
    };
    wakeBound = () => wake();
    window.addEventListener('wheel', wakeBound, { passive: true, capture: true });
    emit('sele:lenis', { lenis });
    return lenis;
  },

  destroyLenis() {
    if (!this.lenis) return;
    sleep();
    window.removeEventListener('wheel', wakeBound, { capture: true });
    wakeBound = null;
    try { this.lenis.destroy(); } catch (e) { /* ignore */ }
    this.lenis = null;
    tick = null;
    if (this.gsap) this.gsap.ticker.lagSmoothing(500, 33);
    emit('sele:lenis', { lenis: null });
  },

  stop() { if (this.lenis) this.lenis.stop(); },
  start() { if (this.lenis) this.lenis.start(); },

  // Scroll to an element, selector or number. offset defaults to minus the header height.
  scrollTo(target, { offset, immediate = false } = {}) {
    const off = offset ?? headerOffset();
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (this.lenis && this.on) {
      wake();
      this.lenis.scrollTo(el || target, { offset: off, immediate });
      return;
    }
    let top = typeof target === 'number' ? target : el ? el.getBoundingClientRect().top + window.scrollY : null;
    if (top == null) return;
    top = Math.max(0, top + (typeof target === 'number' ? 0 : off));
    const instant = immediate || !this.on || html.classList.contains('motion-off');
    window.scrollTo({ top, behavior: instant ? 'auto' : 'smooth' });
  },
};

function wake() {
  const g = motion.gsap;
  if (!g || !tick || tick.__awake) return;
  idleFrames = 0;
  tick.__awake = true;
  g.ticker.add(tick);
}

function sleep() {
  const g = motion.gsap;
  if (!g || !tick || !tick.__awake) return;
  tick.__awake = false;
  g.ticker.remove(tick);
}
