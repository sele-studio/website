// W1 — Aperture (SPEC §1.3). The whole timeline is CSS (css/fx.css, keyed on html.show-intro, which the inline boot
// script sets). This module only wires the end: when the layer's fade (or its 4 s safety) ends, or the visitor skips
// (html.intro-skip, set by the boot script's one-shot listener), or motion is switched off, it sets display:none on
// the layer and emits `sele:intro-done` exactly once. Imported by app.js as its first action; never by home.js.
// A failed import changes nothing: the CSS fade and safety net remove the layer on their own.
//
// export default mount(el, ctx) → unmount()

const END_ANIMATIONS = new Set(['fx-intro-out', 'fx-intro-safety']);

export default function mount(el, ctx = {}) {
  const html = document.documentElement;
  if (!el) return () => {};

  let finished = false;
  let observer = null;

  const emit = (name) => {
    if (ctx.emit) ctx.emit(name);
    else document.dispatchEvent(new CustomEvent(name));
  };

  function cleanup() {
    el.removeEventListener('animationend', onEnd);
    if (observer) { observer.disconnect(); observer = null; }
  }

  function finish() {
    if (finished) return;
    finished = true;
    el.style.display = 'none';
    cleanup();
    emit('sele:intro-done');
  }

  function onEnd(e) {
    if (e.target === el && END_ANIMATIONS.has(e.animationName)) finish();
  }

  const skipped = () => html.classList.contains('intro-skip') || html.classList.contains('motion-off') || !html.classList.contains('show-intro');

  el.addEventListener('animationend', onEnd);
  observer = new MutationObserver(() => { if (skipped()) finish(); });
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });

  // Late arrival (slow network): the CSS timeline may already be over, or the visitor may already have skipped.
  const cs = getComputedStyle(el);
  if (skipped() || cs.display === 'none' || cs.visibility === 'hidden') queueMicrotask(finish);

  return function unmount() {
    cleanup();
  };
}
