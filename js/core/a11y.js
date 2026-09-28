// Accessibility menu (SPEC §4.11). Markup: partials/a11y.html.
// Settings persist in localStorage['sele-a11y'] = {text:100|115|130, contrast, still, links, font};
// the inline boot script applies them before first paint, this module keeps them in sync at runtime.
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
    if (!toggle || !panel) return;
    syncControls();
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
