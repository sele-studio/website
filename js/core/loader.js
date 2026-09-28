// loadScript(src): inject a classic script once; concurrent and repeat calls share one Promise.
// Only same-origin, self-hosted URLs are expected (CSP: script-src 'self').
// A script already in the markup (the deferred vendors) is treated as loaded: deferred classic
// scripts execute before app.js, which is a (deferred) module placed after them.
const cache = new Map();

export function loadScript(src) {
  const url = new URL(src, location.href).href;
  if (cache.has(url)) return cache.get(url);
  const existing = [...document.scripts].find((s) => s.src === url);
  const p = existing
    ? Promise.resolve(existing)
    : new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.addEventListener('load', () => resolve(s), { once: true });
        s.addEventListener('error', () => {
          cache.delete(url);
          s.remove();
          reject(new Error('loadScript failed: ' + src));
        }, { once: true });
        document.head.appendChild(s);
      });
  cache.set(url, p);
  return p;
}
