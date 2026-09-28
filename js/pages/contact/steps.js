// Stepping (SPEC §6.1): one <fieldset data-step="n"> visible at a time. The outgoing step fades and moves 16 px toward
// inline-end while the incoming one arrives; the sheet height tweens (420 ms, paper). Focus moves to the new step's
// <legend tabindex="-1">. The progress line ("צעד n מתוך 3 · …") and three segments follow; completed segments go
// back. Under motion-off steps swap instantly. Keyboard: Enter in a text input moves to the next field, and on a
// step's last field acts as "המשך" (step 3: send). Enter never submits before step 3 and never acts in the textarea.

const TEXTLIKE = new Set(['text', 'tel', 'email', 'search', 'url', 'number']);

export function createSteps({ form, sheet, body, t, motion, env, onShow, onSwap }) {
  const steps = [...form.querySelectorAll('[data-step]')];
  const progress = sheet.querySelector('[data-ct-progress]');
  const segs = [...sheet.querySelectorAll('[data-ct-seg]')];
  const back = form.querySelector('[data-ct-back]');
  const next = form.querySelector('[data-ct-next]');
  const send = form.querySelector('[data-ct-send]');
  const notice = form.querySelector('[data-ct-notice]');
  let current = 1;
  let tl = null;

  const stepEl = (n) => steps.find((s) => Number(s.dataset.step) === n);
  const animOn = () => motion.on && !!motion.gsap && !document.documentElement.classList.contains('motion-off');

  function renderChrome(n) {
    if (progress) progress.textContent = t('contact.progress', { n, name: t(`contact.step${n}.legend`) });
    segs.forEach((b) => {
      const i = Number(b.dataset.ctSeg);
      b.classList.toggle('is-done', i < n);
      b.classList.toggle('is-current', i === n);
      b.disabled = i >= n;
      if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    if (back) back.hidden = n === 1;
    if (next) next.hidden = n === 3;
    if (send) send.hidden = n !== 3;
    if (notice) notice.hidden = n !== 3;
  }

  function scrollSheetIntoView() {
    const top = sheet.getBoundingClientRect().top;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
    if (top < header || top > window.innerHeight * 0.6) {
      if (motion.lenis && motion.scrollTo) motion.scrollTo(sheet, { offset: -(header + 16) });
      else window.scrollTo({ top: window.scrollY + top - header - 16, behavior: 'auto' });
    }
  }

  function focusLegend(n) {
    const lg = stepEl(n) && stepEl(n).querySelector('legend[tabindex]');
    if (lg) lg.focus({ preventScroll: true });
  }

  // Show step n. opts: { focus (default true), animate (default true), dir (+1 forward / -1 back) }
  function show(n, opts = {}) {
    n = Math.max(1, Math.min(3, n));
    const { focus = true, animate = true } = opts;
    const dir = opts.dir || (n >= current ? 1 : -1);
    const out = stepEl(current);
    const inn = stepEl(n);
    const same = out === inn;
    if (tl) { tl.progress(1).kill(); tl = null; }
    const finish = () => {
      renderChrome(n);
      if (focus) { scrollSheetIntoView(); focusLegend(n); }
      if (onShow) onShow(n, { entered: !same });
    };
    if (same || !animate || !animOn() || !out || !inn) {
      steps.forEach((s) => { s.hidden = s !== inn; s.style.opacity = ''; s.style.transform = ''; });
      if (onSwap) onSwap(n);
      current = n;
      finish();
      return;
    }
    const g = motion.gsap;
    const ease = motion.ease('paper');
    const dx = 16 * env.dirSign * dir;   // toward inline-end when moving forward
    const h0 = body.offsetHeight;
    body.classList.add('is-tweening');
    body.style.height = `${h0}px`;
    current = n;
    renderChrome(n);
    tl = g.timeline({
      onComplete() {
        g.set([out, inn], { clearProps: 'opacity,transform' });
        g.set(body, { clearProps: 'height' });
        body.classList.remove('is-tweening');
        tl = null;
        if (focus) { scrollSheetIntoView(); focusLegend(n); }
        if (onShow) onShow(n, { entered: true });
      },
    });
    let h1 = h0;
    tl.to(out, { opacity: 0, x: dx, duration: 0.18, ease: 'power1.in' })
      .add(() => {
        out.hidden = true;
        inn.hidden = false;
        if (onSwap) onSwap(n);
        g.set(inn, { opacity: 0, x: -dx });
        body.style.height = 'auto';
        h1 = body.offsetHeight;
        body.style.height = `${h0}px`;
      })
      .to(body, { height: () => h1, duration: 0.42, ease }, '>')
      .to(inn, { opacity: 1, x: 0, duration: 0.32, ease }, '<');
  }

  // Enter handling (capture on the form).
  function onKeydown(e, { onAdvance }) {
    if (e.key !== 'Enter' || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target;
    if (!el || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SELECT') return;
    if (el.tagName !== 'INPUT') return;
    e.preventDefault();                               // never an implicit submit
    if (!TEXTLIKE.has(el.type)) return;               // chips: Space toggles, Enter does nothing
    const scope = el.closest('[data-step]');
    const fields = [...scope.querySelectorAll('input, select, textarea')].filter((f) => {
      if (f.type === 'hidden' || f.disabled || f.closest('[hidden]')) return false;
      return f.tagName !== 'INPUT' || TEXTLIKE.has(f.type);
    });
    const i = fields.indexOf(el);
    const nextField = fields[i + 1];
    if (nextField && nextField.tagName !== 'TEXTAREA') { nextField.focus(); return; }
    if (nextField && nextField.tagName === 'TEXTAREA') { nextField.focus(); return; }
    onAdvance(current);
  }

  return {
    get current() { return current; },
    stepEl,
    show,
    renderChrome,
    onKeydown,
    kill() { if (tl) { tl.progress(1).kill(); tl = null; } body.style.height = ''; body.classList.remove('is-tweening'); },
  };
}
