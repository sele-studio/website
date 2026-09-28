// SELÈ STUDIO — case pages (SPEC §5.3). Owner: P2.
// Everything on a case page is static HTML + the core (reveals, parallax, films and view transitions are driven by
// data-* attributes). This module only owns the mobile float: below 1100 px, a "צרו קשר" button appears at the
// bottom inline-end once the reader has scrolled 60% of the page (SPEC §2.2, §5.3 item 10). Without JS it stays hidden.

const DEPTH = 0.6;
let ac = null;
let frame = 0;

export function init() {
  destroy();
  const btn = document.querySelector('[data-case-float]');
  if (!btn) return;
  const mq = window.matchMedia('(max-width:1099px)');
  ac = new AbortController();
  const { signal } = ac;
  let shown = !btn.hidden; // a re-init (motion / layout change) starts from the current state

  const show = (on) => {
    if (on === shown) return;
    shown = on;
    if (on) {
      btn.hidden = false;
      void btn.offsetWidth; // let the fade start from the hidden state
      btn.classList.add('is-shown');
    } else {
      btn.classList.remove('is-shown');
      btn.hidden = true;
    }
  };

  const update = () => {
    frame = 0;
    if (!mq.matches) { show(false); return; }
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    show(window.scrollY / max >= DEPTH);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  mq.addEventListener('change', schedule, { signal });
  update();
}

export function destroy() {
  if (ac) { ac.abort(); ac = null; }
  if (frame) { cancelAnimationFrame(frame); frame = 0; }
}
