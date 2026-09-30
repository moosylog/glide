// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, byTitle, byText, keyEl, readCurrentBindingJson, delay } from './testAppHarness.js';

describe('Detach & Customize', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('clones a shared custom behavior for one key without affecting the other key(s) that reference it', async () => {
    // Keys 10 (Esc) and 21 (PrtScn) both use the shared &strong holdTap in this fixture.
    await click(keyEl(10));
    expect((await readCurrentBindingJson()).value).toBe('&strong');

    const detachBtn = qa('button').find((b) => b.textContent.includes('⑂'));
    expect(detachBtn).toBeTruthy();
    await click(detachBtn);
    // This behavior is shared by more than one key, so detaching confirms through GLIDE's own
    // in-app ConfirmDialog (not a native window.confirm()) before actually going through.
    await delay(50);
    await click(byText('button', 'Detach'));

    const key10After = await readCurrentBindingJson();
    expect(key10After.value).not.toBe('&strong');
    expect(key10After.value).toMatch(/^&GLIDE_ht_detached_/);

    // Key 21 must be completely untouched.
    await click(keyEl(21));
    const key21After = await readCurrentBindingJson();
    expect(key21After.value).toBe('&strong');
  });
});
