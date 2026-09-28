// Sending — FormSubmit AJAX contract (SPEC §6.6, Addendum A7.4). No analytics of any kind: the inbox is the only
// record. The outcome is one of 'success' | 'pending' (activation not yet clicked) | 'error' (anything else,
// including network errors and the 15 s timeout).

const ENDPOINT = 'https://formsubmit.co/ajax/office@sele-studio.com';
// TODO-OWNER (after activation): replace the address with FormSubmit's random alias to keep it out of the page source.
export const TIMEOUT_MS = 15000;

const joinVals = (form, name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value).join(', ');
const radioVal = (form, name) => { const i = form.querySelector(`input[name="${name}"]:checked`); return i ? i.value : ''; };
const val = (form, field) => { const el = form.querySelector(`[data-field="${field}"]`); return el ? String(el.value || '').trim() : ''; };

// Every key whose value is empty is omitted. Values are the Hebrew `value` attributes whatever the UI language.
export function buildPayload(form, { lang, emailOk }) {
  const name = val(form, 'name').replace(/\s+/g, ' ');
  const email = val(form, 'email');
  const timingEl = form.querySelector('[data-field="timing"]');
  const payload = {
    _subject: `פנייה חדשה מהאתר — ${name}`,
    _template: 'table',
    _captcha: 'false',
    _honey: '',
    ...(emailOk && { _replyto: email }),
    'שם מלא': name,
    'טלפון': val(form, 'phone'),
    'email': email,
    'דרך מועדפת': radioVal(form, 'דרך מועדפת'),
    'שעה נוחה': radioVal(form, 'שעה נוחה'),
    'חללים': joinVals(form, 'חללים'),
    'שירותים': joinVals(form, 'שירותים'),
    'סוג הנכס': radioVal(form, 'סוג הנכס'),
    'שלב': radioVal(form, 'שלב'),
    'מיקום': val(form, 'location'),
    'גודל משוער (מ״ר)': val(form, 'size'),
    'מתי להתחיל': timingEl ? timingEl.value : '',
    'חומרים': joinVals(form, 'חומרים'),
    'הודעה': val(form, 'message'),
    'איך הגעתם אלינו': radioVal(form, 'איך הגעתם אלינו'),
    'עמוד מקור': val(form, 'ref'),
    'שפת האתר': lang === 'en' ? 'English' : 'עברית',
    'עמוד': location.pathname,
    'עמוד כניסה': val(form, 'landing'),
  };
  for (const k of Object.keys(payload)) {
    if (k === '_honey') continue; // the honeypot key always travels, empty
    if (payload[k] === '' || payload[k] == null) delete payload[k];
  }
  return payload;
}

export async function post(payload, { timeout = TIMEOUT_MS, fetchImpl = window.fetch.bind(window) } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    const success = res.ok && String(data.success) === 'true';
    if (success) return 'success';
    if (/activat/i.test(String(data.message))) return 'pending';
    return 'error';
  } catch (e) {
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}

// Clipboard with a textarea fallback (older Safari, insecure contexts).
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.insetBlockStart = '-1000px';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) {
    return false;
  }
}
