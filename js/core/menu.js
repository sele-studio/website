// Menu overlay (SPEC §2.2, markup partials/menu.html) — below 1100px.
// Without JS the toggle is a plain link to #footer-nav. With JS it is a disclosure for a modal dialog:
// focus moves to the in-dialog close button, Tab cycles inside the dialog, Esc / toggle / close button /
// a link click close it, focus returns to the toggle, main + footer are inert, Lenis stops, and the
// header stays above the overlay (html.is-menu-open). The arch-open reveal is CSS
// (`.site-menu.is-open` keyframes in chrome.css); closing adds `.is-closing` and sets `hidden`
// after its animation (or 320ms at most).
import { i18n } from './i18n.js';
import { emit } from './events.js';
import { motion } from './motion.js';
import { trapTab } from './a11y.js';

const html = document.documentElement;
const WIDE = '(min-width:1100px)';
let toggle, dialog, label, closeBtn, openState = false, closeTimer = 0;

function inertTargets() {
  return [document.getElementById('main'), document.querySelector('body > footer'), document.querySelector('[data-a11y-toggle]')].filter(Boolean);
}

function setLabel(open) {
  if (!label) return;
  const key = open ? 'common.menu.close' : 'common.menu.open';
  label.textContent = i18n.has(key) ? i18n.t(key) : (open ? 'סגירה' : 'תפריט');
}

function open() {
  if (openState || !dialog) return;
  openState = true;
  finishClose();
  dialog.hidden = false;
  dialog.classList.add('is-open');
  html.classList.add('is-menu-open');
  toggle.setAttribute('aria-expanded', 'true');
  setLabel(true);
  inertTargets().forEach((el) => { el.inert = true; });
  motion.stop();
  (closeBtn || dialog.querySelector('a[href]'))?.focus();
  document.addEventListener('keydown', onKey, true);
  emit('sele:menu', { open: true });
}

function close({ restore = true } = {}) {
  if (!openState || !dialog) return;
  openState = false;
  dialog.classList.remove('is-open');
  dialog.classList.add('is-closing');
  const done = () => { if (!openState) { dialog.hidden = true; } finishClose(); };
  dialog.addEventListener('animationend', done, { once: true });
  closeTimer = setTimeout(done, 320);
  html.classList.remove('is-menu-open');
  toggle.setAttribute('aria-expanded', 'false');
  setLabel(false);
  inertTargets().forEach((el) => { el.inert = false; });
  motion.start();
  document.removeEventListener('keydown', onKey, true);
  if (restore) toggle.focus();
  emit('sele:menu', { open: false });
}

function finishClose() {
  clearTimeout(closeTimer);
  closeTimer = 0;
  if (dialog) dialog.classList.remove('is-closing');
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); close(); return; }
  if (e.key === 'Tab') trapTab(e, dialog);
}

export const menu = {
  get open() { return openState; },
  init() {
    toggle = document.querySelector('[data-menu-toggle]');
    dialog = document.querySelector('[data-menu]');
    if (!toggle || !dialog) return;
    label = toggle.querySelector('[data-menu-label]');
    closeBtn = dialog.querySelector('[data-menu-close]');
    toggle.addEventListener('click', (e) => { e.preventDefault(); openState ? close() : open(); });
    toggle.addEventListener('keydown', (e) => {
      // role="button" on an <a>: Space must activate too
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); openState ? close() : open(); }
    });
    closeBtn?.addEventListener('click', () => close());
    dialog.addEventListener('click', (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (a) close({ restore: false });
    });
    const mq = window.matchMedia(WIDE);
    const onWide = () => { if (mq.matches) close({ restore: false }); };
    mq.addEventListener ? mq.addEventListener('change', onWide) : mq.addListener(onWide);
    window.addEventListener('pageshow', (e) => { if (e.persisted) close({ restore: false }); });
  },
  close,
};
