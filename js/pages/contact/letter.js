// The letter (SPEC §6.3, phrases amended by Addendum A7.4): a summary built from hand-written fragments.
// Empty answers are skipped entirely — no dangling connectors. User text is only ever set with textContent.
// Also builds the plain "label: value" lines used by "שליחה במייל" and "העתקת הפרטים" (§6.7).

const MATERIAL_KEY = { stone: 'stone', 'light-oak': 'lightOak', travertine: 'travertine', walnut: 'walnut', linen: 'linen', 'dark-oak': 'darkOak' };
const PROPERTY_WITH_PHRASE = ['apartment', 'garden', 'house'];
const SERVICE_ORDER = ['planning', 'interior', 'supervision', 'styling'];

// "a, b and c" (EN) / "א, ב וג" (HE: the last item is joined with a prefixed ו).
export function joinList(items, lang) {
  const xs = items.filter(Boolean);
  if (xs.length <= 1) return xs.join('');
  const head = xs.slice(0, -1).join(', ');
  const last = xs[xs.length - 1];
  return lang === 'en' ? `${head} and ${last}` : `${head} ו${last}`;
}

export function materialName(t, key) { return t(`contact.mat.${MATERIAL_KEY[key] || key}`); }

/**
 * The letter as a list of sentences: [{ id, kind, text, step, field }]
 *   kind: 'greet' | 's' | 'quote' | 'contact'
 *   step/field: where the "עריכה" button jumps.
 */
export function sentences(s, t, lang) {
  const out = [];
  const name = String(s.name || '').trim().replace(/\s+/g, ' ');
  out.push({ kind: 'greet', text: name ? t('contact.letter.hello', { name }) : t('contact.letter.helloAnon'), step: 3, field: 'name' });

  // 2 — property / location / size
  const loc = String(s.location || '').trim();
  const size = String(s.size || '').trim();
  if (PROPERTY_WITH_PHRASE.includes(s.property)) {
    let str = t('contact.letter.home', { property: t(`contact.letter.prop.${s.property}`) });
    if (loc) str += t('contact.letter.homeIn', { location: loc });
    if (size) str += t('contact.letter.homeSize', { size });
    out.push({ kind: 's', text: `${str}.`, step: 1, field: 'property' });
  } else if (loc && size) {
    out.push({ kind: 's', text: t('contact.letter.locSize', { location: loc, size }), step: 2, field: 'location' });
  } else if (loc) {
    out.push({ kind: 's', text: t('contact.letter.locOnly', { location: loc }), step: 2, field: 'location' });
  } else if (size) {
    out.push({ kind: 's', text: t('contact.letter.sizeOnly', { size }), step: 2, field: 'size' });
  }

  // 3 — stage
  if (s.stage) out.push({ kind: 's', text: t(`contact.letter.stage.${s.stage}`), step: 1, field: 'stage' });

  // 4 — spaces
  if (s.spaces && s.spaces.length) {
    const list = joinList(s.spaces.map((k) => t(`contact.letter.space.${k}`)), lang);
    out.push({ kind: 's', text: t('contact.letter.spaces', { list }), step: 1, field: 'spaces' });
  }

  // 5 — services (unsure alone → its own sentence; unsure next to others is ignored)
  if (s.services && s.services.length) {
    const real = SERVICE_ORDER.filter((k) => s.services.includes(k));
    if (real.length) {
      const list = joinList(real.map((k) => t(`contact.letter.svc.${k}`)), lang);
      out.push({ kind: 's', text: t('contact.letter.services', { list }), step: 1, field: 'services' });
    } else if (s.services.includes('unsure')) {
      out.push({ kind: 's', text: t('contact.letter.svcUnsure'), step: 1, field: 'services' });
    }
  }

  // 6 — materials
  if (s.materials && s.materials.length) {
    const names = s.materials.map((k) => {
      const n = materialName(t, k);
      return lang === 'en' ? n.charAt(0).toLowerCase() + n.slice(1) : n;
    });
    out.push({ kind: 's', text: t('contact.letter.materials', { list: joinList(names, lang) }), step: 2, field: 'materials' });
  }

  // 7 — timing
  if (s.timing) out.push({ kind: 's', text: t(`contact.letter.timing.${s.timing}`), step: 2, field: 'timing' });

  // 8 — message
  const msg = String(s.message || '').trim();
  if (msg) out.push({ kind: 'quote', text: msg, step: 2, field: 'message' });

  // 9 — preferred way back (+ time)
  if (s.pref) {
    const pref = t(`contact.letter.pref.${s.pref}`);
    const text = s.time && s.time !== 'any'
      ? t('contact.letter.reachTime', { pref, time: t(`contact.letter.time.${s.time}`) })
      : t('contact.letter.reach', { pref });
    out.push({ kind: 's', text, step: 3, field: 'pref' });
  }

  // 10 — phone / email
  const phone = String(s.phone || '').trim();
  const email = String(s.email || '').trim();
  if (phone || email) out.push({ kind: 'contact', phone, email, step: 3, field: phone ? 'phone' : 'email' });

  return out.map((x, i) => ({ ...x, id: `ct-ls-${i + 1}` }));
}

function editButton(t, x) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ct-edit';
  b.dataset.ctEdit = String(x.step);
  b.dataset.ctEditField = x.field;
  b.setAttribute('aria-describedby', x.id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(svgNS, 'use');
  use.setAttribute('href', '#i-edit');
  svg.append(use);
  const label = document.createElement('span');
  label.textContent = t('contact.letter.edit');
  b.append(svg, label);
  return b;
}

function latSpan(text) {
  const s = document.createElement('span');
  s.className = 'u-lat';
  s.lang = 'en';
  s.textContent = text;
  return s;
}

export function renderLetter(body, s, t, lang) {
  const frag = document.createDocumentFragment();
  for (const x of sentences(s, t, lang)) {
    if (x.kind === 'quote') {
      const wrap = document.createElement('div');
      const bq = document.createElement('blockquote');
      bq.className = 'ct-letter__q';
      bq.id = x.id;
      bq.textContent = x.text;
      wrap.append(bq, editButton(t, x));
      wrap.className = 'ct-letter__quote';
      frag.append(wrap);
      continue;
    }
    const p = document.createElement('p');
    if (x.kind === 'contact') {
      p.className = 'ct-letter__contact';
      const span = document.createElement('span');
      span.id = x.id;
      if (x.phone) span.append(latSpan(x.phone));
      if (x.phone && x.email) span.append(' · ');
      if (x.email) span.append(latSpan(x.email));
      p.append(span, editButton(t, x));
    } else {
      p.className = x.kind === 'greet' ? 'ct-letter__greet' : 'ct-letter__line';
      const span = document.createElement('span');
      span.className = 'ct-letter__s';
      span.id = x.id;
      span.textContent = x.text;
      p.append(span, editButton(t, x));
    }
    frag.append(p);
  }
  body.replaceChildren(frag);
}

// Plain text of the letter (for the polite announcement when step 3 is entered).
export function letterText(s, t, lang) {
  return sentences(s, t, lang).map((x) => (x.kind === 'contact' ? [x.phone, x.email].filter(Boolean).join(' · ') : x.text)).join(' ');
}

// "label: value" lines in the current language (§6.7). Labels = the questions without their trailing ? / :.
export function detailLines(s, t, lang) {
  const L = (key) => t(key).replace(/[?？:]\s*$/, '').trim();
  const lab = (field, k) => t(`contact.${field}.${k}`);
  const lines = [];
  const add = (label, value) => { const v = Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value || '').trim(); if (v) lines.push(`${label}: ${v}`); };
  add(L('contact.name.label'), String(s.name || '').trim().replace(/\s+/g, ' '));
  add(L('contact.phone.label'), s.phone);
  add(L('contact.email.label'), s.email);
  add(L('contact.pref.label'), s.pref ? lab('pref', s.pref) : '');
  add(L('contact.time.label'), s.time ? lab('time', s.time) : '');
  add(L('contact.spaces.label'), (s.spaces || []).map((k) => lab('spaces', k)));
  add(L('contact.services.label'), (s.services || []).map((k) => lab('services', k)));
  add(L('contact.property.label'), s.property ? lab('property', s.property) : '');
  add(L('contact.stage.label'), s.stage ? lab('stage', s.stage) : '');
  add(L('contact.location.label'), s.location);
  add(L('contact.size.label'), s.size);
  add(L('contact.timing.label'), s.timing ? lab('timing', s.timing) : '');
  add(L('contact.materials.label'), (s.materials || []).map((k) => materialName(t, k)));
  add(L('contact.source.label'), s.source ? lab('source', s.source) : '');
  const msg = String(s.message || '').trim();
  if (msg) lines.push('', `${L('contact.message.label')}:`, msg);
  return lines.join('\n');
}

// mailto: built only on click; the encoded body is capped at 1,800 characters including the "shortened" suffix.
export const MAILTO_CAP = 1800;
export function mailtoHref(s, t, lang) {
  const name = String(s.name || '').trim().replace(/\s+/g, ' ');
  const subject = encodeURIComponent(`פנייה מהאתר — ${name}`.trim());
  let raw = detailLines(s, t, lang);
  let body = encodeURIComponent(raw);
  if (body.length > MAILTO_CAP) {
    const suffix = '\n' + t('contact.mail.shortened');
    const encSuffix = encodeURIComponent(suffix);
    // Largest prefix of the raw text whose encoding plus the suffix fits (binary search on code points).
    const chars = Array.from(raw);
    let lo = 0, hi = chars.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (encodeURIComponent(chars.slice(0, mid).join('')).length + encSuffix.length <= MAILTO_CAP) lo = mid; else hi = mid - 1;
    }
    body = encodeURIComponent(chars.slice(0, lo).join('').replace(/\s+$/, '')) + encSuffix;
  }
  return `mailto:office@sele-studio.com?subject=${subject}&body=${body}`;
}
