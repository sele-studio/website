#!/usr/bin/env node
// SELÈ STUDIO — tools/serve.mjs (zero dependencies) — local preview that behaves like GitHub Pages
//
//   node tools/serve.mjs [--port 8080]        (or PORT=8080)
//
//   /x/            → /x/index.html
//   /x (a folder)  → 301 to /x/
//   missing        → /404.html with status 404
//   Range requests (video seeking), correct MIME types, no caching.
//   gzip for text types when the client accepts it (as GitHub Pages does), so Lighthouse measures what ships.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i = process.argv.indexOf('--port');
const PORT = Number(i > -1 ? process.argv[i + 1] : process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
};
const typeOf = (f) => MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
const isDir = (f) => { try { return fs.statSync(f).isDirectory(); } catch { return false; } };

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg\+xml)/;
const acceptsGzip = (req) => /\bgzip\b/i.test(req.headers['accept-encoding'] || '');

function send(req, res, file, status = 200) {
  const size = fs.statSync(file).size;
  const type = typeOf(file);
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
  if (COMPRESSIBLE.test(type) && !req.headers.range) {
    headers.Vary = 'Accept-Encoding';
    if (acceptsGzip(req)) {
      const body = zlib.gzipSync(fs.readFileSync(file), { level: 9 });
      res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': body.length });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
  }
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range && status === 200) {
    let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1;
    if (start < 0) start = 0;
    if (start >= size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    end = Math.min(end, size - 1);
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(status, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); return res.end('bad request'); }
  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  if (/(^|\/)\.git(\/|$)/.test(pathname)) { res.writeHead(403); return res.end('forbidden'); }
  if (pathname.endsWith('/') && isFile(path.join(file, 'index.html'))) return send(req, res, path.join(file, 'index.html'));
  if (!pathname.endsWith('/') && isFile(file)) return send(req, res, file);
  if (!pathname.endsWith('/') && isDir(file) && isFile(path.join(file, 'index.html'))) {
    const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.writeHead(301, { Location: pathname + '/' + q });
    return res.end();
  }
  const nf = path.join(ROOT, '404.html');
  if (isFile(nf)) return send(req, res, nf, 404);
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
});
server.listen(PORT, () => console.log(`SELÈ STUDIO → http://localhost:${PORT}/   (root: ${ROOT})`));
