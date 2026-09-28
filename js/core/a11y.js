// Accessibility menu (SPEC §4.11). Markup: partials/a11y.html.
// Settings persist in localStorage['sele-a11y'] = {text:100|115|130, contrast, still, links, font};
// the inline boot script applies them before first paint, this module keeps them in sync at runtime.
// Below 1100 px the button never rests on what is being read: it tucks away (fades, .is-tucked) on a downward scroll
// and, once the page is at rest, comes back only if the spot under it is clear (no text, no control, no small image:
// over the hero film, in the footer's cleared corner, in empty margins). It also comes back on a scroll up (like
// Safari's own toolbar), on keyboard focus and while its panel is open. The menu colophon carries a second entry to the
// same panel ("הגדרות נגישות"), so the settings are always one tap away even while the button is tucked.
// Also records the input modality on <html> (.input-pointer after a tap/click, removed by a navigation key), which
// chrome.css uses to keep the menu's keyboard-only close chip hidden after a tap in WebKit.
import { store } from './store.js';
import { emit } from './events.js';

const html = document.documentElement;
const KEY = 'sele-a11y';
const DEFAULTS = { text: 100, contrast: false, still: false, links: false, font: false };
const reducedMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

// ---- focus helpers (shared with menu.js) ----
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Tabbable elements inside `root`, in DOM order; unchecked radios of a group that has a checked one are skipped.
export function focusables(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.closest('[hidden], [inert]')) return false;
    if (el.type === 'radio' && !el.checked && el.name) {
      const group = root.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
      if ([...group].some((r) => r.checked)) return false;
    }
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    // visually-hidden-until-focus controls (clip / 1px) are still tabbable: keep them
    return el.getClientRects().length > 0 || el === document.activeElement || cs.position === 'absolute';
  });
}

// Keep Tab / Shift+Tab cycling inside `root`.
export function trapTab(e, root) {
  const list = focusables(root);
  if (!list.length) { e.preventDefault(); return; }
  const first = list[0];
  const last = list[list.length - 1];
  const active = document.activeElement;
  if (!root.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
  if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

let settings = { ...DEFAULTS };
let toggle, panel, lastFocus;

// ---- tuck while scrolling down, show at rest only where nothing is under it (below 1100 px) ----
const narrowMQ = window.matchMedia ? window.matchMedia('(max-width:1099px)') : null;
const CONTROL = 'a[href], button, input, select, textarea, label, summary, [role="button"]';
const MEDIA = 'img, video, picture, canvas, svg';

// true when no text glyph, small control or small picture lies under the button's tile
function spotClear() {
  const b = toggle.getBoundingClientRect();
  if (!b.width) return true;
  const box = { l: b.left - 2, r: b.right + 2, t: b.top - 2, b: b.bottom + 2 };
  const hit = (r) => r.width > 0 && r.height > 0 && r.right > box.l && r.left < box.r && r.bottom > box.t && r.top < box.b;
  const vw = window.innerWidth;
  const seen = new Set([toggle, panel, document.documentElement, document.body]);
  const range = document.createRange();
  const F = [0.02, 0.18, 0.34, 0.5, 0.66, 0.82, 0.98];   // ≈ 7 px apart: no line or link edge slips between samples
  for (const fx of F) {
    for (const fy of F) {
      for (const el of document.elementsFromPoint(b.left + b.width * fx, b.top + b.height * fy)) {
        if (seen.has(el) || toggle.contains(el)) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        // a picture or icon: only a full-bleed one (the hero film, an edge-to-edge plate) may carry the button
        if (el.matches(MEDIA) && r.width < vw * 0.95 && hit(r)) return false;
        // any control (its box, including drawn arrows and full-row links): a tap there must reach the control
        if (el.matches(CONTROL) && hit(r)) return false;
        for (const n of el.childNodes) {
          if (n.nodeType !== 3 || !n.textContent.trim()) continue;
          range.selectNodeContents(n);
          for (const rr of range.getClientRects()) if (hit(rr)) return false;
        }
      }
    }
  }
  return true;
}

function tuckOnScroll() {
  let lastY = window.scrollY;
  let raf = 0;
  let idle = 0;
  let recheck = 0;
  const show = () => toggle.classList.remove('is-tucked');
  const tuck = () => toggle.classList.add('is-tucked');
  const narrow = () => !!(narrowMQ && narrowMQ.matches);
  const settle = (again = true) => {
    idle = 0;
    // content that is still revealing (a line sliding up, a lazy image pushing text down) moves after the first look:
    // look once more when it has landed
    clearTimeout(recheck);
    if (again) recheck = setTimeout(() => settle(false), 900);
    if (!narrow() || !panel.hidden) { show(); return; }
    if (spotClear()) show(); else if (!toggle.matches(':focus-visible')) tuck();
  };
  const check = () => {
    raf = 0;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    if (!narrow() || !panel.hidden) { show(); return; }
    if (dy < -8) show();                 // a flick up brings it back
    else if (dy > 4) tuck();             // reading on: out of the way
    clearTimeout(idle);
    clearTimeout(recheck);
    if (dy >= -8) idle = setTimeout(settle, 180);   // at rest: back only where the corner is clear
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(check); }, { passive: true });
  window.addEventListener('resize', () => { clearTimeout(idle); idle = setTimeout(settle, 180); }, { passive: true });
  if (narrowMQ && narrowMQ.addEventListener) narrowMQ.addEventListener('change', () => settle());
  toggle.addEventListener('focus', show);
  // first rest: after layout and fonts (a reload mid-page, or a first screen with text in the corner)
  const first = () => requestAnimationFrame(() => settle());
  if (document.readyState === 'complete') first(); else window.addEventListener('load', first, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(first, () => {});
  first();
}

// ---- input modality (html.input-pointer), for keyboard-only affordances that WebKit shows after a tap ----
function trackModality() {
  const pointer = () => html.classList.add('input-pointer');
  document.addEventListener('pointerdown', pointer, { capture: true, passive: true });
  document.addEventListener('touchstart', pointer, { capture: true, passive: true });
  document.addEventListener('mousedown', pointer, { capture: true, passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (['Tab', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) html.classList.remove('input-pointer');
  }, true);
}

// ---- a second entry to the panel in the menu colophon ----
function addMenuEntry() {
  const foot = document.querySelector('[data-menu] .site-menu__foot');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  if (!foot || !menuToggle || foot.querySelector('[data-a11y-menu-entry]')) return;
  const label = toggle.querySelector('.u-visually-hidden');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'site-menu__a11y';
  btn.setAttribute('data-a11y-menu-entry', '');
  btn.setAttribute('aria-controls', 'a11y-panel');
  btn.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><use href="#i-a11y"/></svg><span></span>';
  btn.lastChild.textContent = (label && label.textContent.trim()) || (html.lang === 'en' ? 'Accessibility' : 'נגישות');
  btn.addEventListener('click', () => {
    // close the menu through its own toggle (menu.js restores focus to it and lifts inert), then open the panel
    if (menuToggle.getAttribute('aria-expanded') === 'true') menuToggle.click();
    toggle.classList.remove('is-tucked');
    requestAnimationFrame(() => open());
  });
  const statement = foot.querySelector('a[href$="/accessibility/"]');
  foot.insertBefore(btn, statement || null);
}

function read() {
  const raw = store.get(KEY, null);
  const s = raw && typeof raw === 'object' ? raw : {};
  const text = [100, 115, 130].includes(Number(s.text)) ? Number(s.text) : 100;
  return { text, contrast: !!s.contrast, still: !!s.still, links: !!s.links, font: !!s.font };
}

export function motionOffWanted(s = settings) {
  return !!s.still || !!(reducedMQ && reducedMQ.matches);
}

// Apply classes; returns true when the motion state changed.
function applyClasses() {
  if (settings.text === 100) html.removeAttribute('data-a11y-text');
  else html.setAttribute('data-a11y-text', String(settings.text));
  html.classList.toggle('a11y-contrast', settings.contrast);
  html.classList.toggle('a11y-links', settings.links);
  html.classList.toggle('a11y-font', settings.font);
  const off = motionOffWanted();
  const was = html.classList.contains('motion-off');
  html.classList.toggle('motion-off', off);
  if (off) html.classList.remove('will-animate');
  return was !== off;
}

function syncControls() {
  if (!panel) return;
  panel.querySelectorAll('[data-a11y]').forEach((input) => {
    const k = input.getAttribute('data-a11y');
    if (k === 'text') input.checked = Number(input.value) === settings.text;
    else if (k in settings) input.checked = !!settings[k];
  });
}

function commit() {
  const motionChanged = applyClasses();
  const isDefault = Object.keys(DEFAULTS).every((k) => settings[k] === DEFAULTS[k]);
  if (isDefault) store.remove(KEY); else store.set(KEY, settings);
  emit('sele:a11ychange', { settings: { ...settings } });
  if (motionChanged) emit('sele:motionchange', { on: !html.classList.contains('motion-off') });
}

function onChange(e) {
  const input = e.target.closest('[data-a11y]');
  if (!input) return;
  const k = input.getAttribute('data-a11y');
  if (k === 'text') { if (input.checked) settings.text = Number(input.value) || 100; }
  else if (k in settings) settings[k] = input.checked;
  commit();
}

function open() {
  if (!panel || !panel.hidden) return;
  lastFocus = document.activeElement;
  panel.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  const first = panel.querySelector('[data-a11y]:checked') || focusables(panel)[0];
  if (first) first.focus();
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onOutside, true);
}

function close({ restore = true } = {}) {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  document.removeEventListener('keydown', onKey, true);
  document.removeEventListener('pointerdown', onOutside, true);
  if (restore) (toggle || lastFocus)?.focus();
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key === 'Tab') trapTab(e, panel);
}

function onOutside(e) {
  if (panel.contains(e.target) || toggle.contains(e.target)) return;
  close({ restore: false });
}

export const a11y = {
  get settings() { return { ...settings }; },
  init() {
    settings = read();
    applyClasses();
    toggle = document.querySelector('[data-a11y-toggle]');
    panel = document.querySelector('[data-a11y-panel]');
    if (reducedMQ && reducedMQ.addEventListener) {
      reducedMQ.addEventListener('change', () => {
        if (applyClasses()) emit('sele:motionchange', { on: !html.classList.contains('motion-off') });
      });
    }
    trackModality();
    if (!toggle || !panel) return;
    syncControls();
    tuckOnScroll();
    addMenuEntry();
    toggle.addEventListener('click', () => (panel.hidden ? open() : close()));
    panel.addEventListener('change', onChange);
    panel.querySelector('[data-a11y-close]')?.addEventListener('click', () => close());
    panel.querySelector('[data-a11y-reset]')?.addEventListener('click', () => {
      settings = { ...DEFAULTS };
      syncControls();
      commit();
    });
  },
  close,
};
