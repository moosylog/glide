// @vitest-environment jsdom
//
// Lighting tab "Paint Mode": colors several keys directly on the canvas (a click, or a
// click-drag across a run of keys) instead of the old one-at-a-time select-key/click-swatch
// loop. Also covers the companion fix that selecting a different key on the canvas no longer
// forces the right-hand panel back to the Keymap tab — the thing that made painting more than one
// key so tedious in the first place (pick a color, click the next key, get bounced back to
// Keymap, re-click Lighting, repeat).
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, byTitle, qa, keyEl, pointerEvent, stubElementFromPoint, readCurrentBindingJson } from './testAppHarness.js';

const PRESET = '#e5484d'; // KEY_COLOR_PRESETS[0]
const armPreset = () => click(byTitle(`Arm ${PRESET} for Paint Mode below`));
const paintToggle = () => qa('button').find((b) => b.textContent.includes('Paint Mode:'));

describe('Lighting tab: Paint Mode', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
    await click(keyEl(0));
    await click(byTitle('Lighting'));
  });

  it('is disabled until a color has actually been armed', () => {
    expect(paintToggle().disabled).toBe(true);
  });

  it('picking a preset color arms it (enables the toggle) and rings that swatch', async () => {
    expect(paintToggle().disabled).toBe(true);
    await armPreset();
    expect(paintToggle().disabled).toBe(false);
    expect(byTitle(`Arm ${PRESET} for Paint Mode below`).className).toContain('ring-app-accent');
  });

  it('the "off" swatch arms the eraser (null), not the undefined "nothing armed" state', async () => {
    await click(byTitle('Turns LED OFF — also arms the eraser for Paint Mode below'));
    expect(paintToggle().disabled).toBe(false);
  });

  it('once on, a plain click on another key paints it with the armed color', async () => {
    await armPreset();
    await click(paintToggle());
    expect(paintToggle().textContent).toContain('Paint Mode: On');

    // A plain click: pointerdown immediately followed by pointerup, no movement in between.
    await pointerEvent(keyEl(3), 'pointerdown', { pointerId: 50, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
    await pointerEvent(document, 'pointerup', { pointerId: 50, pointerType: 'mouse', clientX: 10, clientY: 10 });
    await click(keyEl(3)); // the real click that follows a mouse down+up in a browser

    expect((await readCurrentBindingJson()).decoration?.background).toBe(PRESET);
  });

  it('a drag across two keys paints both, as a SINGLE undo step', async () => {
    await armPreset();
    await click(paintToggle());

    const key1 = keyEl(1), key2 = keyEl(2);
    const restore = stubElementFromPoint((x) => (x === 200 ? key2 : key1));
    await pointerEvent(key1, 'pointerdown', { pointerId: 51, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 });
    await pointerEvent(document, 'pointermove', { pointerId: 51, pointerType: 'mouse', clientX: 200, clientY: 0 });
    await pointerEvent(document, 'pointerup', { pointerId: 51, pointerType: 'mouse', clientX: 200, clientY: 0 });
    restore();

    await click(keyEl(1));
    expect((await readCurrentBindingJson()).decoration?.background).toBe(PRESET);
    await click(keyEl(2));
    expect((await readCurrentBindingJson()).decoration?.background).toBe(PRESET);

    // One Undo reverts BOTH keys — proves the whole drag stroke landed as one history entry,
    // not one pushHistory call per key painted.
    await click(byTitle('Undo'));
    await click(keyEl(1));
    expect((await readCurrentBindingJson()).decoration?.background).toBeUndefined();
    await click(keyEl(2));
    expect((await readCurrentBindingJson()).decoration?.background).toBeUndefined();
  });

  it('switching to another tab stops painting immediately, even though the toggle itself stays "on"', async () => {
    await armPreset();
    await click(paintToggle());
    await click(byTitle('Keymap'));

    await pointerEvent(keyEl(5), 'pointerdown', { pointerId: 52, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0 });
    await pointerEvent(document, 'pointerup', { pointerId: 52, pointerType: 'mouse', clientX: 0, clientY: 0 });
    await click(keyEl(5));
    expect((await readCurrentBindingJson()).decoration?.background).toBeUndefined();
  });
});

describe('Selecting a key no longer bounces the panel back to Keymap', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('stays on the Lighting tab across key selections', async () => {
    await click(keyEl(0));
    await click(byTitle('Lighting'));
    expect(document.body.textContent).toContain('LED Color Palette');
    await click(keyEl(1));
    expect(document.body.textContent).toContain('LED Color Palette');
  });

  it('stays on the Switch Layer tab across key selections', async () => {
    await click(keyEl(0));
    await click(byTitle('Switch Layer'));
    expect(document.body.textContent).toContain('Target Layer');
    await click(keyEl(1));
    expect(document.body.textContent).toContain('Target Layer');
  });

  it('stays on the Advanced Behaviors tab across key selections', async () => {
    await click(keyEl(0));
    await click(byTitle('Advanced Behaviors'));
    expect(qa('input[placeholder="Search custom behaviors..."]').length).toBe(1);
    await click(keyEl(1));
    expect(qa('input[placeholder="Search custom behaviors..."]').length).toBe(1);
  });
});
