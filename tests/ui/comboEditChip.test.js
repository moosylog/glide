// @vitest-environment jsdom
//
// UX pass (bidirectional canvas selection): a key that belongs to an existing combo shows a
// "Part of <combo> — Edit" chip once selected outside combo-edit mode, so you don't have to hunt
// it down in the sidebar's Combos list first. Clicking it — and only clicking it — jumps into
// editing that combo (see ui/inspector.js's combosContainingSelectedKey chip and glide.html's
// setEditingComboIdx). Selecting the key itself must never auto-jump into Zen Mode on its own.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, keyEl, qa } from './testAppHarness.js';

describe('"Part of combo — Edit" chip', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('shows a chip for a key inside an existing combo, without entering Zen Mode on select', async () => {
    // combo_auml (the fixture's first combo) covers key positions 35 and 47.
    await click(keyEl(35));

    expect(qa('button').find((b) => b.textContent.includes('combo_auml'))).toBeTruthy();
    // Selecting the key alone must not have silently entered Focus/Zen Mode.
    expect(qa('*').some((el) => el.textContent === 'Focus Mode: Click keys to toggle')).toBe(false);
  });

  it('clicking the chip jumps into editing that exact combo', async () => {
    await click(keyEl(35));
    const chip = qa('button').find((b) => b.textContent.includes('combo_auml'));

    await click(chip);

    expect(qa('*').some((el) => el.textContent === 'Focus Mode: Click keys to toggle')).toBe(true);
    // The inspector's own header now names the combo being edited.
    expect(qa('span').some((el) => el.textContent.trim() === 'combo_auml')).toBe(true);
  });

  it('does not show the chip for a key with no combo', async () => {
    await click(keyEl(0));
    expect(qa('button').find((b) => b.textContent.includes('— Edit'))).toBeFalsy();
  });
});
