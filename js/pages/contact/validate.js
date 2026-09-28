// Validation (SPEC §6.4): on blur for touched fields, on "המשך" for the step, on send for all; never on the first
// keystroke. Messages come from the contact dictionary (contact.err.*); each field's message element is
// <p class="field__error" id="err-<field>" data-ct-err="<field>">, already linked through aria-describedby.

export const PHONE_RE = /^(?:\+972|0)(?:[23489]|5\d|7\d)\d{7}$|^\+\d{8,15}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizePhone = (v) => String(v || '').trim().replace(/[\s\-()]/g, '');
export const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ');

export function phoneValid(v) { return PHONE_RE.test(normalizePhone(v)); }
export function emailValid(v, input) {
  const s = String(v || '').trim();
  if (!s) return false;
  const typeOk = input ? !(input.validity && input.validity.typeMismatch) : true;
  return typeOk && EMAIL_RE.test(s);
}

// Which fields each step validates. Steps 1–2 hold optional answers; only the message length can fail there.
export const STEP_FIELDS = { 1: [], 2: ['message'], 3: ['name', 'phone', 'email'] };
export const FIELD_STEP = { message: 2, name: 3, phone: 3, email: 3 };

/**
 * Rules for one field.
 * @param {string} field
 * @param {object} s   form state (contact.js readState)
 * @param {object} o   { full: bool (continue/send: cross-field rules too), prefTouched: bool, inputs: {email: el} }
 * @returns {string} dictionary key of the message, or ''
 */
export function ruleFor(field, s, o = {}) {
  switch (field) {
    case 'name': {
      const n = normalizeName(s.name);
      if (!n) return 'contact.err.nameMissing';
      if (n.length < 2) return 'contact.err.nameShort';
      return '';
    }
    case 'phone': {
      const p = normalizePhone(s.phone);
      if (p && !PHONE_RE.test(p)) return 'contact.err.phoneInvalid';
      if (!o.full) return '';
      if (!p && !String(s.email || '').trim()) return 'contact.err.contactMissing';
      if (!p && o.prefTouched && (s.pref === 'whatsapp' || s.pref === 'phone')) return 'contact.err.prefPhone';
      return '';
    }
    case 'email': {
      const e = String(s.email || '').trim();
      if (e && !emailValid(e, o.inputs && o.inputs.email)) return 'contact.err.emailInvalid';
      return '';
    }
    case 'message':
      return String(s.message || '').length > 2000 ? 'contact.err.messageLong' : '';
    default:
      return '';
  }
}

export function createValidator({ form, t }) {
  const q = (sel) => form.querySelector(sel);
  const inputOf = (f) => q(`[data-field="${f}"]`);
  const errOf = (f) => q(`[data-ct-err="${f}"]`);
  const wrapOf = (f) => q(`[data-field-wrap="${f}"]`);
  const shown = new Set();

  function show(field, key) {
    const input = inputOf(field), err = errOf(field), wrap = wrapOf(field);
    if (!input || !err) return;
    if (key) {
      err.textContent = t(key);
      input.setAttribute('aria-invalid', 'true');
      if (wrap) wrap.classList.add('has-error');
      shown.add(field);
    } else {
      err.textContent = '';
      input.removeAttribute('aria-invalid');
      if (wrap) wrap.classList.remove('has-error');
      shown.delete(field);
      prune(field);
    }
  }

  // A fixed field leaves the error summary too, so the summary never lists a problem that is already solved;
  // an emptied summary hides.
  function prune(field) {
    form.querySelectorAll(`[data-ct-errsum]:not([hidden]) [data-ct-jump="${field}"]`).forEach((a) => {
      const box = a.closest('[data-ct-errsum]');
      a.closest('li')?.remove();
      if (box && !box.querySelector('[data-ct-jump]')) box.hidden = true;
    });
  }

  function summary(stepEl, errors) {
    const box = stepEl && stepEl.querySelector('[data-ct-errsum]');
    if (!box) return;
    const list = box.querySelector('[data-ct-errsum-list]');
    list.replaceChildren();
    if (!errors.length) { box.hidden = true; return; }
    for (const { field, key } of errors) {
      const input = inputOf(field);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${input ? input.id : ''}`;
      a.textContent = t(key);
      a.dataset.ctJump = field;
      li.append(a);
      list.append(li);
    }
    box.hidden = false;
  }

  return {
    inputOf,
    isShown: (f) => shown.has(f),
    show,
    clearAll() {
      for (const f of ['name', 'phone', 'email', 'message']) show(f, '');
      form.querySelectorAll('[data-ct-errsum]').forEach((b) => { b.hidden = true; const l = b.querySelector('[data-ct-errsum-list]'); if (l) l.replaceChildren(); });
    },
    // Blur / live re-check of a single field (format rules only unless `full`).
    field(field, state, o = {}) {
      const key = ruleFor(field, state, { ...o, inputs: { email: inputOf('email') } });
      show(field, key);
      return key;
    },
    // Continue / send: every field of the given steps, cross-field rules included. Shows messages + the summary at
    // the top of the step that holds the first error, and returns [{field, key, step}].
    steps(steps, state, o = {}) {
      const errors = [];
      for (const n of steps) {
        for (const f of STEP_FIELDS[n] || []) {
          const key = ruleFor(f, state, { ...o, full: true, inputs: { email: inputOf('email') } });
          show(f, key);
          if (key) errors.push({ field: f, key, step: n });
        }
      }
      for (const n of [1, 2, 3]) {
        const stepEl = form.querySelector(`[data-step="${n}"]`);
        summary(stepEl, errors.filter((e) => e.step === n));
      }
      return errors;
    },
  };
}
