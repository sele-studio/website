// Live environment object (SPEC §4.9). Language comes from <html lang> (language = URL:
// Hebrew at the root, English under /en/). Call env.update() after any class/viewport change;
// app.js does so on sele:motionchange and sele:layoutchange.
const html = document.documentElement;
const mq = (q) => (window.matchMedia ? window.matchMedia(q).matches : false);

export const DESKTOP_QUERY = '(min-width:1100px) and (pointer:fine)';

let webglCache;

function slowNet() {
  const c = navigator.connection;
  const t = c && c.effectiveType;
  // unknown / undefined counts as allowed (iOS Safari does not expose it)
  return t === 'slow-2g' || t === '2g' || t === '3g';
}

export const env = {
  lang: 'he',
  dir: 'rtl',
  dirSign: -1,
  rtl: true,
  motion: true,
  desktop: false,
  finePointer: false,
  mobile: false,
  saveData: false,
  slowNet: false,
  vt: false,
  home: false,
  page: '',
  module: '',
  get webgl() {
    if (webglCache === undefined) {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
        webglCache = !!gl;
        if (gl) { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
      } catch (e) { webglCache = false; }
    }
    return webglCache;
  },
  update() {
    const lang = (html.getAttribute('lang') || 'he').toLowerCase().startsWith('en') ? 'en' : 'he';
    this.lang = lang;
    this.dir = html.getAttribute('dir') || (lang === 'en' ? 'ltr' : 'rtl');
    this.rtl = this.dir === 'rtl';
    this.dirSign = this.rtl ? -1 : 1;
    this.motion = !html.classList.contains('motion-off');
    this.finePointer = mq('(pointer:fine)');
    this.desktop = mq(DESKTOP_QUERY);
    this.mobile = mq('(max-width:767px)');
    this.saveData = html.classList.contains('save-data') || !!(navigator.connection && navigator.connection.saveData);
    this.slowNet = slowNet();
    this.vt = !html.classList.contains('no-vt') && 'CSSViewTransitionRule' in window;
    const body = document.body;
    this.page = (body && body.dataset.page) || '';
    this.module = (body && body.dataset.module) || '';
    const p = location.pathname;
    this.home = this.page === 'home' || p === '/' || p === '/index.html' || p === '/en/' || p === '/en/index.html';
    return this;
  },
};

env.update();
