// Minimal, dependency-free static file server used only to give the smoke test (smoke.spec.js)
// something to point a real browser at. GLIDE itself has no build step and no server component —
// this exists purely so Playwright's `webServer` config has a URL to load `glide.html` from,
// exactly the way opening the file over `python3 -m http.server` (or any static host) would.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.PORT || 4173);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filePath = path.join(ROOT, urlPath);
    // Refuse to serve anything outside the repo root (defense in depth; this server only ever
    // needs to be reachable from the Playwright test running on the same machine).
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`GLIDE smoke-test static server listening on http://localhost:${PORT}`);
  });
