// Reveal system (SPEC §4.10). Pages only write attributes; this module owns the behaviour.
//   data-reveal="lines|fade|media|rule|stagger", data-reveal-delay="ms", data-parallax="n" (n ≤ 6)
// Initial hidden states live in css/motion.css under .will-animate/.can-animate (never .motion-off).
// Every element gets one gsap.context; reveal.reset(root) reverts it (inline styles, splits, triggers)
// and removes `is-revealed`, so a following scan() starts clean. Runs once per element (once:true).
import { motion } from './motion.js';
import { env } from './env.js';

const html = document.documentElement;
const registry = new Map(); // el -> { ctx, split }
const START = 'top 85%';

function mediaOf(frame) {
  const clip = frame.querySelector('.frame__clip') || frame;
  const media = clip.querySelectorAll(':scope > img, :scope > picture > img, :scope > video');
  return { clip, media: [...media] };
}

function parallaxN(el) {
  const n = parseFloat(el.getAttribute('data-parallax'));
  return Number.isFinite(n) ? Math.max(0, Math.min(6, n)) : 0;
}

function parallaxActive() {
  return html.classList.contains('fx-desktop') && !html.classList.contains('motion-off');
}

function delayOf(el) {
  const d = parseFloat(el.getAttribute('data-reveal-delay'));
  return Number.isFinite(d) ? d / 1000 : 0;
}

function done(el) { return () => el.classList.add('is-revealed'); }

function setup(el) {
  const g = motion.gsap;
  const kind = el.getAttribute('data-reveal');
  const n = parallaxN(el);
  const px = n > 0 && parallaxActive();
  const delay = delayOf(el);
  const entry = { ctx: null, split: null };
  const st = { trigger: el, start: START, once: true };

  entry.ctx = g.context(() => {
    if (kind === 'fade') {
      g.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, delay, ease: motion.ease('paper'), scrollTrigger: st, onComplete: done(el) });
    } else if (kind === 'stagger') {
      const kids = [...el.children];
      g.fromTo(kids, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, delay, stagger: 0.07, ease: motion.ease('paper'), scrollTrigger: st, onComplete: done(el) });
    } else if (kind === 'rule') {
      g.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 0.6, delay, transformOrigin: env.rtl ? '100% 50%' : '0% 50%', ease: motion.ease('paper'), scrollTrigger: st, onComplete: done(el) });
    } else if (kind === 'media') {
      const { clip, media } = mediaOf(el);
      const endScale = px ? 1 + n / 50 : 1;
      const tl = g.timeline({ delay, scrollTrigger: st, onComplete: done(el) });
      tl.fromTo(clip, { clipPath: 'inset(0% 0% 100% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: motion.ease('paper') }, 0);
      if (media.length) tl.fromTo(media, { scale: 1.12 }, { scale: endScale, duration: 1.1, ease: motion.ease('paper') }, 0);
    } else if (kind === 'lines' && motion.SplitText) {
      entry.split = motion.SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        aria: 'none', // lines only: words stay whole, so assistive tech reads the text as-is
        onSplit(self) {
          g.set(el, { opacity: 1 });
          return g.fromTo(self.lines, { yPercent: 105 }, { yPercent: 0, duration: 1, delay, stagger: 0.08, ease: motion.ease('ink'), scrollTrigger: { ...st }, onComplete: done(el) });
        },
      });
    } else if (kind === 'lines') {
      // No SplitText available: degrade to a fade so the text never stays hidden.
      g.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, delay, ease: motion.ease('paper'), scrollTrigger: st, onComplete: done(el) });
    }

    // Parallax (desktop only): yPercent -n -> +n on the inner media, scrubbed, pre-scaled 1 + n/50.
    if (px) {
      const { media } = mediaOf(el);
      if (media.length) {
        if (kind !== 'media') g.set(media, { scale: 1 + n / 50 });
        g.fromTo(media, { yPercent: -n }, {
          yPercent: n, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    }
  });
  return entry;
}

export const reveal = {
  // Set up every [data-reveal] / [data-parallax] inside root (root included). Idempotent.
  scan(root = document) {
    if (!motion.on || !motion.gsap || !motion.ScrollTrigger) return 0;
    const r = root === document ? document.documentElement : root;
    const els = [];
    if (r.nodeType === 1 && r.matches('[data-reveal], [data-parallax]')) els.push(r);
    r.querySelectorAll('[data-reveal], [data-parallax]').forEach((el) => els.push(el));
    let count = 0;
    for (const el of els) {
      if (registry.has(el)) continue;
      if (!el.hasAttribute('data-reveal') && !(parallaxN(el) > 0 && parallaxActive())) continue;
      try {
        registry.set(el, setup(el));
        count++;
      } catch (e) {
        console.warn('[reveal]', e);
        el.classList.add('is-revealed');
      }
    }
    return count;
  },

  // Revert everything inside root (root included): inline styles, splits, ScrollTriggers.
  reset(root = document) {
    const r = root === document ? document.documentElement : root;
    for (const [el, entry] of registry) {
      if (!(el === r || r.contains(el))) continue;
      try { if (entry.split) entry.split.revert(); } catch (e) { /* ignore */ }
      try { if (entry.ctx) entry.ctx.revert(); } catch (e) { /* ignore */ }
      el.classList.remove('is-revealed');
      registry.delete(el);
    }
  },
};
