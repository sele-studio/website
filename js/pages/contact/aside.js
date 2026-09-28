// The aside frame (SPEC §5.6, ≥ 1100 px only): two stacked <picture> buffers. On a change the next render is written
// into the hidden buffer, decoded, then cross-faded in (600 ms opacity + 1.00 → 1.03 scale on the incoming buffer
// only) and the roles swap. A request that arrives mid-fade replaces the pending one (latest wins).
// Nothing is fetched below 1100 px: the buffers' sources carry media="(min-width:1100px)" and this module stays idle.

const W = 1024;
// Each render's widest file ≤ 1024 px: -1024.webp where it exists, the full .webp for bath-02 and kitchen-dark-01.
const IMAGES = {
  'kitchen-stone-01': { h: 936, pos: '52% 50%' },
  'kitchen-stone-02': { h: 936, pos: '40% 50%' },
  'kitchen-stone-03': { h: 936, pos: '62% 50%' },
  'living-01': { h: 1280, pos: '50% 50%' },
  'living-02': { h: 1291, pos: '50% 50%' },
  'living-03': { h: 1229, pos: '50% 50%' },
  'bath-01': { h: 1257, pos: '50% 45%' },
  'bath-02': { h: 1536, full: true, pos: '50% 50%' },
  'bedroom-01': { h: 936, pos: '45% 50%' },
  'bedroom-02': { h: 1151, pos: '50% 50%' },
  'kitchen-dark-01': { h: 1537, full: true, pos: '50% 45%' },
};
const SPACE = { whole: 'living-02', kitchen: 'kitchen-stone-01', living: 'living-01', baths: 'bath-01', bedrooms: 'bedroom-01', other: 'kitchen-stone-02' };
const MATERIAL = { stone: 'kitchen-stone-03', 'light-oak': 'living-03', travertine: 'bath-01', walnut: 'bath-02', linen: 'bedroom-02', 'dark-oak': 'kitchen-dark-01' };
export const DEFAULT_IMAGE = 'kitchen-stone-01';

export function imageFor(step, lastSpace, lastMaterial) {
  if (step === 3) return 'bath-02';
  if (step === 2 && lastMaterial && MATERIAL[lastMaterial]) return MATERIAL[lastMaterial];
  if (lastSpace && SPACE[lastSpace]) return SPACE[lastSpace];
  return DEFAULT_IMAGE;
}

const DESKTOP = '(min-width:1100px)';

export function createAside(frame, { motion }) {
  if (!frame) return { show() {}, lightsOn() {}, destroy() {} };
  const bufs = [...frame.querySelectorAll('[data-ct-buf]')];
  let front = bufs.find((b) => b.classList.contains('is-front')) || bufs[0];
  let shown = DEFAULT_IMAGE;
  let wanted = DEFAULT_IMAGE;
  let token = 0;
  let busy = false;
  let anims = [];
  const mq = window.matchMedia(DESKTOP);

  function fill(buf, id) {
    const m = IMAGES[id];
    const webp = m.full ? `/assets/img/${id}.webp` : `/assets/img/${id}-1024.webp`;
    const src = document.createElement('source');
    src.media = DESKTOP;
    src.type = 'image/webp';
    src.srcset = `${webp} ${W}w`;
    src.sizes = '28vw';
    const img = document.createElement('img');
    img.alt = '';
    img.width = W;
    img.height = m.h;
    img.decoding = 'async';
    img.style.setProperty('--pos', m.pos);
    img.src = `/assets/img/${id}.jpg`;
    buf.replaceChildren(src, img);
    return img;
  }

  async function run() {
    if (busy) return;
    busy = true;
    try {
      while (wanted !== shown) {
        const id = wanted;
        const my = ++token;
        const back = bufs.find((b) => b !== front);
        if (!back) break;
        const img = fill(back, id);
        try { await img.decode(); } catch (e) { /* shown anyway once it loads */ }
        if (my !== token || wanted !== id) continue; // superseded while decoding: latest wins
        const on = motion.on && !document.documentElement.classList.contains('motion-off') && !!back.animate;
        back.style.zIndex = '2';
        if (on) {
          const ease = 'cubic-bezier(.22,1,.36,1)';
          anims = [
            back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: ease, fill: 'forwards' }),
            img.animate([{ scale: '1' }, { scale: '1.03' }], { duration: 600, easing: ease, fill: 'forwards' }),
          ];
          try { await anims[0].finished; } catch (e) { /* cancelled by destroy */ }
          img.style.scale = '1.03';
          anims.forEach((a) => a.cancel());
          anims = [];
        }
        back.classList.add('is-front');
        back.style.zIndex = '';
        front.classList.remove('is-front');
        front = back;
        shown = id;
      }
    } finally {
      busy = false;
    }
  }

  return {
    show(id) {
      if (!IMAGES[id]) return;
      wanted = id;
      if (!mq.matches) return; // aside hidden: fetch nothing
      run();
    },
    sync() { if (mq.matches) run(); },
    lightsOn() {
      frame.classList.remove('is-lit');
      void frame.offsetWidth;
      frame.classList.add('is-lit');
    },
    destroy() { token++; anims.forEach((a) => a.cancel()); anims = []; },
  };
}
