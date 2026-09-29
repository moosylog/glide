// @vitest-environment jsdom
//
// Phase-1 mobile-readiness proof: the interactions that used to be mouse-event-only (key
// drag-to-swap, the right-click context menu, layer reordering via native HTML5 Drag and Drop)
// are now driven by Pointer Events, which actually fire for touch input — plain
// onMouseDown/onMouseMove/onMouseUp and the native `draggable` API do not. These tests dispatch
// PointerEvents with pointerType 'touch' to prove the touch path specifically, not just that the
// old mouse path still happens to work under a different event name.
//
// jsdom has no layout engine, so `document.elementFromPoint` (used to hit-test which key/layer a
// pointer is currently over) is stubbed per-test via stubElementFromPoint — see testAppHarness.js.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, byText, keyEl, pointerEvent, stubElementFromPoint, delay } from './testAppHarness.js';

describe('Touch drag-to-swap on the canvas', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('a touch drag from one key to another swaps their bindings (not just a mouse drag)', async () => {
    const key0 = keyEl(0), key5 = keyEl(5);
    const before0 = key0.title || key0.textContent;
    const before5 = key5.title || key5.textContent;

    const restore = stubElementFromPoint((x, y) => (x === 999 ? key5 : key0));
    await pointerEvent(key0, 'pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 0, clientY: 0 });
    // Past the drag threshold (6px) — engages drag-to-swap rather than a long-press.
    await pointerEvent(document, 'pointermove', { pointerId: 7, pointerType: 'touch', clientX: 999, clientY: 0 });
    await pointerEvent(document, 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: 999, clientY: 0 });
    restore();

    const after0 = keyEl(0).title || keyEl(0).textContent;
    const after5 = keyEl(5).title || keyEl(5).textContent;
    expect(after0).toBe(before5);
    expect(after5).toBe(before0);
  });

  it('a touch tap (no movement) still just selects the key — no accidental swap', async () => {
    const restore = stubElementFromPoint(() => keyEl(0));
    await pointerEvent(keyEl(3), 'pointerdown', { pointerId: 8, pointerType: 'touch', clientX: 50, clientY: 50 });
    await pointerEvent(document, 'pointerup', { pointerId: 8, pointerType: 'touch', clientX: 50, clientY: 50 });
    restore();
    await click(keyEl(3)); // the real tap gesture also fires a click after pointerup
    expect(document.body.textContent).toContain('Primary Action');
  });
});

describe('Long-press opens the context menu on touch (no right-click available)', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('holding a touch pointer on a key for the long-press duration opens the same menu right-click does', async () => {
    await pointerEvent(keyEl(2), 'pointerdown', { pointerId: 9, pointerType: 'touch', clientX: 40, clientY: 40 });
    await new Promise((res) => setTimeout(res, 600)); // past the 500ms long-press threshold
    expect(document.body.textContent).toContain('Copy Action');
    expect(document.body.textContent).toContain('Clear Key');
    await pointerEvent(document, 'pointerup', { pointerId: 9, pointerType: 'touch', clientX: 40, clientY: 40 });
  });

  it('moving before the long-press fires cancels it and starts a drag instead', async () => {
    const key0 = keyEl(0), key1 = keyEl(1);
    const restore = stubElementFromPoint(() => key1);
    await pointerEvent(key0, 'pointerdown', { pointerId: 10, pointerType: 'touch', clientX: 0, clientY: 0 });
    await pointerEvent(document, 'pointermove', { pointerId: 10, pointerType: 'touch', clientX: 50, clientY: 0 });
    await new Promise((res) => setTimeout(res, 600));
    expect(document.body.textContent).not.toContain('Copy Action'); // no context menu — it was cancelled
    await pointerEvent(document, 'pointerup', { pointerId: 10, pointerType: 'touch', clientX: 50, clientY: 0 });
    restore();
  });

  it('a mouse pointer never triggers the long-press path — right-click (contextmenu) still works as before', async () => {
    await pointerEvent(keyEl(4), 'pointerdown', { pointerId: 11, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
    await new Promise((res) => setTimeout(res, 600));
    expect(document.body.textContent).not.toContain('Copy Action'); // a plain mouse hold does nothing
    await pointerEvent(document, 'pointerup', { pointerId: 11, pointerType: 'mouse', clientX: 10, clientY: 10 });
  });
});

describe('Touch-driven layer reordering (replaces native HTML5 Drag and Drop, which iOS never fires)', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json'); // 6 named layers: Base, Meeting, Lower, Magic, Infinity, Mouse
  });

  const layerRow = (i) => qa('[data-layer-idx]').find((el) => el.dataset.layerIdx === String(i));
  const grabHandle = (i) => layerRow(i)?.querySelector('[title="Drag to reorder"]');

  it('dragging the first layer\'s handle onto the third layer reorders the layer list', async () => {
    expect(qa('[data-layer-idx]').map((el) => el.textContent).some((t) => t.includes('Base'))).toBe(true);
    const namesBefore = qa('[data-layer-idx]').map((el) => el.textContent);
    expect(namesBefore[0]).toContain('Base');
    expect(namesBefore[2]).toContain('Lower');

    const restore = stubElementFromPoint(() => layerRow(2));
    await pointerEvent(grabHandle(0), 'pointerdown', { pointerId: 12, pointerType: 'touch', clientX: 20, clientY: 100 });
    await pointerEvent(document, 'pointermove', { pointerId: 12, pointerType: 'touch', clientX: 20, clientY: 300 });
    await pointerEvent(document, 'pointerup', { pointerId: 12, pointerType: 'touch', clientX: 20, clientY: 300 });
    restore();

    const namesAfter = qa('[data-layer-idx]').map((el) => el.textContent);
    expect(namesAfter[2]).toContain('Base'); // Base moved into the 3rd slot
    expect(namesAfter[0]).toContain('Meeting'); // and Meeting shifted up to take its place
  });
});
