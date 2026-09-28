// W3 "Stepping through" (SPEC §4.12): cross-document View Transitions, never intercepting navigation.
// The CSS lives in css/motion.css. The `pagereveal` skip under motion-off is in the inline boot script.
const html = document.documentElement;
let lastCard = null;
let wired = false;

function clearNames() {
  document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => { el.style.viewTransitionName = ''; });
}

function sourceFor(card) {
  const sel = card.dataset.vtSource;
  let el = null;
  if (sel) { try { el = document.querySelector(sel); } catch (e) { el = null; } }
  if (!el || el.getClientRects().length === 0) el = card.querySelector('.frame__clip');
  return el;
}

export function wireViewTransitions() {
  if (wired) return;
  wired = true;

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { lastCard = null; return; }
    const a = e.target instanceof Element ? e.target.closest('a[data-vt-card]') : null;
    lastCard = a && (!a.target || a.target === '_self') ? a : null;
  }, true);

  window.addEventListener('pageswap', (e) => {
    const vt = e.viewTransition;
    if (!vt) return;
    if (html.classList.contains('motion-off')) { vt.skipTransition(); lastCard = null; return; }
    const card = lastCard;
    lastCard = null;
    if (!card || !e.activation || !e.activation.entry) return;
    let dest, from;
    try { dest = new URL(e.activation.entry.url).pathname; from = new URL(card.href).pathname; } catch (err) { return; }
    if (dest !== from) return;
    // Names must be unique: release the current page's own hero first.
    document.querySelectorAll('.case-hero__media').forEach((el) => { el.style.viewTransitionName = 'none'; });
    const src = sourceFor(card);
    if (src) src.style.viewTransitionName = 'hero-media';
  });

  window.addEventListener('pageshow', (e) => { if (e.persisted) clearNames(); });
}
