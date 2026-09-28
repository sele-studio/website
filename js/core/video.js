// Film policy (SPEC §4.14). Markup: <figure data-video> … <video data-sources='[…]'> … <button data-video-toggle hidden>.
// - No src/autoplay in HTML. Sources are attached near the viewport (rootMargin 200px) from the first
//   data-sources entry whose `media` matches (WebM first, then MP4).
// - Poster-only mode (motion-off, save-data, slow-2g/2g/3g): never auto-attach; the toggle shows ▶ and a
//   click (an explicit user request) attaches and plays.
// - Plays at ≥25% visible, pauses when it leaves and when the tab is hidden. Below 768px only the most
//   visible film plays. play() rejection → poster stays, toggle shows ▶.
// - The toggle is shown whenever a film is (or has been) playing (WCAG 2.2.2); it swaps label + icon.
// - Motion turned off at runtime (or poster-only mode) RESTS a film: paused, faded to opacity 0 so the
//   poster (and its alt text) shows again, then rewound to 0. Only the user's own ⏸ keeps the current frame.
import { i18n } from './i18n.js';

const html = document.documentElement;
const films = new Map(); // figure -> state
let ioNear = null;
let ioVis = null;
let bound = false;

const mobile = () => window.matchMedia('(max-width:767px)').matches;

function posterOnly() {
  if (html.classList.contains('motion-off') || html.classList.contains('save-data')) return true;
  const c = navigator.connection;
  if (c && c.saveData) return true;
  const t = c && c.effectiveType;
  return t === 'slow-2g' || t === '2g' || t === '3g';
}

function pickSources(v) {
  let list;
  try { list = JSON.parse(v.getAttribute('data-sources') || '[]'); } catch (e) { list = []; }
  return list.find((s) => !s.media || s.media === 'all' || window.matchMedia(s.media).matches) || null;
}

function attach(f) {
  if (f.attached || !f.video) return !!f.attached;
  const src = pickSources(f.video);
  if (!src) return false;
  const v = f.video;
  v.style.opacity = '0';
  v.style.transition = 'opacity 400ms cubic-bezier(.22,1,.36,1)';
  for (const [type, key] of [['video/webm', 'webm'], ['video/mp4', 'mp4']]) {
    if (!src[key]) continue;
    const s = document.createElement('source');
    s.src = src[key];
    s.type = type;
    v.appendChild(s);
  }
  v.muted = true;
  v.preload = 'metadata';
  v.load();
  f.attached = true;
  return true;
}

function setToggle(f, playing) {
  const b = f.toggle;
  if (!b) return;
  const key = playing ? 'common.video.pause' : 'common.video.play';
  b.setAttribute('aria-label', i18n.t(key));
  b.setAttribute('data-i18n-attr', 'aria-label:' + key);
  const use = b.querySelector('use');
  if (use) use.setAttribute('href', playing ? '#i-pause' : '#i-play');
  b.hidden = false;
}

function play(f) {
  if (!f.video || f.userPaused || f.suspended) return;
  if (!attach(f)) return;
  const p = f.video.play();
  if (p && p.catch) {
    p.catch(() => {
      f.blocked = true;
      f.el.classList.remove('is-playing');
      setToggle(f, false);
    });
  }
}

function pause(f) {
  if (f.video && !f.video.paused) f.video.pause();
}

// Back to the poster: pause, fade the video layer out, rewind once it is invisible.
function rest(f) {
  const v = f.video;
  if (!v) return;
  pause(f);
  f.el.classList.remove('is-playing');
  if (!f.attached) return;
  const still = html.classList.contains('motion-off');
  v.style.transition = still ? 'none' : 'opacity 400ms cubic-bezier(.22,1,.36,1)';
  v.style.opacity = '0';
  clearTimeout(f.rewind);
  const rewind = () => { if (v.paused && v.style.opacity === '0') { try { v.currentTime = 0; } catch (e) { /* no media yet */ } } };
  if (still) rewind(); else f.rewind = setTimeout(rewind, 450);
}

// Decide which films should play now.
function evaluate() {
  if (document.hidden) { films.forEach(pause); return; }
  const candidates = [...films.values()].filter((f) => f.ratio >= 0.25 && !f.userPaused && !f.suspended && (f.auto || f.userPlay));
  let allowed = new Set(candidates);
  if (mobile() && candidates.length > 1) {
    const best = candidates.reduce((a, b) => (b.ratio > a.ratio ? b : a));
    allowed = new Set([best]);
  }
  films.forEach((f) => { if (allowed.has(f)) play(f); else pause(f); });
}

function onToggle(f) {
  const v = f.video;
  if (!v) return;
  if (v.paused) {
    f.userPaused = false;
    f.userPlay = true;
    f.suspended = false;
    f.blocked = false;
    attach(f);
    const p = v.play();
    if (p && p.catch) p.catch(() => setToggle(f, false));
  } else {
    f.userPaused = true;
    v.pause();
  }
}

function register(el) {
  const video = el.querySelector('video');
  const toggle = el.querySelector('[data-video-toggle]');
  const f = { el, video, toggle, attached: false, ratio: 0, auto: false, userPaused: false, userPlay: false, suspended: false, blocked: false };
  films.set(el, f);
  if (video) {
    if (video.querySelector('source') || video.getAttribute('src')) f.attached = true;
    video.addEventListener('playing', () => {
      clearTimeout(f.rewind);
      if (!html.classList.contains('motion-off')) video.style.transition = 'opacity 400ms cubic-bezier(.22,1,.36,1)';
      video.style.opacity = '1';
      el.classList.add('is-playing');
      setToggle(f, true);
    });
    video.addEventListener('pause', () => {
      el.classList.remove('is-playing');
      if (f.toggle && !f.toggle.hidden) setToggle(f, false);
    });
  }
  if (toggle) toggle.addEventListener('click', () => onToggle(f));
  ioNear.observe(el);
  ioVis.observe(el);
  return f;
}

function mode(f) {
  f.auto = !posterOnly();
  if (!f.auto && f.toggle && !f.userPlay) setToggle(f, false); // visible ▶ under reduced motion / poster-only
}

function ensureObservers() {
  if (ioNear) return;
  ioNear = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const f = films.get(e.target);
      if (f && e.isIntersecting && f.auto) attach(f);
    }
  }, { rootMargin: '200px 0px' });
  ioVis = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const f = films.get(e.target);
      if (f) f.ratio = e.isIntersecting ? e.intersectionRatio : 0;
    }
    evaluate();
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
  if (!bound) {
    bound = true;
    document.addEventListener('visibilitychange', evaluate);
  }
}

export const video = {
  // Register new films inside root and re-evaluate the mode of every film (motion/save-data may have changed).
  scan(root = document) {
    if (!('IntersectionObserver' in window)) return;
    ensureObservers();
    const r = root === document ? document.documentElement : root;
    const els = r.matches && r.matches('[data-video]') ? [r] : [];
    r.querySelectorAll('[data-video]').forEach((el) => els.push(el));
    for (const el of els) if (!films.has(el)) register(el);
    films.forEach((f) => {
      if (!f.el.isConnected) { ioNear.unobserve(f.el); ioVis.unobserve(f.el); films.delete(f.el); return; }
      f.suspended = false;
      mode(f);
      if (!f.auto && !f.userPlay) rest(f); // poster-only now (save-data / reduced motion): back to the poster
      if (f.auto && f.ratio > 0) attach(f);
    });
    evaluate();
  },

  // Stop everything (motion turned off): every film returns to its poster (SPEC §9); the toggle shows ▶.
  pauseAll() {
    films.forEach((f) => {
      f.suspended = true;
      f.userPlay = false;
      rest(f);
      if (f.toggle) setToggle(f, false);
      f.auto = false;
    });
  },

  resumeAll() {
    films.forEach((f) => { f.suspended = false; mode(f); });
    evaluate();
  },
};
