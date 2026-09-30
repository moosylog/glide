// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, byTitle, byText, keyEl, readCurrentBindingJson, delay } from './testAppHarness.js';

describe('Layer-Tap on an empty key', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('REGRESSION: hold survives being combined with a tap assigned afterward, starting from a genuinely empty key', async () => {
    await click(keyEl(20));
    await click(byTitle('Clear All Actions'));
    // Confirms through GLIDE's own in-app ConfirmDialog now, not a native window.confirm().
    await delay(50);
    await click(byText('button', 'Clear'));
    expect(await readCurrentBindingJson()).toEqual({ value: '&none' });

    // Use the dedicated "Layer-Tap (&lt)" button, not the generic "Momentary" one (which
    // targets whichever slot is already active rather than setting up the hold slot itself).
    await click(byTitle('Switch Layer'));
    const ltLabel = qa('span').find((s) => s.textContent.trim() === 'Layer-Tap (&lt)');
    const ltAssignBtn = ltLabel.closest('div.flex.justify-between')?.querySelector('button');
    await click(ltAssignBtn);

    // Complete the flow by picking a tap key.
    await click(byTitle('Pick Key'));
    const bBtn = qa('.palette-btn').find((b) => b.textContent.trim() === 'B');
    await click(bBtn);

    const finalBinding = await readCurrentBindingJson();
    expect(finalBinding.value).toBe('&lt');
    expect(typeof finalBinding.params[0].value).toBe('number'); // the layer index — must not have vanished
    expect(finalBinding.params[1].value).toBe('B');
  });
});
