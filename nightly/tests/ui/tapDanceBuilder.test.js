// @vitest-environment jsdom
//
// End-to-end proof that the Tap-Dance Builder tab/modal works wired into the real app. Neither
// real fixture has a user-authored tap-dance (see core/zmk/tapDance.js's header), so this exercises
// the full create -> edit -> add/remove taps -> save -> delete lifecycle from a blank slate.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, delay, typeInto } from './testAppHarness.js';

const modal = () => q('[data-testid="tapdance-modal"]');
const mByText = (tag, text) => Array.from(modal().querySelectorAll(tag)).find((el) => el.textContent.trim() === text);
const navButton = (label) => qa('button').find((b) => b.textContent.trim() === label);

async function openTapDancesTab() {
  // Tap-Dances lives under the collapsible "Behavior Library" section, collapsed by default.
  if (!navButton('Tap-Dances')) await click(qa('button').find((b) => b.textContent.includes('Behavior Library')));
  await click(navButton('Tap-Dances'));
}

function rowFor(text) {
  return Array.from(qa('div')).find((el) => el.textContent.includes(text) && el.className.includes('cursor-pointer'));
}

describe('Tap-Dance Builder', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('shows the empty state when no tap-dances exist yet', async () => {
    await openTapDancesTab();
    expect(document.body.textContent).toContain('No tap-dances created yet.');
  });

  it('creating a new tap-dance opens it immediately with two default taps', async () => {
    await openTapDancesTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Tap-Dance')));
    expect(modal()).toBeTruthy();
    expect(modal().querySelector('input').value).toBe('my_tap_dance');
    expect(modal().textContent).toContain('1st Tap');
    expect(modal().textContent).toContain('2nd Tap');
  });

  it('can add a third tap, then remove it back down to two', async () => {
    await openTapDancesTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Tap-Dance')));
    await click(mByText('button', '+ Add Tap'));
    expect(modal().textContent).toContain('3rd Tap');

    const removeButtons = Array.from(modal().querySelectorAll('button')).filter((b) => b.title === 'Remove this tap');
    expect(removeButtons).toHaveLength(3);
    await click(removeButtons[2]);
    expect(modal().textContent).not.toContain('3rd Tap');
    // Can't go below 2 — no remove buttons shown at the floor.
    expect(Array.from(modal().querySelectorAll('button')).filter((b) => b.title === 'Remove this tap')).toHaveLength(0);
  });

  it('saving persists the tapping term and taps on reopen', async () => {
    await openTapDancesTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Tap-Dance')));
    const termInput = modal().querySelector('input[type="number"]');
    await typeInto(termInput, '175');
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Tap-dance saved');

    await openTapDancesTab();
    await click(rowFor('my_tap_dance'));
    expect(modal().querySelector('input[type="number"]').value).toBe('175');
  });

  it('cloning and deleting work the same as the other behavior builders', async () => {
    await openTapDancesTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Tap-Dance')));
    await click(mByText('button', 'Cancel'));

    await openTapDancesTab();
    const row = rowFor('my_tap_dance');
    await click(Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Clone tap-dance'));
    expect(document.body.textContent).toContain('Tap-dance cloned');
    expect(document.body.textContent).toContain('my_tap_dance_copy');

    const cloneRow = rowFor('my_tap_dance_copy');
    await click(Array.from(cloneRow.querySelectorAll('button')).find((b) => b.title === 'Delete tap-dance'));
    // Nothing references a freshly-created tap-dance, so no confirmation dialog — deletes right away.
    expect(document.body.textContent).toContain('Tap-dance deleted');
  });
});
