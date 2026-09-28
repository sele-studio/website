// SELÈ STUDIO — Projects index /projects/ (SPEC §5.2). Owner: P2.
//
// - Controls (view toggle, space + material filters, live count) are hidden in the HTML; this module reveals them.
// - State lives in the URL query (?view=index|gallery&space=…&material=…), written with history.replaceState.
//   No storage. Defaults: index view at ≥ 768 px, gallery below; space "all"; no material.
// - A case matches when (space === 'all' || case.spaceKey === space) && (!material || case.materialKeys ∋ material).
//   Non-matching items fade and scale to .96 and leave; the rest reflow with GSAP Flip (loaded on first use).
//   Switching views is a Flip matched by data-flip-id (index thumbnail ↔ gallery hero tile). motion-off: instant.
// - ≥ 1100 px: hovering or focusing an index row wipes its case hero into the sticky preview slot as a
//   rectangular curtain rising from the bottom edge (the wipe is CSS, so motion-off swaps instantly).
// - Count text is interpolated (data-i18n-tpl), rendered with i18n.t; aria-live="polite" announces it.
import { i18n, motion, loadScript } from '/js/core/sele.js';

const FLIP_SRC = '/assets/vendor/gsap/3.13.0/Flip.min.js';
const SPACES = ['all', 'kitchen', 'living', 'bath', 'bedroom'];
const RHYTHM = { s3: 3, s4: 4, s5: 5 };

let ac = null;
let running = null;      // the Flip timeline in flight
let state = null;
let els = null;
let prevZ = 2;
let prevCurrent = null;

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const defaultView = () => (window.matchMedia('(min-width:768px)').matches ? 'index' : 'gallery');
const animating = () => !!(motion.on && motion.gsap && !document.documentElement.classList.contains('motion-off'));

async function getFlip() {
  if (window.Flip) return window.Flip;
  try {
    await loadScript(FLIP_SRC);
    if (window.Flip && motion.gsap) motion.gsap.registerPlugin(window.Flip);
  } catch (e) { /* stay static */ }
  return window.Flip || null;
}

// ------------------------------------------------------------------ state ⇄ URL
function readUrl() {
  const q = new URLSearchParams(location.search);
  const materials = new Set($$('[data-pj-material]').map((b) => b.dataset.pjMaterial));
  const view = q.get('view');
  const space = q.get('space');
  const material = q.get('material');
  return {
    view: view === 'index' || view === 'gallery' ? view : defaultView(),
    viewSet: view === 'index' || view === 'gallery',
    space: SPACES.includes(space) ? space : 'all',
    material: materials.has(material) ? material : null,
  };
}

function writeUrl() {
  const q = new URLSearchParams(location.search);
  if (state.viewSet) q.set('view', state.view); else q.delete('view');
  if (state.space !== 'all') q.set('space', state.space); else q.delete('space');
  if (state.material) q.set('material', state.material); else q.delete('material');
  const s = q.toString();
  const url = location.pathname + (s ? '?' + s : '') + location.hash;
  if (url !== location.pathname + location.search + location.hash) {
    try { history.replaceState(history.state, '', url); } catch (e) { /* ignore */ }
  }
}

// ------------------------------------------------------------------ rendering (no animation)
const matches = (item) => {
  const okSpace = state.space === 'all' || item.dataset.space === state.space;
  const okMat = !state.material || (item.dataset.materials || '').split(' ').includes(state.material);
  return okSpace && okMat;
};

function applyControls() {
  for (const b of els.viewBtns) {
    const on = b.dataset.pjViewBtn === state.view;
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  }
  for (const b of els.spaceBtns) b.setAttribute('aria-pressed', b.dataset.pjSpace === state.space ? 'true' : 'false');
  for (const b of els.matBtns) b.setAttribute('aria-pressed', b.dataset.pjMaterial === state.material ? 'true' : 'false');
}

function applyFilter() {
  const cases = new Set();
  for (const item of els.items) {
    const ok = matches(item);
    item.classList.toggle('is-out', !ok);
    if (ok) cases.add(item.dataset.case);
  }
  // re-number the contact-sheet slots of the visible tiles so the rhythm never breaks
  // and mark the last visible tile, which projects.css stretches to the end of its row (no ragged ending)
  let i = 0;
  let last = null;
  for (const tile of els.tiles) {
    tile.classList.remove('is-last');
    if (tile.classList.contains('is-out')) continue;
    for (const [k, n] of Object.entries(RHYTHM)) tile.setAttribute(`data-${k}`, String(i % n));
    last = tile;
    i++;
  }
  if (last) last.classList.add('is-last');
  // the sticky preview (≥ 1100 px) never keeps showing a case the filter just removed
  if (cases.size && !cases.has(prevCurrent)) activatePreview([...cases][0], true);
  const n = cases.size;
  const text = n === 1 ? i18n.t('projects.index.count.one') : i18n.t('projects.index.count.many', { n });
  if (els.count.textContent !== text) els.count.textContent = text;
  els.empty.hidden = n !== 0;
  return n;
}

function applyView() {
  for (const v of els.views) v.hidden = v.dataset.pjView !== state.view;
}

// ------------------------------------------------------------------ animated changes
function finishRunning() {
  if (running) { try { running.progress(1); running.kill(); } catch (e) { /* ignore */ } running = null; }
  if (held && motion.gsap) { motion.gsap.killTweensOf(held); motion.gsap.set(held, { clearProps: 'height' }); held = null; }
}

// Flip with absolute:true lifts the items out of flow; tween the (new) view box from the old view's height to its
// own so the content below (film link, #built) glides instead of jumping under the tiles.
let held = null;
function holdHeight(g, from) {
  const h0 = from ? from.offsetHeight : 0;
  return (to) => {
    if (!to) return;
    const h1 = to.offsetHeight;
    if (Math.abs(h1 - h0) < 1) return;
    held = to;
    g.fromTo(to, { height: h0 }, { height: h1, duration: 0.9, ease: motion.ease('leaf'), clearProps: 'height', onComplete: () => { held = null; } });
  };
}

async function filterTo(next) {
  Object.assign(state, next);
  applyControls();
  writeUrl();
  if (!animating()) { applyFilter(); return; }
  const Flip = await getFlip();
  if (!Flip || !els) { applyFilter(); return; }
  finishRunning();
  const g = motion.gsap;
  const active = els.views.find((v) => !v.hidden);
  const items = active ? $$('[data-pj-item]', active) : [];
  const st = Flip.getState(items, { props: 'opacity' });
  const settle = holdHeight(g, active);
  applyFilter();
  settle(active);
  running = Flip.from(st, {
    duration: 0.9,
    ease: motion.ease('leaf'),
    stagger: 0.05,
    absolute: true,
    onEnter: (entering) => g.fromTo(entering, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, ease: motion.ease('paper') }),
    onLeave: (leaving) => g.to(leaving, { opacity: 0, scale: 0.96, duration: 0.4, ease: motion.ease('paper') }),
    onComplete: () => { g.set(items, { clearProps: 'opacity,scale,transform' }); running = null; },
  });
}

async function viewTo(view) {
  if (view === state.view) return;
  state.view = view;
  state.viewSet = true;
  applyControls();
  writeUrl();
  if (!animating()) { applyView(); return; }
  const Flip = await getFlip();
  if (!Flip || !els) { applyView(); return; }
  finishRunning();
  const g = motion.gsap;
  const flipEls = $$('[data-flip-id]', els.results);
  const st = Flip.getState(flipEls);
  const settle = holdHeight(g, els.views.find((v) => !v.hidden));
  applyView();
  const now = els.views.find((v) => !v.hidden);
  settle(now);
  const targets = $$('[data-flip-id]', now).filter((el) => !el.closest('.is-out') && el.getClientRects().length);
  const rest = $$('[data-pj-item]:not(.is-out)', now);
  running = Flip.from(st, {
    targets,
    duration: 0.9,
    ease: motion.ease('leaf'),
    absolute: true,
    scale: true,
    onEnter: (entering) => g.fromTo(entering, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: motion.ease('paper') }),
    onComplete: () => { running = null; },
  });
  g.fromTo(rest, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.04, ease: motion.ease('paper'), clearProps: 'opacity,transform' });
}

// ------------------------------------------------------------------ preview slot (≥ 1100 px)
function activatePreview(slug, instant = false) {
  if (!els.preview || slug === prevCurrent) return;
  const el = els.prevs.find((p) => p.dataset.pjPrev === slug);
  if (!el) return;
  prevCurrent = slug;
  const z = ++prevZ;
  el.style.zIndex = String(z);
  el.classList.add('is-active');
  el.classList.remove('is-wiping');
  const settle = () => {
    for (const p of els.prevs) if (p !== el && Number(p.style.zIndex || 0) < z) p.classList.remove('is-active');
  };
  if (instant || !animating()) { settle(); return; }
  void el.offsetWidth; // restart the CSS wipe
  el.classList.add('is-wiping');
  el.addEventListener('animationend', settle, { once: true });
}

// ------------------------------------------------------------------ keyboard: radiogroup arrows
function onSegKey(e) {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  e.preventDefault();
  const btns = els.viewBtns;
  let i = btns.indexOf(document.activeElement);
  if (i < 0) i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
  const rtl = document.documentElement.dir === 'rtl';
  if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = btns.length - 1;
  else {
    const fwd = e.key === 'ArrowDown' || (e.key === 'ArrowRight' && !rtl) || (e.key === 'ArrowLeft' && rtl);
    i = (i + (fwd ? 1 : -1) + btns.length) % btns.length;
  }
  btns[i].focus();
  viewTo(btns[i].dataset.pjViewBtn);
}

// ------------------------------------------------------------------ lifecycle
export function init() {
  destroy();
  const controls = document.querySelector('[data-pj-controls]');
  const results = document.querySelector('[data-pj-results]');
  if (!controls || !results) return;
  els = {
    controls, results,
    views: $$('[data-pj-view]', results),
    items: $$('[data-pj-item]', results),
    tiles: $$('.pj-tile[data-pj-item]', results),
    viewBtns: $$('[data-pj-view-btn]', controls),
    spaceBtns: $$('[data-pj-space]', controls),
    matBtns: $$('[data-pj-material]', controls),
    count: controls.querySelector('[data-pj-count]'),
    empty: results.querySelector('[data-pj-empty]'),
    preview: results.querySelector('[data-pj-preview]'),
    prevs: $$('[data-pj-prev]', results),
  };
  state = readUrl();
  prevCurrent = (els.prevs.find((p) => p.classList.contains('is-active')) || {}).dataset?.pjPrev || null;
  controls.hidden = false;
  applyControls();
  applyView();
  applyFilter();
  results.classList.add('is-ready');   // hands the layout over from the pre-JS CSS (projects.css, CLS)

  ac = new AbortController();
  const { signal } = ac;
  for (const b of els.viewBtns) b.addEventListener('click', () => viewTo(b.dataset.pjViewBtn), { signal });
  els.viewBtns[0] && els.viewBtns[0].parentElement.addEventListener('keydown', onSegKey, { signal });
  for (const b of els.spaceBtns) b.addEventListener('click', () => { if (b.dataset.pjSpace !== state.space) filterTo({ space: b.dataset.pjSpace }); }, { signal });
  for (const b of els.matBtns) b.addEventListener('click', () => filterTo({ material: state.material === b.dataset.pjMaterial ? null : b.dataset.pjMaterial }), { signal });
  const clear = results.querySelector('[data-pj-clear]');
  if (clear) clear.addEventListener('click', () => {
    filterTo({ space: 'all', material: null });
    const all = els.spaceBtns.find((b) => b.dataset.pjSpace === 'all');
    if (all) all.focus();
  }, { signal });

  const wide = window.matchMedia('(min-width:1100px)');
  const onRow = (e) => {
    if (!wide.matches) return;
    const row = e.target instanceof Element ? e.target.closest('[data-pj-row]') : null;
    if (row) activatePreview(row.dataset.pjRow);
  };
  results.addEventListener('pointerover', onRow, { signal });
  results.addEventListener('focusin', onRow, { signal });
}

export function destroy() {
  finishRunning();
  if (ac) { ac.abort(); ac = null; }
  if (els) for (const p of els.prevs) p.classList.remove('is-wiping');
  els = null;
}
