// Draft (SPEC §6.7): sessionStorage['sele-letter'] through `store` (session). Every field except _honey is saved on
// input, debounced 400 ms; restored on load with the draft notice; cleared on success or "ניקוי הטופס".
// Stored by language-neutral keys (data-key), so a draft started on /contact/ restores on /en/contact/ too.

export const DRAFT_KEY = 'sele-letter';
const LISTS = ['spaces', 'services', 'materials'];
const RADIOS = ['property', 'stage', 'pref', 'time', 'source'];
const TEXTS = ['location', 'size', 'message', 'name', 'phone', 'email'];

export function createDraft({ store, form }) {
  let timer = 0;

  function hasContent(d) {
    if (!d || typeof d !== 'object' || !d.fields) return false;
    const f = d.fields;
    return LISTS.some((k) => Array.isArray(f[k]) && f[k].length)
      || ['property', 'stage', 'time', 'source', 'timing'].some((k) => f[k])
      || (f.pref && f.pref !== 'whatsapp')
      || TEXTS.some((k) => String(f[k] || '').trim());
  }

  return {
    read() {
      const d = store.get(DRAFT_KEY, null, { session: true });
      return hasContent(d) ? d : null;
    },
    save(state, extra) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const fields = {};
        for (const k of [...LISTS, ...RADIOS, ...TEXTS, 'timing']) fields[k] = state[k];
        const d = { v: 1, fields, ...extra };
        if (hasContent(d)) store.set(DRAFT_KEY, d, { session: true });
        else store.remove(DRAFT_KEY, { session: true });   // an empty form leaves nothing behind
      }, 400);
    },
    flush() { clearTimeout(timer); },
    clear() { clearTimeout(timer); store.remove(DRAFT_KEY, { session: true }); },
    // Write a stored draft back into the form (keys → inputs). Unknown keys are ignored.
    apply(d) {
      const f = d.fields || {};
      for (const k of LISTS) {
        const want = new Set(Array.isArray(f[k]) ? f[k] : []);
        form.querySelectorAll(`[data-field="${k}"] input[data-key]`).forEach((i) => { i.checked = want.has(i.dataset.key); });
      }
      for (const k of RADIOS) {
        if (!f[k]) continue;
        const i = form.querySelector(`[data-field="${k}"] input[data-key="${CSS.escape(String(f[k]))}"]`);
        if (i) i.checked = true;
      }
      const sel = form.querySelector('[data-field="timing"]');
      if (sel && f.timing) {
        const o = sel.querySelector(`option[data-key="${CSS.escape(String(f.timing))}"]`);
        if (o) sel.value = o.value;
      }
      for (const k of TEXTS) {
        const el = form.querySelector(`[data-field="${k}"]`);
        if (el && typeof f[k] === 'string') el.value = f[k];
      }
    },
  };
}
