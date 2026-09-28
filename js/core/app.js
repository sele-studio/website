// app.js — boot sequence (SPEC §4.9), a deferred module loaded after the deferred vendor scripts.
import { env, DESKTOP_QUERY } from './env.js';
import { store } from './store.js';
import { on, emit } from './events.js';
import { i18n } from './i18n.js';
import { motion } from './motion.js';
import { reveal } from './reveal.js';
import { video } from './video.js';
import { loadScript } from './loader.js';
import { a11y } from './a11y.js';
import { siteHeader } from './header.js';
import { menu } from './menu.js';
import { cursor } from './cursor.js';
import { wireViewTransitions } from './vt.js';
import { lang } from './lang.js';

const html = document.documentElement;
const cls = html.classList;

const ctx = {
  root: document.getElementById('main') || document.body,
  env,
  t: (key, vars) => i18n.t(key, vars),
  i18n, motion, reveal, video, store, on, emit, loadScript,
};

// ---- 0. Aperture (W1): wire the CSS-driven intro first; never awaited, failures ignored. ----
if (cls.contains('show-intro')) {
  import('/js/fx/aperture.js')
    .then((m) => { const el = document.querySelector('[data-intro]'); if (el && m.default) m.default(el, ctx); })
    .catch(() => { /* the CSS safety net removes the layer */ });
}

let page = null;      // the page module ({ init, destroy })
let letterpress = null; // unmount fn
let busy = Promise.resolve();

// fx-desktop / fx-frame recomputed from scratch (never left stale).
function computeFx() {
  const desktop = !cls.contains('motion-off') && window.matchMedia(DESKTOP_QUERY).matches;
  cls.toggle('fx-desktop', desktop);
  cls.toggle('fx-frame', desktop && env.update().home);
  return desktop;
}

async function initPage() {
  if (!page || typeof page.init !== 'function') return;
  try { await page.init(ctx); } catch (e) { console.error('[app] page.init failed', e); }
}

function destroyPage() {
  if (!page || typeof page.destroy !== 'function') return;
  try { page.destroy(); } catch (e) { console.error('[app] page.destroy failed', e); }
}

async function mountLetterpress() {
  const el = document.querySelector('[data-fx="letterpress"]');
  if (!el || !cls.contains('fx-desktop') || letterpress) return;
  try {
    const m = await import('/js/fx/letterpress.js');
    if (m.default && cls.contains('fx-desktop') && !letterpress) letterpress = m.default(el, ctx) || null;
  } catch (e) { /* ignored: static emboss stays */ }
}

function unmountLetterpress() {
  if (typeof letterpress === 'function') { try { letterpress(); } catch (e) { /* ignore */ } }
  letterpress = null;
}

function refreshTriggers() {
  if (motion.ScrollTrigger && motion.on) { try { motion.ScrollTrigger.refresh(); } catch (e) { /* ignore */ } }
}

function frameWatchdog() {
  if (!cls.contains('fx-frame')) return;
  setTimeout(() => { if (!cls.contains('frame-ready')) cls.remove('fx-frame'); }, 2500);
}

// Tear down and rebuild after the motion setting or the desktop layout flipped.
function rebuild(reason) {
  busy = busy.then(async () => {
    destroyPage();
    unmountLetterpress();
    cursor.unmount();
    reveal.reset(document);
    computeFx();
    motion.refresh();
    if (reason === 'motion') {
      if (cls.contains('motion-off')) video.pauseAll(); else video.scan(document);
    }
    reveal.scan(document);
    await initPage();
    cursor.mount();
    mountLetterpress();
    refreshTriggers();
    frameWatchdog();
  });
  return busy;
}

async function boot() {
  // 1. env, store, a11y panel, data-year
  env.update();
  a11y.init();
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = year; });

  // 2. dictionaries (load started by i18n-boot.js). Language = URL: no swapping here, except the bilingual
  //    404 under /en/* if i18n-boot has not applied it (it normally has).
  await i18n.ready;
  if (html.hasAttribute('data-bilingual') && i18n.lang === 'en' && !html.hasAttribute('data-i18n-applied')) {
    i18n.apply(document);
    html.setAttribute('data-i18n-applied', '');
  }
  cls.remove('i18n-pending');

  // 3. header (progress, is-scrolled) + menu + language link / pill
  siteHeader.init();
  menu.init();
  lang.init();

  // 4. motion
  computeFx();
  if (!motion.init()) cls.remove('will-animate');

  // 5. reveals + films
  reveal.scan(document);
  video.scan(document);

  // 6. view transitions + cursor label
  wireViewTransitions();
  cursor.mount();

  // 7. page module
  const mod = document.body.dataset.module;
  if (mod) {
    try {
      page = await import(`/js/pages/${mod}.js`);
    } catch (e) {
      console.error('[app] page module failed to load:', mod, e);
      page = null;
    }
    await initPage();
  }
  refreshTriggers();

  // 8. letterpress (W6) on desktop
  mountLetterpress();

  // 9. fx-frame watchdog
  frameWatchdog();

  // runtime changes
  on('sele:motionchange', () => rebuild('motion'));
  const mq = window.matchMedia(DESKTOP_QUERY);
  const onLayout = () => {
    const was = cls.contains('fx-desktop');
    const now = !cls.contains('motion-off') && mq.matches;
    if (was === now) { env.update(); return; }
    rebuild('layout').then(() => emit('sele:layoutchange', { desktop: now }));
  };
  mq.addEventListener ? mq.addEventListener('change', onLayout) : mq.addListener(onLayout);

  // 10. ready
  emit('sele:ready');
}

boot().catch((e) => {
  console.error('[app] boot failed', e);
  cls.remove('will-animate', 'i18n-pending');
});
