// Storage with try/catch and an in-memory fallback (private mode, blocked storage).
// Strings are stored raw (so the inline boot script can read 'sele-lang' = 'en' directly);
// other values are JSON. get() parses JSON when it can and otherwise returns the raw string.
const memory = { local: new Map(), session: new Map() };

function area(session) {
  try {
    const s = session ? window.sessionStorage : window.localStorage;
    const probe = '__sele';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch (e) {
    return null;
  }
}

function parse(raw) {
  if (raw == null) return undefined;
  try { return JSON.parse(raw); } catch (e) { return raw; }
}

export const store = {
  get(key, fallback = null, { session = false } = {}) {
    const s = area(session);
    let raw = null;
    if (s) { try { raw = s.getItem(key); } catch (e) { raw = null; } }
    if (raw == null) raw = memory[session ? 'session' : 'local'].get(key) ?? null;
    const v = parse(raw);
    return v === undefined ? fallback : v;
  },
  set(key, value, { session = false } = {}) {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    memory[session ? 'session' : 'local'].set(key, raw);
    const s = area(session);
    if (s) { try { s.setItem(key, raw); } catch (e) { /* quota / blocked: memory copy stands */ } }
    return value;
  },
  remove(key, { session = false } = {}) {
    memory[session ? 'session' : 'local'].delete(key);
    const s = area(session);
    if (s) { try { s.removeItem(key); } catch (e) { /* ignore */ } }
  },
};
