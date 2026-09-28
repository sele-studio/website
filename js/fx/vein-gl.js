// W4 Mode A — the WebGL dissolve along her marble veins (SPEC §5.1 H5). Imported by vein-cut.js only when
// html.fx-desktop, not Save-Data and navigator.hardwareConcurrency >= 4; this module adds the last condition itself:
// a WebGL1 context created with failIfMajorPerformanceCaveat (no software rendering). Returns null when it cannot run.
//
// createVeinGL({ clip, pictures, disp, onLost }) → null | { ready: Promise, render(i, f), show(), destroy() }
//   - a <canvas> absolutely filling the frame's square-cornered .frame__clip, DPR capped at 1.5, low-power;
//   - textures: each picture's widest WebP candidate ≤ 1024 px wide, plus the displacement map made from
//     materials/marble.jpg; CLAMP_TO_EDGE + LINEAR, no mipmaps;
//   - draws only when render() is called (vein-cut.js calls it when P changes) and on resize: no idle loop;
//   - on webglcontextlost it calls onLost() (vein-cut.js returns to the CSS wipe); destroy() frees everything.
// The fragment shader is SPEC's (no glow); cover() additionally honours each picture's CSS object-position, so the
// canvas shows exactly the crop the stacked pictures show and the hand-over is invisible.
// QA-tuned (governing rule 4, her renders are never distorted): the vein offset is .015 (≤ 5 px on a 76vh frame at the peak, was .06),
// the vein front is a wide ±.2 band (was ±.12) so the cut reads as marble, not tearing, the offset follows a 3 × 3
// box-softened copy of the vein map (the raw map's grain turned straight shelf edges into saw teeth even at .015)
// while the mask keeps the sharp veins, and the sampled UVs are clamped so no edge texels are pulled in. The front runs p = uP × 1.4 − .2, so uP 0 / 1 are still exactly A / B.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }`;

const FRAG = `
precision mediump float;
uniform sampler2D uA, uB, uDisp; uniform float uP; uniform vec2 uRes, uSizeA, uSizeB, uPosA, uPosB;
varying vec2 vUv;
vec2 cover(vec2 uv, vec2 img, vec2 pos){ float r=uRes.x/uRes.y, ir=img.x/img.y; vec2 s = r>ir ? vec2(1., ir/r) : vec2(r/ir, 1.); return uv*s + pos*(1.-s); }
float soft(vec2 uv){
  float s = 0.;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) s += texture2D(uDisp, uv + vec2(float(x), float(y))*.02).r;
  return s/9.;
}
void main(){
  float d = texture2D(uDisp, vUv).r;
  float t = uP*(1.-uP)*4.;
  float p = uP*1.4-.2;
  float m = smoothstep(p-.2, p+.2, d);
  vec2 off = vec2(0., (soft(vUv)-.5)*.015*t);
  vec4 a = texture2D(uA, clamp(cover(vUv+off, uSizeA, uPosA), 0., 1.));
  vec4 b = texture2D(uB, clamp(cover(vUv-off, uSizeB, uPosB), 0., 1.));
  gl_FragColor = mix(b, a, m);
}`;

const MAX_DPR = 1.5;
const MAX_W = 1024;

// The widest candidate ≤ 1024 px from the picture's WebP <source> (…-1024.webp, or the full .webp for bath-02).
function pickUrl(picture) {
  const img = picture.querySelector('img');
  const source = picture.querySelector('source[type="image/webp"]') || picture.querySelector('source');
  const set = source && source.getAttribute('srcset');
  if (set) {
    let best = null;
    for (const part of set.split(',')) {
      const [url, desc] = part.trim().split(/\s+/);
      const w = desc && desc.endsWith('w') ? parseInt(desc, 10) : NaN;
      if (url && Number.isFinite(w) && w <= MAX_W && (!best || w > best.w)) best = { url, w };
    }
    if (best) return best.url;
  }
  return img ? (img.currentSrc || img.getAttribute('src')) : null;
}

// CSS object-position of the picture's <img> as fractions (x from the left, y from the top); keywords → centre.
function focal(picture) {
  const img = picture.querySelector('img');
  const out = [0.5, 0.5];
  if (!img) return out;
  const parts = getComputedStyle(img).objectPosition.split(/\s+/);
  parts.slice(0, 2).forEach((v, k) => {
    if (v.endsWith('%')) out[k] = Math.max(0, Math.min(1, parseFloat(v) / 100));
    else if (v === 'left' || v === 'top') out[k] = 0;      // physical keywords of object-position, not layout
    else if (v === 'right' || v === 'bottom') out[k] = 1;
  });
  return out;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('vein-gl: image failed ' + url));
    im.src = url;
  });
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export default function createVeinGL({ clip, pictures, disp, onLost }) {
  if (!clip || !pictures || pictures.length < 2) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-vein-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.visibility = 'hidden';
  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      failIfMajorPerformanceCaveat: true,
      powerPreference: 'low-power',
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    });
  } catch (e) { gl = null; }
  if (!gl) return null;

  let destroyed = false;
  let lost = false;
  let program = null;
  let buffer = null;
  let ro = null;
  const tex = [];
  let dispTex = null;
  const sizes = [];
  const pos = [];
  let U = {};
  let last = null; // [i, f]

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('vein-gl: shader ' + log);
    }
    return s;
  }

  function texture(img) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return t;
  }

  function resize() {
    if (destroyed || lost) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(clip.clientWidth * dpr));
    const h = Math.max(1, Math.round(clip.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (last) draw(last[0], last[1]);
    }
  }

  function draw(i, f) {
    if (destroyed || lost || !program || !tex[i] || !tex[i + 1]) return;
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[i]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[i + 1]);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, dispTex);
    gl.uniform1f(U.uP, f);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uSizeA, sizes[i][0], sizes[i][1]);
    gl.uniform2f(U.uSizeB, sizes[i + 1][0], sizes[i + 1][1]);
    gl.uniform2f(U.uPosA, pos[i][0], 1 - pos[i][1]);          // textures are flipped: v runs from the bottom
    gl.uniform2f(U.uPosB, pos[i + 1][0], 1 - pos[i + 1][1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function onContextLost(e) {
    e.preventDefault();
    if (destroyed || lost) return;
    lost = true;
    if (typeof onLost === 'function') onLost();
  }
  canvas.addEventListener('webglcontextlost', onContextLost);

  function setup() {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('vein-gl: link ' + gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uA', 'uB', 'uDisp', 'uP', 'uRes', 'uSizeA', 'uSizeB', 'uPosA', 'uPosB']) U[n] = gl.getUniformLocation(program, n);
    gl.uniform1i(U.uA, 0);
    gl.uniform1i(U.uB, 1);
    gl.uniform1i(U.uDisp, 2);
  }

  const urls = pictures.map(pickUrl);
  pictures.forEach((p) => pos.push(focal(p)));

  const ready = (async () => {
    if (urls.some((u) => !u)) throw new Error('vein-gl: missing image source');
    setup();
    const [dispImg, ...imgs] = await Promise.all([loadImage(disp), ...urls.map(loadImage)]);
    if (destroyed || lost) throw new Error('vein-gl: gone');
    // one texture upload per frame, so no single long task
    dispTex = texture(dispImg);
    for (const im of imgs) {
      await nextFrame();
      if (destroyed || lost) throw new Error('vein-gl: gone');
      tex.push(texture(im));
      sizes.push([im.naturalWidth, im.naturalHeight]);
    }
    clip.appendChild(canvas);
    resize();
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => resize());
      ro.observe(clip);
    }
  })();

  return {
    ready,
    render(i, f) {
      last = [i, f];
      draw(i, f);
    },
    show() { canvas.style.removeProperty('visibility'); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (ro) { ro.disconnect(); ro = null; }
      canvas.removeEventListener('webglcontextlost', onContextLost);
      try {
        if (!lost && gl && !gl.isContextLost()) {
          tex.forEach((t) => gl.deleteTexture(t));
          if (dispTex) gl.deleteTexture(dispTex);
          if (buffer) gl.deleteBuffer(buffer);
          if (program) gl.deleteProgram(program);
          const ext = gl.getExtension('WEBGL_lose_context');
          if (ext) ext.loseContext();
        }
      } catch (e) { /* ignore */ }
      canvas.remove();
    },
  };
}
