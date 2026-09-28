// Contact — "The Letter" (SPEC §5.6, §6; Addendum A7.4). Page module: init(ctx) / destroy().
// Native first: without JS the form posts to FormSubmit and lands on /contact/thanks/. With JS it becomes three steps,
// a live letter, and an AJAX send with success / activation-pending / error / offline states.
// app.js re-runs destroy() → init() on sele:motionchange / sele:layoutchange, so everything that must survive a
// re-init (current step, time-trap clock, draft flag, "pref touched") lives at module level, and the DOM keeps the values.
import { createSteps } from './contact/steps.js';
import { createValidator, normalizePhone, PHONE_RE, emailValid, FIELD_STEP } from './contact/validate.js';
import { renderLetter, letterText, detailLines, mailtoHref } from './contact/letter.js';
import { buildPayload, post, copyText } from './contact/send.js';
import { createDraft } from './contact/draft.js';
import { createAside, imageFor } from './contact/aside.js';

const SLUGS = ['stone-oak-kitchen', 'oak-living-room', 'travertine-bathroom', 'dark-oak-bedroom', 'dark-oak-kitchen'];
const SPACE_PARAM = { kitchen: 'kitchen', living: 'living', bath: 'baths', bedroom: 'bedrooms' };
const TRAP_MS = 3000;

// ---- state that survives re-init
const S = {
  booted: false,
  step: 1,
  firstInteraction: 0,     // time of the first keydown/pointerdown inside the form
  draftRestored: false,    // the time trap is skipped entirely when a draft was restored
  prefTouched: false,
  lastSpace: '',
  lastMaterial: '',
  sending: false,
  done: false,             // success shown
};

let ac = null;             // AbortController for every listener of this init
let steps = null;
let aside = null;
const timers = new Set();
const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

// ---------------------------------------------------------------- reading the form (language-neutral keys)
function readState(form) {
  const keys = (field) => [...form.querySelectorAll(`[data-field="${field}"] input[data-key]:checked`)].map((i) => i.dataset.key);
  const key = (field) => { const i = form.querySelector(`[data-field="${field}"] input[data-key]:checked`); return i ? i.dataset.key : ''; };
  const val = (field) => { const el = form.querySelector(`[data-field="${field}"]`); return el ? el.value : ''; };
  const sel = form.querySelector('[data-field="timing"]');
  const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
  return {
    spaces: keys('spaces'), services: keys('services'), property: key('property'), stage: key('stage'),
    materials: keys('materials'), location: val('location'), size: val('size'),
    timing: (opt && opt.dataset.key) || '', message: val('message'),
    name: val('name'), phone: val('phone'), email: val('email'),
    pref: key('pref'), time: key('time'), source: key('source'),
  };
}

export async function init(ctx) {
  const { i18n, motion, env, store } = ctx;
  const t = (k, v) => i18n.t(k, v);
  const form = document.querySelector('[data-contact-form]');
  const sheet = document.querySelector('[data-ct-sheet]');
  if (!form || !sheet) return;
  const body = sheet.querySelector('[data-ct-body]');
  ac = new AbortController();
  const sig = { signal: ac.signal };
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const letter = q('[data-ct-letter]', form);
  const letterBody = q('[data-ct-letter-body]', form);
  const letterLive = q('[data-ct-letter-live]', form);
  const sendBtn = q('[data-ct-send]', form);
  const sendLabel = q('[data-ct-send-label]', form);
  const seal = q('[data-ct-seal]', sheet);
  const success = q('[data-ct-success]', sheet);
  const draftBox = q('[data-ct-draft]', sheet);
  const counter = q('[data-ct-counter]', form);
  const message = q('[data-field="message"]', form);
  const copyStatus = q('[data-ct-copy-status]', form);
  const validator = createValidator({ form, t });
  const draft = createDraft({ store, form });
  aside = createAside(q('[data-ct-aside]'), { motion });

  // ---- JS mode: the steps take over from the browser's own validation
  form.noValidate = true;
  form.classList.add('is-stepped');
  const segs = q('[data-ct-segs]', sheet);
  if (segs) segs.hidden = false;
  const copyEmail = q('[data-ct-copy-email]');
  if (copyEmail) copyEmail.hidden = false;

  const state = () => readState(form);
  const saveDraft = () => { if (!S.done) draft.save(state(), { step: steps.current, prefTouched: S.prefTouched }); };

  // ---- first boot only: hidden fields, URL prefill, draft restore
  if (!S.booted) {
    S.booted = true;
    const landing = q('[data-field="landing"]', form);
    if (landing) landing.value = store.get('sele-landing', '', { session: true }) || '';
    const page = q('[data-field="page"]', form);
    if (page) page.value = location.pathname;
    const langField = q('[data-field="lang"]', form);
    if (langField) langField.value = i18n.lang === 'en' ? 'English' : 'עברית';

    const d = draft.read();
    if (d) {
      draft.apply(d);
      S.draftRestored = true;
      S.prefTouched = !!d.prefTouched;
      S.step = [1, 2, 3].includes(d.step) ? d.step : 1;
      if (draftBox) draftBox.hidden = false;
    }
    const params = new URLSearchParams(location.search);
    const sp = SPACE_PARAM[params.get('space')];
    if (sp) {
      const box = q(`[data-field="spaces"] input[data-key="${sp}"]`, form);
      if (box) { box.checked = true; S.lastSpace = sp; }
    }
    const ref = params.get('ref');
    if (ref && SLUGS.includes(ref)) {
      const refField = q('[data-field="ref"]', form);
      if (refField) refField.value = `/projects/${ref}/`;
    }
    if (!S.lastSpace) { const last = qa('[data-field="spaces"] input:checked', form).pop(); if (last) S.lastSpace = last.dataset.key; }
    const lastM = qa('[data-field="materials"] input:checked', form).pop();
    if (lastM) S.lastMaterial = lastM.dataset.key;
  }

  // ---- letter
  let letterFrame = 0;
  const updateLetter = () => {
    cancelAnimationFrame(letterFrame);
    letterFrame = requestAnimationFrame(() => renderLetter(letterBody, state(), t, i18n.lang));
  };

  const updateAside = () => aside.show(imageFor(steps.current, S.lastSpace, S.lastMaterial));

  let initializing = true;
  steps = createSteps({
    form, sheet, body, t, motion, env,
    onSwap(n) {
      // before the new step is measured: the letter belongs to step 3 and must count in the height tween
      if (letter) letter.hidden = n !== 3;
      if (n === 3) renderLetter(letterBody, state(), t, i18n.lang);
    },
    onShow(n, { entered }) {
      S.step = n;
      updateAside();
      if (n === 3) {
        if (entered && !initializing && letterLive) { letterLive.textContent = ''; later(() => { letterLive.textContent = letterText(state(), t, i18n.lang); }, 700); }
      }
      if (entered && !initializing) saveDraft();
    },
  });

  if (S.done) {
    // success already shown before a re-init: keep the panel
    steps.renderChrome(3);
  } else {
    steps.show(S.step, { focus: false, animate: false });
  }
  initializing = false;

  // ---- navigation
  const goNext = () => {
    const n = steps.current;
    const errs = validator.steps([n], state(), { prefTouched: S.prefTouched });
    if (errs.length) { focusFirstError(errs); return; }
    steps.show(n + 1, { dir: 1 });
  };
  const goBack = () => steps.show(steps.current - 1, { dir: -1 });
  const focusFirstError = (errs) => {
    const first = errs[0];
    const input = validator.inputOf(first.field);
    if (first.step !== steps.current) steps.show(first.step, { focus: false, animate: false });
    if (input) { input.focus({ preventScroll: false }); }
  };

  q('[data-ct-next]', form)?.addEventListener('click', goNext, sig);
  q('[data-ct-back]', form)?.addEventListener('click', goBack, sig);
  qa('[data-ct-seg]', sheet).forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.ctSeg);
    if (n < steps.current) steps.show(n, { dir: -1 });
  }, sig));

  form.addEventListener('keydown', (e) => steps.onKeydown(e, {
    onAdvance(n) { if (n < 3) goNext(); else form.requestSubmit ? form.requestSubmit() : sendBtn.click(); },
  }), sig);

  // time-trap clock: the first real interaction inside the form
  const mark = () => { if (!S.firstInteraction) S.firstInteraction = performance.now(); };
  form.addEventListener('keydown', mark, { ...sig, capture: true });
  form.addEventListener('pointerdown', mark, { ...sig, capture: true });

  // error-summary links focus their field
  form.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ct-jump]');
    if (!a) return;
    e.preventDefault();
    const input = validator.inputOf(a.dataset.ctJump);
    if (input) input.focus();
  }, sig);

  // ---- field behaviour: touched/blur validation, live re-check, pref auto-follow, counter, aside, letter, draft
  const touched = new Set();
  const prefAuto = () => {
    if (S.prefTouched) return;
    const s = state();
    const phone = normalizePhone(s.phone);
    const email = String(s.email || '').trim();
    const want = phone ? 'whatsapp' : email ? 'email' : 'whatsapp';
    const r = q(`[data-field="pref"] input[data-key="${want}"]`, form);
    if (r && !r.checked) r.checked = true;
  };
  const updateCounter = () => {
    if (!counter || !message) return;
    const n = message.value.length;
    counter.hidden = n <= 1600;
    if (n > 1600) counter.textContent = t('contact.message.counter', { n });
    counter.classList.toggle('is-near', n >= 1950);
  };

  form.addEventListener('input', (e) => {
    const f = e.target.dataset && e.target.dataset.field;
    if (f) touched.add(f);
    if (f === 'phone' || f === 'email') prefAuto();
    if (f === 'message') updateCounter();
    if (f && validator.isShown(f)) validator.field(f, state(), { prefTouched: S.prefTouched, full: false });
    if ((f === 'phone' || f === 'email') && validator.isShown('phone')) validator.field('phone', state(), { prefTouched: S.prefTouched, full: false });
    updateLetter();
    saveDraft();
  }, sig);

  form.addEventListener('change', (e) => {
    const input = e.target;
    const group = input.closest('[data-field]');
    const field = group && group.dataset.field;
    if (field === 'pref' && e.isTrusted) S.prefTouched = true;
    if (field === 'spaces' && input.checked) { S.lastSpace = input.dataset.key; updateAside(); }
    if (field === 'materials' && input.checked) { S.lastMaterial = input.dataset.key; updateAside(); }
    if (field === 'pref' && validator.isShown('phone')) validator.field('phone', state(), { prefTouched: S.prefTouched, full: true });
    updateLetter();
    saveDraft();
  }, sig);

  form.addEventListener('focusout', (e) => {
    const f = e.target.dataset && e.target.dataset.field;
    if (!f || !touched.has(f) || !['name', 'phone', 'email', 'message'].includes(f)) return;
    validator.field(f, state(), { prefTouched: S.prefTouched, full: false });
  }, sig);

  // letter "עריכה" buttons jump to the step holding the answer
  letterBody?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ct-edit]');
    if (!b) return;
    const n = Number(b.dataset.ctEdit);
    const field = b.dataset.ctEditField;
    const target = () => q(`[data-field="${field}"]`, form);
    const focusTarget = () => {
      const el = target();
      if (!el) return;
      const f = el.matches('input, select, textarea') ? el : (el.querySelector('input:checked') || el.querySelector('input'));
      if (f) { f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'center' }); }
    };
    if (n !== steps.current) {
      steps.show(n, { dir: n < steps.current ? -1 : 1, focus: false, animate: false });
      focusTarget();
    } else focusTarget();
  }, sig);

  // ---- draft notice: clear the form
  q('[data-ct-draft-clear]', sheet)?.addEventListener('click', () => {
    form.reset();
    draft.clear();
    S.draftRestored = false;
    S.prefTouched = false;
    S.lastSpace = '';
    S.lastMaterial = '';
    touched.clear();
    validator.clearAll();
    hideStates();
    updateCounter();
    if (draftBox) draftBox.hidden = true;
    steps.show(1, { dir: -1 });
    updateLetter();
  }, sig);

  // ---- copy the email (aside)
  if (copyEmail) {
    const label = q('[data-ct-copy-label]', copyEmail);
    const status = q('[data-ct-copy-email-status]');
    copyEmail.addEventListener('click', async () => {
      const ok = await copyText('office@sele-studio.com');
      if (!ok) return;
      if (label) label.textContent = t('common.copy.done');
      if (status) { status.textContent = ''; later(() => { status.textContent = t('common.copy.done'); }, 50); }
      later(() => { if (label) label.textContent = t('common.copy.email'); if (status) status.textContent = ''; }, 1600);
    }, sig);
  }

  // ---- state panels
  const panels = qa('[data-ct-state]', form);
  function hideStates() { panels.forEach((p) => { p.hidden = true; p.removeAttribute('tabindex'); }); }
  function showState(name) {
    hideStates();
    const p = panels.find((x) => x.dataset.ctState === name);
    if (!p) return;
    p.hidden = false;
    p.setAttribute('tabindex', '-1');
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
    const top = p.getBoundingClientRect().top;
    if (top < header || top > window.innerHeight - 80) window.scrollTo({ top: window.scrollY + top - header - 24, behavior: 'auto' });
    p.focus({ preventScroll: true });
    if (name === 'error' && motion.on && !document.documentElement.classList.contains('motion-off')) {
      sheet.classList.remove('is-shake');
      void sheet.offsetWidth;
      sheet.classList.add('is-shake');
      later(() => sheet.classList.remove('is-shake'), 400);
    }
  }

  // mailto built only on click; copy the details
  qa('[data-ct-mailto]', form).forEach((a) => a.addEventListener('click', () => {
    a.href = mailtoHref(state(), t, i18n.lang);
  }, sig));
  qa('[data-ct-copy-details]', form).forEach((b) => b.addEventListener('click', async () => {
    const ok = await copyText(detailLines(state(), t, i18n.lang));
    if (ok && copyStatus) { copyStatus.textContent = ''; later(() => { copyStatus.textContent = t('common.copy.done'); }, 50); }
  }, sig));
  qa('[data-ct-retry]', form).forEach((b) => b.addEventListener('click', () => {
    form.requestSubmit ? form.requestSubmit() : sendBtn.click();
  }, sig));

  // ---- send
  const setSending = (on) => {
    S.sending = on;
    sendBtn.disabled = on;
    if (on) sendBtn.setAttribute('aria-busy', 'true'); else sendBtn.removeAttribute('aria-busy');
    if (sendLabel) sendLabel.textContent = t(on ? 'contact.btn.sending' : 'contact.btn.send');
    if (seal) seal.classList.toggle('is-sending', on && motion.on);
  };

  async function showSuccess() {
    S.done = true;
    draft.clear();
    hideStates();
    const name = String(state().name || '').trim().replace(/\s+/g, ' ');
    const firstName = name.split(' ')[0] || '';
    const bodyP = q('[data-ct-success-body]', success);
    if (bodyP) bodyP.textContent = t('contact.state.successBody', { firstName });
    const on = motion.on && !document.documentElement.classList.contains('motion-off');
    if (seal) { seal.classList.remove('is-sending', 'is-pressed'); void seal.getBoundingClientRect(); seal.classList.add('is-pressed'); }
    const segsEl = q('[data-ct-segs]', sheet);
    if (on && body.animate) {
      await body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    }
    body.hidden = true;
    if (draftBox) draftBox.hidden = true;
    if (segsEl) segsEl.hidden = true;
    const prog = q('[data-ct-progress-wrap]', sheet);
    if (prog) prog.hidden = true;
    success.hidden = false;
    if (on && success.animate) success.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    aside.lightsOn();
    const h = q('#ct-success-h', success);
    if (h) {
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
      const sheetTop = sheet.getBoundingClientRect().top;
      const track = q('.ct-aside__track');
      const stick = track && q('.ct-aside__stick', track);
      let y = null;
      if (track && stick && track.getClientRects().length) {
        // ≥ 1100 px: bring the success panel AND the aside frame (its lights-on fade) on screen together. The frame is
        // sticky, so take the highest place it can occupy once the page is scrolled to the panel: its track's top, or
        // the track's bottom minus the frame's own height, whichever is lower.
        const tr = track.getBoundingClientRect();
        const frameTop = Math.max(tr.top, tr.bottom - stick.getBoundingClientRect().height);
        y = window.scrollY + Math.min(sheetTop, frameTop) - header - 16;
      } else if (sheetTop < header) {
        y = window.scrollY + sheetTop - header - 16;
      }
      if (y != null) {
        y = Math.max(0, y);
        if (motion.lenis && motion.scrollTo) motion.scrollTo(y, { offset: 0, immediate: true });
        else window.scrollTo({ top: y, behavior: 'auto' });
      }
      h.focus({ preventScroll: true });
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (S.sending || S.done) return;
    if (steps.current < 3) { goNext(); return; }
    hideStates();
    const s = state();
    const errs = validator.steps([1, 2, 3], s, { prefTouched: S.prefTouched });
    if (errs.length) { focusFirstError(errs); return; }

    // honeypot: a bot filled a field no human can see → show success, send nothing
    const honey = q('[data-field="honey"]', form);
    if (honey && honey.value) { await showSuccess(); return; }
    if (navigator.onLine === false) { showState('offline'); return; }
    // time trap (skipped entirely when a draft was restored)
    if (!S.draftRestored && (!S.firstInteraction || performance.now() - S.firstInteraction < TRAP_MS)) { showState('error'); return; }

    const emailOk = emailValid(s.email, q('[data-field="email"]', form));
    const payload = buildPayload(form, { lang: i18n.lang, emailOk });
    setSending(true);
    const outcome = await post(payload);
    setSending(false);
    if (outcome === 'success') await showSuccess();
    else if (outcome === 'pending') showState('pending');
    else showState(navigator.onLine === false ? 'offline' : 'error');
  }, sig);

  // initial renders
  prefAuto();
  updateCounter();
  if (steps.current === 3) renderLetter(letterBody, state(), t, i18n.lang);
  aside.sync();
  updateAside();
}

export function destroy() {
  if (ac) { ac.abort(); ac = null; }
  timers.forEach((id) => clearTimeout(id));
  timers.clear();
  if (steps) { steps.kill(); steps = null; }
  if (aside) { aside.destroy(); aside = null; }
}

// exported for the scripted tests (puppeteer imports this module in the page)
export const __test = { S, readState, PHONE_RE, FIELD_STEP };
