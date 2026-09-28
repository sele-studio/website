// Barrel: the global JS API (SPEC §4.9). Pages import from '/js/core/sele.js' (never with ?v).
export { env } from './env.js';        // live: { lang, dir, dirSign, rtl, motion, desktop, finePointer, mobile, saveData, slowNet, vt, webgl, home, page, module, update() }
export { store } from './store.js';    // store.get(key, fallback, {session}), store.set(key, value, {session}), store.remove(key, {session})
export { on, off, emit } from './events.js'; // CustomEvents on document, names 'sele:*'
export { i18n } from './i18n.js';      // i18n.lang, i18n.ready, i18n.t(key, vars), i18n.href(path), i18n.apply(root) — language = URL, no set()
export { motion } from './motion.js';  // motion.ready, motion.on, motion.gsap, motion.ScrollTrigger, motion.SplitText, motion.lenis|null, motion.mm, motion.ease(name), motion.scrollTo(target, {offset})
export { reveal } from './reveal.js';  // reveal.scan(root), reveal.reset(root)
export { video } from './video.js';    // video.scan(root), video.pauseAll(), video.resumeAll()
export { loadScript } from './loader.js'; // loadScript(src): Promise (dedupes)
