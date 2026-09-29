// @vitest-environment jsdom
//
// End-to-end proof that the Sticky Key Builder tab/modal actually works wired into the real app —
// not just that core/zmk/stickyKey.js's parse/build functions are correct in isolation
// (tests/core/stickyKey.test.js already covers that against the real fixture).
//
// Uses tests/fixtures/engrammer.json since it's the one real fixture with a real sticky key in it
// (`&sticky_key_quickrel_v1_TKZ`).
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, typeInto, delay } from './testAppHarness.js';

const modal = () => q('[data-testid="stickykey-modal"]');
const mByText = (tag, text) => Array.from(modal().querySelectorAll(tag)).find((el) => el.textContent.trim() === text);
const navButton = (label) => qa('button').find((b) => b.textContent.trim() === label);

async function openStickyKeysTab() {
  // Sticky lives under the collapsible "Behavior Library" section, collapsed by default.
  if (!navButton('Sticky')) await click(qa('button').find((b) => b.textContent.includes('Behavior Library')));
  await click(navButton('Sticky'));
}

function rowFor(text) {
  return Array.from(qa('div')).find((el) => el.textContent.includes(text) && el.className.includes('cursor-pointer'));
}

describe('Sticky Key Builder', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('engrammer.json');
  });

  it('lists the real fixture sticky key under the Sticky Keys tab', async () => {
    await openStickyKeysTab();
    expect(document.body.textContent).toContain('sticky_key_quickrel_v1_TKZ');
  });

  it('opening it shows its real values, not defaulted-away ones', async () => {
    await openStickyKeysTab();
    await click(rowFor('sticky_key_quickrel_v1_TKZ'));
    expect(modal()).toBeTruthy();
    expect(modal().querySelector('input[type="number"]').value).toBe('500');
    // Quick Release is true in the real fixture — its toggle checkbox should be checked.
    const toggles = modal().querySelectorAll('input[type="checkbox"]');
    expect(toggles[0].checked).toBe(true); // Quick Release
    expect(toggles[1].checked).toBe(false); // Lazy
    expect(toggles[2].checked).toBe(true); // Ignore Modifiers
  });

  it('toggling Lazy and applying persists on reopen', async () => {
    await openStickyKeysTab();
    await click(rowFor('sticky_key_quickrel_v1_TKZ'));
    const lazyToggle = modal().querySelectorAll('input[type="checkbox"]')[1];
    await click(lazyToggle);
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Sticky key saved');

    await openStickyKeysTab();
    await click(rowFor('sticky_key_quickrel_v1_TKZ'));
    expect(modal().querySelectorAll('input[type="checkbox"]')[1].checked).toBe(true);
  });

  it('creating a new sticky key opens it immediately with sensible defaults', async () => {
    await openStickyKeysTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Sticky Key')));
    expect(modal()).toBeTruthy();
    expect(modal().querySelector('input').value).toBe('my_sticky_key');
    const toggles = modal().querySelectorAll('input[type="checkbox"]');
    expect(toggles[0].checked).toBe(false); // Quick Release defaults off
    expect(toggles[2].checked).toBe(true); // Ignore Modifiers defaults on
  });

  it('cloning adds a second entry without opening a modal', async () => {
    await openStickyKeysTab();
    const row = rowFor('sticky_key_quickrel_v1_TKZ');
    await click(Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Clone sticky key'));
    expect(document.body.textContent).toContain('Sticky key cloned');
    expect(document.body.textContent).toContain('sticky_key_quickrel_v1_TKZ_copy');
  });

  it('deleting a sticky key that is still referenced (as a macro step) asks for confirmation first', async () => {
    await openStickyKeysTab();
    const row = rowFor('sticky_key_quickrel_v1_TKZ');
    await click(Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Delete sticky key'));
    expect(document.body.textContent).toContain('Sticky key still in use');
    await click(Array.from(qa('button')).find((b) => b.textContent.trim() === 'Delete Anyway'));
    expect(document.body.textContent).toContain('Sticky key deleted');
  });
});
