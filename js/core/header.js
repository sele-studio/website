// Running head (SPEC §2.2): progress hairline (--progress 0…1 on [data-progress]), `is-scrolled` after 24px,
// and an aria-current fallback. The language link + pill live in lang.js (ADDENDUM A3.4).
// Scroll work is rAF-throttled per scroll event: nothing runs while the page is still.

const html = document.documentElement;
let header, progress, raf = 0, wired = false;

function update() {
  raf = 0;
  const y = window.scrollY || html.scrollTop || 0;
  if (header) header.classList.toggle('is-scrolled', y > 24);
  if (progress) {
    const max = Math.max(1, html.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, y / max));
    progress.style.setProperty('--progress', p.toFixed(4));
  }
}

function schedule() { if (!raf) raf = requestAnimationFrame(update); }

// aria-current fallback (sync-partials normally writes it statically).
function markCurrent() {
  const nav = document.body && document.body.dataset.nav;
  if (!nav || nav === 'none') return;
  document.querySelectorAll(`[data-header] [data-nav="${CSS.escape(nav)}"], [data-menu] [data-nav="${CSS.escape(nav)}"], #footer-nav [data-nav="${CSS.escape(nav)}"]`)
    .forEach((a) => { if (!a.hasAttribute('aria-current')) a.setAttribute('aria-current', a.pathname === location.pathname ? 'page' : 'true'); });
}

export const siteHeader = {
  init() {
    header = document.querySelector('[data-header]');
    progress = document.querySelector('[data-progress]');
    markCurrent();
    if (!wired) {
      wired = true;
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
    }
    update();
  },
  update: schedule,
};
