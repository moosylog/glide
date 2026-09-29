// @vitest-environment jsdom
//
// Proves core/io/loadLayout.js's validation is actually wired into the real file-upload flow
// (handleFileUpload in glide.html), not just exercised in isolation by tests/core/io.test.js.
// Every other UI test's loadFixtureFile() already proves the happy path end to end (all 80+
// of them go through this exact code path with real, valid fixtures) — this covers the error
// path specifically: a bad file must surface a clear toast, never crash or silently no-op.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, click, q, delay } from './testAppHarness.js';

async function uploadRawText(text, filename = 'bad.json') {
  const fileInput = q('input[type="file"]');
  const file = new window.File([text], filename, { type: 'application/json' });
  Object.defineProperty(fileInput, 'files', { value: [file], writable: false, configurable: true });
  fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await delay(150);
}

describe('File load error handling (handleFileUpload -> core/io/loadLayout.js)', () => {
  beforeEach(async () => {
    await mountGlideApp();
  });

  it('malformed JSON surfaces a toast with the parse error, and never crashes the app', async () => {
    await uploadRawText('{ not valid json at all');
    expect(document.body.textContent).toMatch(/Couldn't read "bad\.json"/);
    expect(document.body.textContent).toMatch(/Invalid JSON/);
    // The app must still be usable — the "Start a Layout" screen, not a blank/crashed page.
    expect(document.body.textContent).toContain('Start a Layout');
  });

  it('valid JSON missing "layers" surfaces the specific schema error, not a generic failure', async () => {
    await uploadRawText(JSON.stringify({ keyboard: 'glove80' }));
    expect(document.body.textContent).toMatch(/Missing required "layers"/);
  });

  it('a well-formed layout still loads normally after a previous failed attempt', async () => {
    await uploadRawText('garbage');
    await uploadRawText(JSON.stringify({ layers: [[{ value: '&kp', params: [{ value: 'A' }] }]] }), 'layout.json');
    expect(document.body.textContent).toMatch(/Loaded "layout\.json"/);
  });
});
