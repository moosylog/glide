// glide.html deliberately has no build step: React, ReactDOM and Babel Standalone load straight
// from unpkg.com's CDN, by design (see ARCHITECTURE.md). That's the right call for a single-file
// app that anyone should be able to download and open, but it means a real end-to-end test either
// needs live internet access (flaky, slow, and often blocked in CI/sandboxed runners) or needs to
// serve the same three files from disk instead. This stubs exactly those three requests — nothing
// else glide.html loads normally routes through unpkg, and any that did would fall through to
// route.continue() below unaffected. glide.html itself is never touched; only this test's browser
// session sees local copies.
import path from 'node:path';

const LOCAL_CDN_MAP = {
  'https://unpkg.com/react@18/umd/react.production.min.js': 'node_modules/react/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js': 'node_modules/@babel/standalone/babel.min.js',
};

export async function stubCdnScripts(page) {
  await page.route('https://unpkg.com/**', async (route) => {
    const local = LOCAL_CDN_MAP[route.request().url()];
    if (local) {
      await route.fulfill({ path: path.resolve(local), contentType: 'application/javascript' });
    } else {
      await route.continue();
    }
  });
}
