// SELÈ STUDIO — tools/lib/dict.mjs (zero dependencies) — dictionary resolution (Addendum A3.5), shared by
// check, gen-en and seo.
//
//   const d = await loadDicts(root, { dict, build })
//     dict  = <body data-i18n-dict>   → js/i18n/<dict>.js    (runtime dictionary, ES module, default export)
//     build = <body data-i18n-build>  → data/i18n/<build>.json (build-only dictionary)
//   Resolution order: common → runtime page dict → build dict. A key defined in two of them is an error.
//
//   d.get(key)   → { he, en } | undefined
//   d.has(key)
//   d.keys       → Set of every key
//   d.map        → plain object key → { he, en }
//   d.errors     → [ 'message', … ]  (missing / unreadable files, duplicate keys)
//   d.sources    → { common, dict, build } file paths that were found (null when absent)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleCache = new Map();

async function readModule(file) {
  if (moduleCache.has(file)) return moduleCache.get(file);
  let val;
  try { val = { data: (await import(pathToFileURL(file).href)).default || {} }; }
  catch (e) { val = { error: e.message }; }
  moduleCache.set(file, val);
  return val;
}
function readJson(file) {
  try { return { data: JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch (e) { return { error: e.message }; }
}

export async function loadDicts(root, { dict = null, build = null } = {}) {
  const errors = [];
  const map = Object.create(null);
  const owner = Object.create(null);
  const sources = { common: null, dict: null, build: null };

  const add = (label, data) => {
    for (const [k, v] of Object.entries(data)) {
      if (k in owner) { errors.push(`key "${k}" is defined in both ${owner[k]} and ${label}`); continue; }
      owner[k] = label;
      map[k] = v;
    }
  };

  const commonFile = path.join(root, 'js/i18n/common.js');
  if (fs.existsSync(commonFile)) {
    const r = await readModule(commonFile);
    if (r.error) errors.push(`js/i18n/common.js: ${r.error}`); else { sources.common = commonFile; add('js/i18n/common.js', r.data); }
  } else errors.push('js/i18n/common.js not found');

  if (dict) {
    const f = path.join(root, 'js/i18n', dict + '.js');
    if (!fs.existsSync(f)) errors.push(`js/i18n/${dict}.js not found`);
    else {
      const r = await readModule(f);
      if (r.error) errors.push(`js/i18n/${dict}.js: ${r.error}`); else { sources.dict = f; add(`js/i18n/${dict}.js`, r.data); }
    }
  }
  if (build) {
    const f = path.join(root, 'data/i18n', build + '.json');
    if (!fs.existsSync(f)) errors.push(`data/i18n/${build}.json not found`);
    else {
      const r = readJson(f);
      if (r.error) errors.push(`data/i18n/${build}.json: ${r.error}`); else { sources.build = f; add(`data/i18n/${build}.json`, r.data); }
    }
  }

  return {
    map,
    keys: new Set(Object.keys(map)),
    get: (k) => map[k],
    has: (k) => k in map,
    errors,
    sources,
  };
}
