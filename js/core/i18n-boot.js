// i18n-boot (SPEC §4.4 + ADDENDUM A3.3): an `async` module in <head>. Importing ./i18n.js starts the
// dictionary load immediately (same URL sele.js imports: one instance), without waiting for the deferred
// vendors or app.js.
// Its only DOM work: on the bilingual 404 (<html data-bilingual>) served under /en/*, where the inline boot
// script has already set lang="en"/dir="ltr" and `i18n-pending`, apply English and release the text.
import { i18n } from './i18n.js';

const html = document.documentElement;

if (html.hasAttribute('data-bilingual') && i18n.lang === 'en') {
  const domReady = () => (document.readyState !== 'loading'
    ? Promise.resolve()
    : new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true })));
  i18n.ready
    .then(domReady)
    .then(() => { i18n.apply(document); html.setAttribute('data-i18n-applied', ''); })
    .catch((e) => console.warn('[i18n-boot]', e))
    .finally(() => html.classList.remove('i18n-pending'));
}
