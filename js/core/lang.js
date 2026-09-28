// Language link + suggestion pill (SPEC-ADDENDUM A3.4). Markup: partials/header.html.
// - The toggle is a plain link (a.lang-toggle[data-lang-switch]) whose href the tools write (sync-partials on
//   Hebrew pages, gen-en on English pages). Only if it is still a placeholder ('', '#', '{{…}}') do we compute
//   the counterpart here (/x/ <-> /en/x/). Navigation is never prevented and never automatic.
// - Clicking any [data-lang-switch] link (toggle or pill) stores localStorage['sele-lang'] = that link's lang.
// - Pill: when the stored choice is 'he'|'en' and differs from this page's language, [data-lang-pill] is shown
//   (fading in over 180ms only when motion is on). Its close button hides it and stores the page's language.
import { i18n } from './i18n.js';
import { store } from './store.js';

const html = document.documentElement;
const KEY = 'sele-lang';
let wired = false;

function counterpart() {
  const p = location.pathname.replace(/\/index\.html$/, '/');
  const isEn = /^\/en(\/|$)/.test(p);
  if (html.hasAttribute('data-bilingual')) return isEn ? '/' : '/en/';
  const base = isEn ? p.replace(/^\/en(?=\/|$)/, '') || '/' : p;
  return isEn ? base : base === '/' ? '/en/' : '/en' + base;
}

function fixHref(a) {
  const h = a.getAttribute('href') || '';
  if (!h || h === '#' || h.includes('{{')) a.setAttribute('href', counterpart() + location.hash);
}

export const lang = {
  init() {
    const links = document.querySelectorAll('[data-lang-switch]');
    links.forEach(fixHref);
    if (!wired) {
      wired = true;
      // Delegated so links added later (or re-rendered by i18n.apply on the 404) are covered too.
      document.addEventListener('click', (e) => {
        const a = e.target instanceof Element ? e.target.closest('[data-lang-switch]') : null;
        if (!a) return;
        const to = (a.getAttribute('lang') || '').toLowerCase().startsWith('en') ? 'en' : 'he';
        store.set(KEY, to);
      });
    }

    const pill = document.querySelector('[data-lang-pill]');
    if (!pill) return;
    const pref = store.get(KEY, null);
    if ((pref === 'he' || pref === 'en') && pref !== i18n.lang) {
      pill.hidden = false;
      if (!html.classList.contains('motion-off') && pill.animate) {
        pill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
    const close = pill.querySelector('[data-lang-pill-close]');
    if (close && !close.__sele) {
      close.__sele = true;
      close.addEventListener('click', () => {
        const hadFocus = pill.contains(document.activeElement);
        pill.hidden = true;
        store.set(KEY, i18n.lang);
        if (hadFocus) (document.querySelector('[data-header] [data-lang-switch]') || document.getElementById('main'))?.focus();
      });
    }
  },
};
