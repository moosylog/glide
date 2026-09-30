// A single, deliberately narrow real-browser test — everything else GLIDE's behavior is covered by
// the 300+ jsdom tests under tests/ui/. What THIS test exists to catch is the class of bug jsdom
// structurally cannot see: real <script> tag loading order/timing (defer vs. plain, Babel's
// text/babel scripts, ...), real CSS layout (overflow, truncation, z-index), and anything else that
// only shows up once glide.html is actually opened as a page rather than mounted via
// tests/ui/testAppHarness.js. It was added after exactly that happened — see README.md's "UX pass"
// section, point 6: a plain <script> in ui/hooks.js referenced `React` before the deferred CDN
// script had run, crashing every real page load, while all 321 jsdom tests kept passing because
// the harness sets `window.React` up front and never reproduces that ordering.
//
// Keep this test cheap and structural (did it mount, is anything visibly broken, did the console
// stay clean) rather than duplicating jsdom's behavioral coverage here.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { stubCdnScripts } from './cdnStub.js';

test('glide.html boots in a real browser and loads a layout with no console errors', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await stubCdnScripts(page);

  await page.goto('/glide.html');
  await expect(page.getByText('Start a Layout')).toBeVisible();

  const fixturePath = path.resolve('tests/fixtures/tynstar.json');
  await page.setInputFiles('input[type="file"]', fixturePath);

  // A key rendering and being clickable is the real assertion — it's downstream of React having
  // mounted, the layout having parsed, and the canvas having laid out every key, so it's a good
  // single check that the whole boot sequence actually worked.
  const key0 = page.locator('[data-key-idx="0"]');
  await expect(key0).toBeVisible();
  await key0.click();
  await expect(page.getByText('No Selection')).not.toBeVisible();

  expect(pageErrors, `Uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
});
