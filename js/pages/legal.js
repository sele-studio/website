// Legal pages + 404 (SPEC §5.8–§5.10; data-module="legal"). Owner: P5.
// Everything on these pages is static and complete without JS. The only enhancement: on the accessibility
// statement and the privacy notice, the "on this page" index (≥1100 px, [data-lg-toc]) marks the section being
// read with aria-current="location". IntersectionObserver only — no scroll listeners, no rAF, nothing runs
// while the page is still. The bilingual 404 needs no page code (i18n-boot.js applies English under /en/*).
//
// The reading line: a 1 px band just under the fixed header. The observed targets are the SECTIONS (not their
// headings), so the current item is the section that crosses the line. An index jump lands its heading at
// header + 16 px (scroll-padding), i.e. inside its own section, and every jump changes which section is under
// the line, so the highlight can never go stale. Between two sections (the 64 px gap) the section above keeps
// the mark; above section 01 or past the last section (the footer) nothing is current.

let io = null;
let links = [];
let secs = [];
let resizeTimer = 0;
let onResize = null;

function setCurrent(id) {
  for (const a of links) {
    if (id && a.hash === '#' + id) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  }
}

function headerHeight() {
  const hdr = document.querySelector('[data-header]');
  return hdr ? Math.round(hdr.getBoundingClientRect().height) : 0;
}

function update() {
  const line = headerHeight() + 1;
  let cur = null;
  for (const s of secs) {
    const r = s.el.getBoundingClientRect();
    if (r.top <= line && r.bottom > line) { cur = s; break; }       // crossing the line
    if (r.top <= line) cur = s;                                      // above it: candidate for "in the gap"
  }
  // past the end of the last section (footer): nothing is current
  if (cur && cur === secs[secs.length - 1] && cur.el.getBoundingClientRect().bottom <= line) cur = null;
  setCurrent(cur ? cur.id : '');
}

function observe() {
  if (io) io.disconnect();
  const hdr = headerHeight();
  const bottom = Math.max(0, window.innerHeight - hdr - 2);
  io = new IntersectionObserver(update, { rootMargin: `-${hdr + 1}px 0px -${bottom}px 0px`, threshold: 0 });
  secs.forEach((s) => io.observe(s.el));
}

export function init({ root } = {}) {
  destroy();
  const toc = (root || document).querySelector('[data-lg-toc]');
  if (!toc || !('IntersectionObserver' in window)) return;
  links = [...toc.querySelectorAll('a[href^="#"]')];
  secs = links
    .map((a) => {
      const id = decodeURIComponent(a.hash.slice(1));
      const h = document.getElementById(id);
      const el = h && (h.closest('.lg-sec') || h);
      return el ? { id, el } : null;
    })
    .filter(Boolean);
  if (!secs.length) return;
  observe();
  // the line's px margins depend on the viewport and the header height: rebuild them when either can change
  onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(observe, 150); };
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('sele:layoutchange', onResize);
}

export function destroy() {
  if (io) { io.disconnect(); io = null; }
  if (onResize) {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('sele:layoutchange', onResize);
    onResize = null;
  }
  clearTimeout(resizeTimer);
  links.forEach((a) => a.removeAttribute('aria-current'));
  links = [];
  secs = [];
}
