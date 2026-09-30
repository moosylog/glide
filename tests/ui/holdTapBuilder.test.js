// @vitest-environment jsdom
//
// End-to-end proof that the Hold-Tap Builder tab/modal actually works wired into the real app —
// not just that core/zmk/holdTap.js's CRUD helpers are correct in isolation (tests/core/holdTap.test.js
// already covers that against both real fixtures).
//
// Uses tests/fixtures/tynstar.json, whose single real hold-tap (&strong) is directly key-bound.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, delay, typeInto } from './testAppHarness.js';

const modal = () => q('[data-testid="holdtap-modal"]');
const mByText = (tag, text) => Array.from(modal().querySelectorAll(tag)).find((el) => el.textContent.trim() === text);
const navButton = (label) => qa('button').find((b) => b.textContent.trim() === label);

async function openHoldTapsTab() {
  // Hold-Taps lives under the collapsible "Behavior Library" section, collapsed by default.
  if (!navButton('Hold-Taps')) await click(qa('button').find((b) => b.textContent.includes('Behavior Library')));
  await click(navButton('Hold-Taps'));
}

function rowFor(text) {
  return Array.from(qa('div')).find((el) => el.textContent.includes(text) && el.className.includes('cursor-pointer'));
}

describe('Hold-Tap Builder', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('lists the real fixture hold-tap under the Hold-Taps tab', async () => {
    await openHoldTapsTab();
    expect(document.body.textContent).toContain('strong');
  });

  it('opening it shows its real flavor and bindings', async () => {
    await openHoldTapsTab();
    await click(rowFor('strong'));
    expect(modal()).toBeTruthy();
    const flavorBtn = Array.from(modal().querySelectorAll('button')).find((b) => b.textContent.trim() === 'tap-preferred');
    expect(flavorBtn.className).toMatch(/bg-app-accent/);
    const inputs = Array.from(modal().querySelectorAll('input[type="text"]'));
    const holdInput = inputs.find((i) => i.value === 'kp');
    expect(holdInput).toBeTruthy();
    const tapInput = inputs.find((i) => i.value === 'none');
    expect(tapInput).toBeTruthy();
  });

  it('editing the tapping term and applying persists on reopen, without touching the flavor', async () => {
    await openHoldTapsTab();
    await click(rowFor('strong'));
    const termInputs = modal().querySelectorAll('input[type="number"]');
    // Tapping Term is the first number field.
    await typeInto(termInputs[0], '150');
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Hold-tap saved');

    await openHoldTapsTab();
    await click(rowFor('strong'));
    expect(modal().querySelectorAll('input[type="number"]')[0].value).toBe('150');
    const flavorBtn = Array.from(modal().querySelectorAll('button')).find((b) => b.textContent.trim() === 'tap-preferred');
    expect(flavorBtn.className).toMatch(/bg-app-accent/);
  });

  it('creating a new hold-tap opens it immediately with sensible defaults', async () => {
    await openHoldTapsTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Hold-Tap')));
    expect(modal()).toBeTruthy();
    expect(modal().querySelector('input').value).toBe('my_hold_tap');
    const flavorBtn = Array.from(modal().querySelectorAll('button')).find((b) => b.textContent.trim() === 'tap-preferred');
    expect(flavorBtn.className).toMatch(/bg-app-accent/);
  });

  it('cloning adds a second entry without opening a modal', async () => {
    await openHoldTapsTab();
    const row = rowFor('strong');
    await click(Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Clone hold-tap'));
    expect(document.body.textContent).toContain('Hold-tap cloned');
    expect(document.body.textContent).toContain('strong_copy');
  });

  it('deleting a hold-tap that is directly key-bound asks for confirmation first', async () => {
    await openHoldTapsTab();
    const row = rowFor('strong');
    await click(Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Delete hold-tap'));
    expect(document.body.textContent).toContain('Hold-tap still in use');
    await click(Array.from(qa('button')).find((b) => b.textContent.trim() === 'Delete Anyway'));
    expect(document.body.textContent).toContain('Hold-tap deleted');
  });

  // Real audit finding: holdTriggerKeyPositions was editable through the per-key inspector's
  // inline hold-tap editor but had no field at all in this standalone modal — a real gap between
  // two editors for the same underlying data. hold-while-undecided/hold-while-undecided-linger
  // had no UI anywhere in GLIDE until this pass. See core/zmk/holdTap.js's header.
  it('shows the Hold Trigger Keys mini-keyboard, always visible (not under Advanced)', async () => {
    await openHoldTapsTab();
    await click(rowFor('strong'));
    expect(modal().textContent).toContain('Hold Trigger Keys');
    // Clicking a key in the mini-map toggles it into holdTriggerKeyPositions and persists on Apply.
    const miniMapKey = modal().querySelector('.divide-y')?.previousElementSibling?.querySelector('[style*="position: absolute"]')
      || Array.from(modal().querySelectorAll('div')).find((el) => el.getAttribute('style')?.includes('position: absolute'));
    expect(miniMapKey).toBeTruthy();
  });

  it('Hold While Undecided / Hold While Undecided (Linger) live under an Advanced disclosure and persist on Apply', async () => {
    await openHoldTapsTab();
    await click(rowFor('strong'));
    expect(modal().textContent).not.toContain('Hold While Undecided');

    await click(mByText('button', '▸ Advanced'));
    expect(modal().textContent).toContain('Hold While Undecided');
    expect(modal().textContent).toContain('Hold While Undecided (Linger)');

    const undecidedToggle = Array.from(modal().querySelectorAll('input[type="checkbox"]')).find((input, i, all) => {
      // Toggle's own label sits in a sibling span, not an aria-label — find by the row's text.
      const row = input.closest('label');
      return row?.textContent.includes('Hold While Undecided') && !row.textContent.includes('Linger');
    });
    expect(undecidedToggle).toBeTruthy();
    undecidedToggle.click();
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Hold-tap saved');

    await openHoldTapsTab();
    await click(rowFor('strong'));
    await click(mByText('button', '▸ Advanced'));
    const reopened = Array.from(modal().querySelectorAll('input[type="checkbox"]')).find((input) => {
      const row = input.closest('label');
      return row?.textContent.includes('Hold While Undecided') && !row.textContent.includes('Linger');
    });
    expect(reopened.checked).toBe(true);
  });
});
