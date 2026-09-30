// @vitest-environment jsdom
//
// UX pass (reverse-selection): hovering a combo/macro row anywhere in the left sidebar lights up
// every key on the canvas that uses it — the reverse of the usual canvas-click-to-select flow.
// See core/usage.js's findBehaviorUsageKeys and glide.html's hoveredBehaviorName/hoveredComboIdx.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, hoverOn, hoverOff, pointerEvent, qa, byText, keyEl } from './testAppHarness.js';

const libraryToggle = () => qa('button').find((b) => b.textContent.includes('Behavior Library'));

describe('Reverse-selection highlight', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('hovering a combo row in the sidebar highlights exactly its own keys', async () => {
    await click(byText('button', 'Combos'));
    // combo_auml is the fixture's first combo: keyPositions [35, 47], layers: [-1] (all layers).
    // Hovering the innermost element (the name span, not some ancestor wrapper) matters here —
    // React derives onMouseEnter/onMouseLeave from native mouseover/mouseout bubbling, so the
    // event needs to actually originate at or below the row that owns the handler.
    const comboNameSpan = byText('span', 'combo_auml');
    expect(comboNameSpan).toBeTruthy();

    await hoverOn(comboNameSpan);
    expect(keyEl(35).classList.contains('usage-highlight')).toBe(true);
    expect(keyEl(47).classList.contains('usage-highlight')).toBe(true);
    expect(keyEl(0).classList.contains('usage-highlight')).toBe(false);

    await hoverOff(comboNameSpan);
    expect(keyEl(35).classList.contains('usage-highlight')).toBe(false);
  });

  it('hovering a macro row in the sidebar highlights only the keys on the CURRENT layer that use it', async () => {
    // &msteams_ptt is assigned to key 9 on layer 1 ("Meeting"), not layer 0.
    await click(byText('span', 'Meeting'));
    await click(libraryToggle());
    await click(byText('button', 'Macros'));

    const macroNameSpan = byText('span', 'msteams_ptt');
    expect(macroNameSpan).toBeTruthy();

    await hoverOn(macroNameSpan);
    expect(keyEl(9).classList.contains('usage-highlight')).toBe(true);

    // Switching back to layer 0 (Base), the highlight set is recomputed for that layer and key 9
    // there is unrelated to the macro, so the highlight should be gone. Back to the Layers nav
    // view first — the "Base" row only exists there, not while Macros is the active nav mode.
    await click(byText('button', 'Layers'));
    await click(byText('span', 'Base'));
    expect(keyEl(9).classList.contains('usage-highlight')).toBe(false);
  });

  // Mouse hover has no touch equivalent at all, so a touch-only visitor would otherwise never see
  // this feature fire — the same class of bug the mobile-readiness pass fixed once already for the
  // layer/combo action buttons (see README.md), reintroduced by this later UX pass adding a brand
  // new hover-only interaction. `onPointerDown`/`onPointerUp`/`onPointerCancel`, gated to
  // `pointerType !== 'mouse'`, give touch/pen a "press and hold to preview" equivalent, consistent
  // with the rest of the app's touch support (Pointer Events, never native Touch Events).
  it('a touch press-and-hold on a combo row previews the same highlight a mouse hover would', async () => {
    await click(byText('button', 'Combos'));
    const comboRow = byText('span', 'combo_auml').closest('div');

    await pointerEvent(comboRow, 'pointerdown', { pointerType: 'touch' });
    expect(keyEl(35).classList.contains('usage-highlight')).toBe(true);

    await pointerEvent(comboRow, 'pointerup', { pointerType: 'touch' });
    expect(keyEl(35).classList.contains('usage-highlight')).toBe(false);
  });

  it('a mouse pointerdown does not trigger the touch preview path (mouse already has real hover)', async () => {
    await click(byText('button', 'Combos'));
    const comboRow = byText('span', 'combo_auml').closest('div');

    await pointerEvent(comboRow, 'pointerdown', { pointerType: 'mouse' });
    expect(keyEl(35).classList.contains('usage-highlight')).toBe(false);
  });
});
