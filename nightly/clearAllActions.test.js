// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, byTitle, keyEl, readCurrentBindingJson } from './testAppHarness.js';

describe('Clear All Actions', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('REGRESSION: clears the actual key binding, not just the custom text label', async () => {
    // Key 20 in tynstar.json is a plain &kp N0 — a real, non-empty binding to clear.
    await click(keyEl(20));
    const original = await readCurrentBindingJson();
    expect(original).toEqual({ value: '&kp', params: [{ value: 'N0' }] });

    await click(byTitle('Clear All Actions'));

    const afterClear = await readCurrentBindingJson();
    expect(afterClear).toEqual({ value: '&none' });
  });
});
