// @vitest-environment jsdom
//
// The per-key vertical tab that assigns a layer-SWITCHING action (Momentary/Layer-Tap/Sticky/
// Toggle/Switch-To) to the selected key used to be titled "Layers" — the exact same label as the
// left sidebar's "Layers" toggle (which manages/reorders the keyboard's layers themselves, a
// completely different job). Renamed to "Switch Layer" to remove that collision, the same class
// of fix as "Advanced Behaviors" vs. "Behavior Library" (behaviorLibraryNav.test.js).
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, byTitle, byText, keyEl } from './testAppHarness.js';

describe('Per-key "Switch Layer" tab naming', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('is titled "Switch Layer", not "Layers" — no collision with the sidebar\'s Layers toggle', async () => {
    expect(byTitle('Switch Layer')).toBeTruthy();
    expect(byTitle('Layers')).toBeFalsy();
    // The sidebar's own "Layers" toggle is a labeled button with visible text, a different
    // lookup entirely — proving the two never shared one name to begin with.
    expect(byText('button', 'Layers')).toBeTruthy();
  });

  it('opens the same layer-switching-action panel it always did, just under its new name', async () => {
    await click(keyEl(0));
    await click(byTitle('Switch Layer'));
    expect(document.body.textContent).toContain('Momentary (&mo)');
    expect(document.body.textContent).toContain('Layer-Tap (&lt)');
    expect(document.body.textContent).toContain('Target Layer');
  });
});
