// W2 — The Frame (SPEC §1.3, §5.1 H1–H2). Desktop only (home.js mounts it when html.fx-frame is set).
// The hero film starts full-bleed behind the copy; as the visitor scrolls (a pin of +120vh with a skip link), five
// paper "shutters" close around a tall doorway window at the inline-end, the arch grows at its physical top-right,
// the film slides so the plate shows its centre, the copy turns from paper to ink and the manifesto rises beneath it.
// The end state is the static split hero of home.css, pixel for pixel: the plate IS the static film frame's rectangle
// (read from [data-frame-target] on every refresh).
//
// Rules kept here: transform/opacity only (plus text colour and the custom properties that feed them); the playing
// video is never clipped or scaled; the film translates only once the full-height start shutter is opaque, so no
// film edge or bare stage is ever visible. Every visual rule lives in css/fx.css keyed on html.frame-ready, which is
// added in the same task the ScrollTrigger is built and removed on unmount together with every inline style this
// module wrote, `is-flat`, `is-inked` and `is-header-over-media`. Nothing here reads location.
//
// The ground behind the copy and the copy's colour are ONE step, not a scroll-linked blend (QA: a blend left the copy
// mid-grey on a half-paper ground, ≈ 1.3:1, at scroll positions a reader can rest on). When the timeline's own
// (scrubbed) progress crosses INK_AT, the stage gets `is-inked` and css/fx.css cross-fades, in 320 ms of time, the
// start shutter film → paper, the scrim out and the copy paper → ink together. So at every scroll position the copy is
// either paper on film + scrim (the p = 0 ground) or ink on paper (the p = 1 ground). A scroll-bound floor
// (--g-scroll on the start shutter, p .30 → .42) still guarantees the shutter is opaque before the film slides at
// p .45, however fast the visitor flings past the step.
//
// export default mount(section, ctx) → unmount()

const PIN_END = '+=120%';
const INK_AT = 0.25;      // the copy + ground step (timeline progress)
const FLOOR_AT = 0.3;     // scroll-bound floor for the start shutter / scrim …
const FLOOR_END = 0.42;   // … complete here, before the film slides at .45

export default function mount(section, ctx = {}) {
  const html = document.documentElement;
  const cls = html.classList;
  const motion = ctx.motion || {};
  const gsap = motion.gsap || window.gsap;
  const ST = motion.ScrollTrigger || window.ScrollTrigger;
  const noop = () => {};

  if (!section || !gsap || !ST) return noop;
  if (cls.contains('motion-off') || !cls.contains('fx-frame')) return noop;
  if (!(window.CSS && CSS.supports('color', 'color-mix(in srgb, red 50%, blue)'))) return noop;

  const q = (sel) => section.querySelector(sel);
  const stage = q('[data-frame-stage]');
  const copy = q('[data-frame-copy]');
  const target = q('[data-frame-target]');
  const film = q('[data-frame-film]');
  const scrim = q('[data-frame-scrim]');
  const shutterBox = q('[data-frame-shutters]');
  const manifesto = q('[data-frame-manifesto]');
  const clip = film && film.querySelector('.frame__clip');
  const toggle = film && film.querySelector('[data-video-toggle]');
  const sh = {};
  if (shutterBox) shutterBox.querySelectorAll('[data-shutter]').forEach((s) => { sh[s.getAttribute('data-shutter')] = s; });
  if (!stage || !copy || !target || !film || !clip || !scrim || !sh.top || !sh.bottom || !sh.start || !sh.end || !sh.corner) return noop;

  const ease = (n) => (motion.ease ? motion.ease(n) : 'none');
  const rtl = (html.getAttribute('dir') || 'rtl') === 'rtl';

  // Every element whose style attribute this module may touch: restored byte for byte on unmount.
  const touched = [stage, copy, film, clip, scrim, shutterBox, manifesto, toggle, ...Object.values(sh)].filter(Boolean);
  const saved = new Map(touched.map((el) => [el, el.getAttribute('style')]));

  let dead = false;
  let built = false;
  let gctx = null;
  let tl = null;
  let st = null;
  let split = null;
  let manTween = null;
  let manRO = null;
  let fadeTween = null;
  let mountTween = null;
  let raf1 = 0;
  let raf2 = 0;
  const G = { dx: 0 };

  // ---------------------------------------------------------------- geometry (physical px, relative to the stage)
  function measure() {
    const S = stage.getBoundingClientRect();
    const R = target.getBoundingClientRect();
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const T = { l: R.left - S.left, t: R.top - S.top, w: R.width, h: R.height };
    T.r = T.l + T.w;
    T.b = T.t + T.h;
    if (!(W > 0 && H > 0 && T.w > 0 && T.h > 0)) return false;
    // The window sits on the inline-end side: physical left in RTL, right in LTR.
    const outerLeft = rtl;
    const px = (v) => `${v}px`;
    const place = (el, x, y, w, h) => {
      el.style.left = px(x);   // physical on purpose: the shutters are laid out in stage pixels
      el.style.top = px(y);
      el.style.width = px(Math.max(0, w));
      el.style.height = px(Math.max(0, h));
    };
    place(sh.top, 0, 0, W, T.t);
    place(sh.bottom, 0, T.b, W, H - T.b);
    // the end shutter overlaps the top/bottom shutters by 1 px so their meeting line never shows the film
    if (outerLeft) place(sh.end, 0, T.t - 1, T.l, T.h + 2);
    else place(sh.end, T.r, T.t - 1, W - T.r, T.h + 2);
    // the start shutter is full stage height, from the start edge to the window
    if (outerLeft) place(sh.start, T.r, 0, W - T.r, H);
    else place(sh.start, 0, 0, T.l, H);
    // corner piece: R × R at the window's physical top-right, a concave quarter arc of radius R = 0.8 × width
    // (1 px bleed up and outward, both over paper, so its edges never seam against the neighbours)
    const Rr = 0.8 * T.w;
    place(sh.corner, T.r - Rr, T.t - 1, Rr + 1, Rr + 1);
    sh.corner.style.background = `radial-gradient(circle ${Rr}px at 0 100%, transparent ${Math.max(0, Rr - 0.5)}px, var(--paper) ${Rr}px)`;
    sh.corner.style.transformOrigin = '100% 0';
    // the film slides so the plate shows its centre
    G.dx = T.l + T.w / 2 - W / 2;
    // the film toggle: the plate's bottom inline-end corner, 16 px in
    if (toggle) {
      const tw = toggle.offsetWidth || 44;
      const th = toggle.offsetHeight || 44;
      toggle.style.left = px(outerLeft ? T.l + 16 : T.r - 16 - tw);
      toggle.style.top = px(T.b - 16 - th);
    }
    return true;
  }

  // ---------------------------------------------------------------- manifesto lines (Hebrew by lines only)
  // A small line splitter of our own: GSAP SplitText 3.13 finds a single "line" in any right-to-left paragraph, so
  // it cannot split Hebrew. Words are measured once in place, then regrouped into one block <span> per rendered line
  // (words stay whole, so assistive tech reads the sentence as written). revert() restores the original markup.
  function splitLines(el) {
    const original = el.innerHTML;
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return null;
    const words = text.split(' ');
    el.textContent = '';
    const spans = words.map((w, k) => {
      const sp = document.createElement('span');
      sp.textContent = w;
      el.appendChild(sp);
      if (k < words.length - 1) el.appendChild(document.createTextNode(' '));
      return sp;
    });
    const rows = [];
    let top = null;
    spans.forEach((sp, k) => {
      const y = Math.round(sp.offsetTop);
      if (top === null || Math.abs(y - top) > 2) { rows.push([]); top = y; }
      rows[rows.length - 1].push(words[k]);
    });
    el.textContent = '';
    const lines = rows.map((row) => {
      const line = document.createElement('span');
      line.style.display = 'block';
      line.textContent = row.join(' ');
      el.appendChild(line);
      return line;
    });
    // revert only what is still ours: if someone else rewrote the text meanwhile (an i18n.apply), keep theirs
    return { lines, width: el.clientWidth, revert() { if (lines.every((l) => l.parentNode === el)) el.innerHTML = original; } };
  }

  function lineTween(lines) {
    if (!tl) return;
    if (manTween) { manTween.kill(); manTween = null; }
    if (!lines || !lines.length) return;
    const each = 0.45 / lines.length;
    manTween = gsap.fromTo(lines, { opacity: 0.12 }, { opacity: 1, duration: each, stagger: each, ease: 'none' });
    tl.add(manTween, 0.55);
    tl.render(tl.time(), false, true);
  }

  function splitManifesto() {
    if (!manifesto || dead) return;
    if (split) { split.revert(); split = null; }
    try {
      split = splitLines(manifesto);
      lineTween(split ? split.lines : null);
    } catch (e) {
      if (split) { split.revert(); split = null; }
    }
  }

  // re-split when the manifesto's width changes (resize) and once the web fonts have arrived
  function watchManifesto() {
    if (!manifesto || !('ResizeObserver' in window)) return;
    let pending = 0;
    manRO = new ResizeObserver(() => {
      if (pending || !split || manifesto.clientWidth === split.width) return;
      pending = requestAnimationFrame(() => { pending = 0; if (!dead && tl) splitManifesto(); });
    });
    manRO.observe(manifesto);
  }

  // ---------------------------------------------------------------- the ground + copy step (see the header)
  let inked = null;
  function syncInk() {
    if (!tl) return;
    const on = tl.progress() >= INK_AT;
    if (on === inked) return;
    inked = on;
    stage.classList.toggle('is-inked', on);
  }

  // ---------------------------------------------------------------- the scroll timeline
  function buildTimeline() {
    gctx = gsap.context(() => {
      tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: PIN_END,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          refreshPriority: 1,
          onRefreshInit: () => { measure(); },
          // a refresh (mount mid-pin, resize) jumps the timeline with its events suppressed: re-read the step here
          onRefresh: () => { syncInk(); },
          onUpdate: (self) => { cls.toggle('is-header-over-media', self.progress < 0.35); syncInk(); },
        },
      });
      const leaf = ease('leaf');
      // the three outer shutters travel at a constant rate, so the last sliver of film closes decisively at p .60
      tl.fromTo(sh.top, { yPercent: -100 }, { yPercent: 0, duration: 0.6 }, 0)
        .fromTo(sh.bottom, { yPercent: 100 }, { yPercent: 0, duration: 0.6 }, 0)
        .fromTo(sh.end, { xPercent: rtl ? -100 : 100 }, { xPercent: 0, duration: 0.6 }, 0)
        .fromTo(sh.start, { '--g-scroll': 0 }, { '--g-scroll': 1, duration: FLOOR_END - FLOOR_AT }, FLOOR_AT)
        .fromTo(scrim, { '--scrim': 1 }, { '--scrim': 0, duration: FLOOR_END - FLOOR_AT }, FLOOR_AT)
        .fromTo(sh.corner, { scale: 0 }, { scale: 1, duration: 0.4, ease: leaf }, 0.25)
        .fromTo(clip, { x: 0 }, { x: () => G.dx, duration: 0.17, ease: leaf }, 0.45);
      if (manifesto) tl.fromTo(manifesto, { opacity: 0 }, { opacity: 1, duration: 0.001 }, 0.499);
      tl.set({}, {}, 1); // the timeline is exactly p = 0 … 1
      tl.eventCallback('onUpdate', syncInk);   // the ground + copy step follows the scrubbed timeline, not raw scroll
      st = tl.scrollTrigger;
    });
    syncInk();
    splitManifesto();
    watchManifesto();
    cls.toggle('is-header-over-media', st ? st.progress < 0.35 : false);
  }

  // ---------------------------------------------------------------- mount swap (static split → start state)
  function build(fadeIn) {
    if (dead) return;
    fadeTween = null;
    clip.style.removeProperty('opacity');
    if (fadeIn) {
      // Hidden for the one frame in which the figure leaves the grid, so the swap is never a layout shift.
      stage.style.setProperty('--mount', '0');
      clip.style.visibility = 'hidden';
      if (toggle) toggle.style.visibility = 'hidden';
    }
    film.classList.add('is-flat');
    cls.add('frame-ready');
    try {
      if (!measure()) throw new Error('frame: target has no size');
      buildTimeline();
      built = true;
    } catch (e) {
      console.warn('[fx/frame]', e);
      teardown();
      return;
    }
    if (!fadeIn) return;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        raf1 = raf2 = 0;
        if (dead) return;
        clip.style.removeProperty('visibility');
        if (toggle) toggle.style.removeProperty('visibility');
        const m = { v: 0 };
        mountTween = gsap.to(m, {
          v: 1, duration: 0.22, ease: 'none',
          onUpdate: () => stage.style.setProperty('--mount', m.v.toFixed(3)),
          onComplete: () => { mountTween = null; stage.style.removeProperty('--mount'); },
        });
      });
    });
  }

  function teardown() {
    if (raf1) cancelAnimationFrame(raf1);
    if (raf2) cancelAnimationFrame(raf2);
    raf1 = raf2 = 0;
    if (fadeTween) { fadeTween.kill(); fadeTween = null; }
    if (mountTween) { mountTween.kill(); mountTween = null; }
    if (manTween) { manTween.kill(); manTween = null; }
    if (manRO) { manRO.disconnect(); manRO = null; }
    if (split) { try { split.revert(); } catch (e) { /* ignore */ } split = null; }
    if (gctx) { try { gctx.revert(); } catch (e) { /* ignore */ } gctx = null; }
    tl = null;
    st = null;
    built = false;
    inked = null;
    stage.classList.remove('is-inked');
    film.classList.remove('is-flat');
    cls.remove('frame-ready', 'is-header-over-media');
    for (const [el, style] of saved) {
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    }
  }

  // Start: fade the static door out (140 ms), swap, fade the full-bleed start state in (220 ms) — 360 ms in all.
  const r = stage.getBoundingClientRect();
  const inView = r.bottom > 0 && r.top < window.innerHeight;
  if (inView) {
    fadeTween = gsap.to(clip, { opacity: 0, duration: 0.14, ease: 'none', onComplete: () => build(true) });
  } else {
    build(false);
  }

  // Web fonts can change the copy's height (and so the plate's row) after the first measure.
  if (document.fonts && document.fonts.status !== 'loaded') {
    document.fonts.ready.then(() => {
      if (dead || !built) return;
      splitManifesto();
      try { ST.refresh(); } catch (e) { /* ignore */ }
    });
  }

  return function unmount() {
    if (dead) return;
    dead = true;
    const wasBuilt = built;
    teardown();
    if (wasBuilt) { try { ST.refresh(); } catch (e) { /* ignore */ } }
  };
}
