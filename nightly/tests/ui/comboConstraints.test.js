// @vitest-environment jsdom
//
// ZMK combos can only fire ONE binding (no hold/tap distinction, no double-tap sequencing, no
// shift-conditional output at the combo level) and are capped at MAX_COMBO_KEYS key positions
// by ZMK's own Kconfig default — this covers both real bugs where GLIDE's UI let you do things
// ZMK's firmware can't actually build.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, byText, keyEl } from './testAppHarness.js';

describe('Combo constraints (ZMK-imposed, not just UI polish)', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
    await click(byText('button', 'Combos'));
    const createBtn = qa('button').find((b) => b.textContent.includes('Create Combo'));
    await click(createBtn);
  });

  it('cannot select more than 4 keys for a combo, and shows a toast explaining why', async () => {
    for (const idx of [0, 1, 2, 3]) await click(keyEl(idx));

    let selected = qa('[data-key-idx]').filter((el) => el.className.includes('combo-highlight'));
    expect(selected.length).toBe(4);

    await click(keyEl(4)); // 5th key — must be rejected

    selected = qa('[data-key-idx]').filter((el) => el.className.includes('combo-highlight'));
    expect(selected.length).toBe(4); // unchanged
    expect(document.body.textContent).toContain('A combo can use at most 4 keys');
  });

  it('deselecting a key when already at 4 still works (the cap only blocks growth, not shrink)', async () => {
    for (const idx of [0, 1, 2, 3]) await click(keyEl(idx));
    await click(keyEl(0)); // deselect one

    const selected = qa('[data-key-idx]').filter((el) => el.className.includes('combo-highlight'));
    expect(selected.length).toBe(3);
  });

  it('editing a combo only offers the primary action — no shiftTap/hold/doubleTap/label link text', async () => {
    // The hint text ("You can also specify an action to do...") only ever appears when there's
    // something left to add; for a combo, that set must be empty.
    expect(document.body.textContent).not.toContain('You can also specify an action to do');
    // None of the non-primary slot "add this action" links should render either.
    ['when tapped with Shift', 'when held', 'when double-tapped', 'add text label to the key'].forEach((linkText) => {
      const link = qa('span').find((s) => s.textContent.trim() === linkText);
      expect(link).toBeFalsy();
    });
  });
});
