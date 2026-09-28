// Site events: CustomEvents dispatched on `document`, names 'sele:*' (SPEC §4.9).
// on() returns an unsubscribe function for convenience; handlers receive the Event (detail in e.detail).
export function on(name, fn, opts) {
  document.addEventListener(name, fn, opts);
  return () => off(name, fn, opts);
}

export function off(name, fn, opts) {
  document.removeEventListener(name, fn, opts);
}

export function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}
