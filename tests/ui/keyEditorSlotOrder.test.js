// @vitest-environment jsdom
//
// The "You can also specify an action to do..." links (SLOT_LINK_LABELS in glide.html) used to
// list Shift Action first purely by build-history accident (it was the first of the four slot
// types implemented), not because it's the one a non-technical user is most likely to want. This
// proves the reordered priority — hold, double-tap, label, then shift, the most common/approachable
// first and the most advanced (Shift Action is a mod-morph under the hood) last — and that the
// hint text is no longer sized like fine print.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, keyEl } from './testAppHarness.js';

const alsoSpecifyLinks = () => qa('span.text-app-accent.underline').map((s) => s.textContent.trim());
const alsoSpecifyContainer = () => qa('div').find((d) => d.textContent.trim().startsWith('You can also specify an action to do'));

describe('Key editor "also specify" slot links', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('lists all four in the new order: hold, double-tap, label, then shift (not shift-first)', async () => {
    // Key 20 is a plain `&kp N0` (tests/ui/clearAllActions.test.js) — no shiftTap/hold/doubleTap/
    // label slot is active yet, so all four show up as "also specify" links.
    await click(keyEl(20));
    expect(alsoSpecifyLinks()).toEqual([
      'when held',
      'when double-tapped',
      'add text label to the key',
      'when tapped with Shift',
    ]);
  });

  it('adding hold/double-tap/label first still leaves Shift Action for last', async () => {
    await click(keyEl(20));
    // Click each link in turn (renderSlot mounts each activated slot's own editor immediately,
    // which shouldn't affect the ones still awaiting activation).
    await click(qa('span.text-app-accent.underline').find((s) => s.textContent.trim() === 'when held'));
    await click(qa('span.text-app-accent.underline').find((s) => s.textContent.trim() === 'when double-tapped'));
    expect(alsoSpecifyLinks()).toEqual(['add text label to the key', 'when tapped with Shift']);
  });

  it('is no longer sized like fine print (bumped up from the old 11.5px)', async () => {
    await click(keyEl(20));
    const container = alsoSpecifyContainer();
    expect(container.className).toContain('text-[12.5px]');
    expect(container.className).not.toContain('text-[11.5px]');
  });
});
