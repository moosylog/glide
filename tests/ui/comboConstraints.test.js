// @vitest-environment jsdom
//
// ZMK combos can only fire ONE binding (no hold/tap distinction, no double-tap sequencing, no
// shift-conditional output at the combo level) and are capped at MAX_COMBO_KEYS key positions
// by ZMK's own Kconfig default — this covers both real bugs where GLIDE's UI let you do things
// ZMK's firmware can't actually build.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, byText, byTitle, keyEl, delay } from './testAppHarness.js';

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

// Real gaps found by actually using the Combos editor: nothing stopped a combo being saved with
// no action (fires and does nothing), and nothing stopped two different combos from ending up
// with the identical set of key positions on overlapping layers (ZMK's behavior for two combos
// that can both fire off one press is undefined). See core/zmk/combos.js's comboHasBinding and
// findDuplicateCombos for the actual rules (layer-scope-aware, not just a flat key-set compare).
describe('Combo validation (missing action / duplicate key sets)', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
    await click(byText('button', 'Combos'));
  });

  const createCombo = async () => {
    const createBtn = qa('button').find((b) => b.textContent.includes('Create Combo'));
    await click(createBtn);
  };

  it('a combo with keys but no action shows a "No action" warning in the sidebar list', async () => {
    await createCombo();
    await click(keyEl(0));
    await click(keyEl(1));
    // Back out of zen mode so the combo shows in the ordinary list view.
    await click(byText('button', 'Combos'));
    expect(document.body.textContent).toContain('No action');
  });

  it('a combo with no keys yet shows no warning (still being built, not broken)', async () => {
    await createCombo();
    await click(byText('button', 'Combos'));
    expect(document.body.textContent).not.toContain('No action');
    expect(document.body.textContent).not.toContain('Duplicate keys');
  });

  it('picking the exact same keys as an existing combo (same layer scope) is blocked with a toast, not silently duplicated', async () => {
    await createCombo();
    await click(keyEl(0));
    await click(keyEl(1));
    await click(byText('button', 'Combos')); // exit zen mode, back to the list

    await createCombo(); // second combo — starts in zen mode again
    await click(keyEl(0));
    await click(keyEl(1)); // exact same pair as the first combo, same default all-layers scope

    const selected = qa('[data-key-idx]').filter((el) => el.className.includes('combo-highlight'));
    expect(selected.length).toBe(1); // the second key add was rejected
    expect(document.body.textContent).toMatch(/These exact keys are already used by/);
  });

  it('exporting with a combo that has no action asks for confirmation first, and "Go Back" leaves the layout alone', async () => {
    await createCombo();
    await click(keyEl(0));
    await click(keyEl(1));
    await click(byText('button', 'Combos')); // exit zen mode

    await click(byTitle('Export this layout'));
    await delay(50);
    expect(document.body.textContent).toContain('Combo needs attention');
    expect(document.body.textContent).toMatch(/has no action assigned/);

    await click(byText('button', 'Go Back'));
    // Dialog closed, nothing crashed, combo is still there untouched.
    expect(document.body.textContent).not.toContain('Combo needs attention');
    expect(document.body.textContent).toContain('No action');
  });

  it('"Export Anyway" proceeds despite the warning', async () => {
    await createCombo();
    await click(keyEl(0));
    await click(keyEl(1));
    await click(byText('button', 'Combos'));

    await click(byTitle('Export this layout'));
    await delay(50);
    await click(byText('button', 'Export Anyway'));
    await delay(50);
    expect(document.body.textContent).not.toContain('Combo needs attention');
  });
});
