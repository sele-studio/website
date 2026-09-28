// W4 — Vein Cut (SPEC §1.3, §5.1 H5). Desktop only (home.js mounts it when html.fx-desktop is set).
// Four close-ups of her renders share one sticky rectangular frame on the night ground while their names scroll past.
// Sticky, never pinned: the reader's scroll is never captured.
//   P ∈ [0, 3] = ScrollTrigger progress × 3 on the list (start "top center", end "bottom center").
//   Art direction: each material is shown whole while its own name and line sit at the centre of the viewport. So the
//     cut from picture k to k+1 runs over the middle 60 % of the scroll between the centres of items k and k+1
//     (measured in P on every refresh); `f` below is that cut's progress, 0 → 1, and the rest of the time the
//     picture rests, untouched. The active item is the one whose centre is nearest.
//   Mode B (ships first, and the fallback): picture i+1 is revealed by a rectangular curtain rising from the frame's
//     bottom edge (the same wipe as the site's media reveal): clip-path inset(T 0 0 0), T = 100 % × (1 − f).
//     Square-cornered at every frame (owner feedback 28/09/2026). (A named exception to "no animated clip-path",
//     SPEC §4.10.)
//   Mode A (vein-gl.js, imported only when its conditions hold): the same progress drives a WebGL1 dissolve whose
//     front travels along her own marble veins. Any failure or context loss returns to Mode B.
// Every fx.css rule is keyed on html.vein-ready, added in the same task the ScrollTrigger is built and removed on
// unmount together with every inline style, is-active class and the canvas. Nothing here reads location.
//
// export default mount(section, ctx) → unmount()

const DISP = '/assets/img/fx/vein-disp.jpg';

export default function mount(section, ctx = {}) {
  const html = document.documentElement;
  const cls = html.classList;
  const motion = ctx.motion || {};
  const gsap = motion.gsap || window.gsap;
  const ST = motion.ScrollTrigger || window.ScrollTrigger;
  const noop = () => {};

  if (!section || !gsap || !ST) return noop;
  if (cls.contains('motion-off') || !cls.contains('fx-desktop')) return noop;

  const frame = section.querySelector('[data-vein-frame]');
  const clip = frame && frame.querySelector('.frame__clip');
  const pics = frame ? [...frame.querySelectorAll('[data-vein-img]')]
    .sort((a, b) => Number(a.getAttribute('data-vein-img')) - Number(b.getAttribute('data-vein-img'))) : [];
  const items = [...section.querySelectorAll('[data-vein-step]')]
    .sort((a, b) => Number(a.getAttribute('data-vein-step')) - Number(b.getAttribute('data-vein-step')));
  const list = items.length ? items[0].parentElement : null;
  if (!frame || !clip || pics.length < 2 || !list) return noop;

  const LAST = pics.length - 1;          // 3 with four pictures
  const saved = new Map([frame, clip, ...pics].map((el) => [el, el.getAttribute('style')]));

  let dead = false;
  let gctx = null;
  let st = null;
  let lastP = NaN;
  let active = -1;
  let centers = [];        // P value at which each item's centre crosses the viewport centre
  let gl = null;           // { render(i, f), destroy() } once Mode A is live
  let glPending = false;
  const clipCache = new Array(pics.length).fill(null);
  const proxy = { P: 0 };

  // ---------------------------------------------------------------- Mode B: the rectangular curtain
  const HIDDEN = 'inset(100% 0 0 0)';   // = the css/fx.css resting state
  function setClip(k, value) {
    if (clipCache[k] === value) return;
    clipCache[k] = value;
    pics[k].style.clipPath = value;
  }
  function renderB(i, f) {
    for (let k = 1; k <= LAST; k++) {
      if (k <= i) setClip(k, 'none');
      else if (k === i + 1) {
        const T = +(100 * (1 - f)).toFixed(3);
        setClip(k, f <= 0 ? HIDDEN : f >= 1 ? 'none' : `inset(${T}% 0 0 0)`);
      } else setClip(k, HIDDEN);
    }
  }

  function measureCenters() {
    const L = list.getBoundingClientRect();
    if (!(L.height > 0)) { centers = []; return; }
    centers = items.map((el) => {
      const r = el.getBoundingClientRect();
      return (LAST * (r.top + r.height / 2 - L.top)) / L.height;
    });
  }

  // P → [i, f, nearest item]: rest on each picture around its item's centre, cut in the middle 60 % between centres.
  function cut(P) {
    const c = centers.length === items.length && items.length === pics.length ? centers : pics.map((_, k) => k);
    if (P <= c[0]) return [0, 0, 0];
    if (P >= c[LAST]) return [LAST - 1, 1, LAST];
    let k = 0;
    while (k < LAST - 1 && P >= c[k + 1]) k++;
    const u = (P - c[k]) / Math.max(1e-6, c[k + 1] - c[k]);
    const f = Math.max(0, Math.min(1, (u - 0.2) / 0.6));
    return [k, f, u < 0.5 ? k : k + 1];
  }

  function render(P, force) {
    if (!force && Math.abs(P - lastP) < 1e-4) return;
    lastP = P;
    const [i, f, near] = cut(P);
    if (gl) gl.render(i, f);
    else renderB(i, f);
    setActive(Math.min(items.length - 1, near));
  }

  function setActive(idx) {
    if (idx === active) return;
    active = idx;
    items.forEach((el, k) => el.classList.toggle('is-active', k === idx));
  }

  // ---------------------------------------------------------------- Mode A: WebGL (optional)
  function glAllowed() {
    if (cls.contains('save-data') || (navigator.connection && navigator.connection.saveData)) return false;
    if (!((navigator.hardwareConcurrency || 0) >= 4)) return false;
    return !!window.WebGLRenderingContext;
  }

  function dropGL() {
    const g = gl;
    gl = null;
    glPending = false;
    if (g) { try { g.destroy(); } catch (e) { /* ignore */ } }
    pics.forEach((p) => p.style.removeProperty('visibility'));
    clipCache.fill(null);
    if (!dead) render(proxy.P, true);
  }

  async function startGL() {
    if (!glAllowed() || glPending || gl) return;
    glPending = true;
    try {
      const { default: createVeinGL } = await import('/js/fx/vein-gl.js');
      if (dead) { glPending = false; return; }
      const g = createVeinGL({ clip, pictures: pics, disp: DISP, onLost: () => { if (gl === g || glPending) dropGL(); } });
      if (!g) { glPending = false; return; }
      await g.ready;
      if (dead || !glPending) { g.destroy(); return; }
      const [i, f] = cut(proxy.P);
      g.render(i, f);             // first frame drawn → only now does the canvas replace the pictures
      g.show();
      pics.forEach((pic) => { pic.style.visibility = 'hidden'; });
      gl = g;
      glPending = false;
    } catch (e) {
      console.warn('[fx/vein-cut] WebGL off, CSS wipe stays', e);
      dropGL();
    }
  }

  function onPageHide() { if (gl || glPending) dropGL(); }

  // ---------------------------------------------------------------- build
  cls.add('vein-ready');
  try {
    gctx = gsap.context(() => {
      const tween = gsap.to(proxy, {
        P: LAST,
        ease: 'none',
        onUpdate: () => render(proxy.P),
        scrollTrigger: {
          trigger: list,
          start: 'top center',
          end: 'bottom center',
          scrub: 0.5,
          onRefreshInit: () => { lastP = NaN; },
          onRefresh: () => { measureCenters(); render(proxy.P, true); },
        },
      });
      st = tween.scrollTrigger;
    });
  } catch (e) {
    console.warn('[fx/vein-cut]', e);
    cls.remove('vein-ready');
    if (gctx) { try { gctx.revert(); } catch (err) { /* ignore */ } }
    return noop;
  }
  measureCenters();
  render(proxy.P, true);
  window.addEventListener('pagehide', onPageHide);
  startGL();

  return function unmount() {
    if (dead) return;
    dead = true;
    window.removeEventListener('pagehide', onPageHide);
    if (gl || glPending) dropGL();
    if (gctx) { try { gctx.revert(); } catch (e) { /* ignore */ } gctx = null; }
    st = null;
    items.forEach((el) => el.classList.remove('is-active'));
    for (const [el, style] of saved) {
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    }
    cls.remove('vein-ready');
  };
}
