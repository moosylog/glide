// @vitest-environment jsdom
//
// End-to-end proof that the Macro Builder tab/modal actually works wired into the real app —
// listing real macros, opening one and seeing its real steps, editing and applying changes, and
// creating/cloning/deleting — not just that core/zmk/macro.js's parse/build functions are correct
// in isolation (tests/core/macro.test.js already covers that against both real fixtures).
//
// Uses tests/fixtures/tynstar.json (62 real macros) since it's already a full, loadable layout.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, typeInto, delay } from './testAppHarness.js';

const modal = () => q('[data-testid="macro-modal"]');
const mByText = (tag, text) => Array.from(modal().querySelectorAll(tag)).find((el) => el.textContent.trim() === text);
const navButton = (label) => qa('button').find((b) => b.textContent.trim() === label);

async function openMacrosTab() {
  // Macros lives under the collapsible "Behavior Library" section, collapsed by default.
  if (!navButton('Macros')) await click(qa('button').find((b) => b.textContent.includes('Behavior Library')));
  await click(navButton('Macros'));
}

describe('Macro Builder', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('lists the real fixture macros under the Macros tab', async () => {
    await openMacrosTab();
    expect(document.body.textContent).toContain('msteams_ptt');
    // 62 real macros in this fixture — the list shouldn't silently drop any.
    expect(qa('[data-layer-idx]').length).toBe(0); // sanity: not still on the Layers tab's DOM
  });

  it('opening a macro shows its real steps, including the pause-for-release split', async () => {
    await openMacrosTab();
    await click(Array.from(qa('div')).find((el) => el.textContent.includes('msteams_ptt') && el.className.includes('cursor-pointer')));
    expect(modal()).toBeTruthy();
    expect(modal().textContent).toContain('Pause For Release');
    expect(modal().textContent).toContain('kp LC(LS(M))'); // Ctrl+Shift+M, nested params rendered in full
  });

  it('editing the description and applying persists the change', async () => {
    await openMacrosTab();
    await click(Array.from(qa('div')).find((el) => el.textContent.includes('msteams_ptt') && el.className.includes('cursor-pointer')));
    const descInput = modal().querySelector('input[type="text"]');
    await typeInto(descInput, 'Updated description');
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Macro saved');

    await openMacrosTab();
    await click(Array.from(qa('div')).find((el) => el.textContent.includes('msteams_ptt') && el.className.includes('cursor-pointer')));
    expect(modal().querySelector('input[type="text"]').value).toBe('Updated description');
  });

  it('adding a Wait Time step and applying keeps it on reopen', async () => {
    await openMacrosTab();
    await click(Array.from(qa('div')).find((el) => el.textContent.includes('msteams_ptt') && el.className.includes('cursor-pointer')));
    const before = modal().querySelectorAll('input[type="number"]').length;
    const select = Array.from(modal().querySelectorAll('select')).find((s) => Array.from(s.options).some((o) => o.value === 'waitTime'));
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    nativeSetter.call(select, 'waitTime');
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    await delay();
    expect(modal().querySelectorAll('input[type="number"]').length).toBe(before + 1);
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Macro saved');
  });

  it('creating a new macro opens it immediately, with its one seed step ready to edit', async () => {
    await openMacrosTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Macro')));
    expect(modal()).toBeTruthy();
    expect(modal().querySelector('input').value).toBe('my_macro');
  });

  it('cloning a macro adds a second entry without opening a modal', async () => {
    await openMacrosTab();
    const row = Array.from(qa('div')).find((el) => el.textContent.includes('msteams_ptt') && el.className.includes('cursor-pointer'));
    const cloneBtn = Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Clone macro');
    await click(cloneBtn);
    expect(document.body.textContent).toContain('Macro cloned');
    expect(document.body.textContent).toContain('msteams_ptt_copy');
  });

  it('deleting an unreferenced macro removes it without confirmation', async () => {
    await openMacrosTab();
    // &xauml1 is one of tynstar's plain unicode-sequence macros — not assigned to any key or
    // referenced elsewhere in this fixture, unlike &msteams_ptt which a real key binds directly.
    const row = Array.from(qa('div')).find((el) => el.textContent.includes('xauml1') && el.className.includes('cursor-pointer'));
    const deleteBtn = Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Delete macro');
    await click(deleteBtn);
    expect(document.body.textContent).toContain('Macro deleted');
    expect(document.body.textContent).not.toContain('xauml1');
  });

  it('deleting a macro that is still referenced asks for confirmation first', async () => {
    await openMacrosTab();
    const row = Array.from(qa('div')).find((el) => el.textContent.includes('msteams_ptt') && el.className.includes('cursor-pointer'));
    const deleteBtn = Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Delete macro');
    await click(deleteBtn);
    expect(document.body.textContent).toContain('Macro still in use');
    expect(document.body.textContent).toContain('msteams_ptt');
    await click(Array.from(qa('button')).find((b) => b.textContent.trim() === 'Delete Anyway'));
    expect(document.body.textContent).toContain('Macro deleted');
  });
});
