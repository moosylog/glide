// @vitest-environment jsdom
//
// End-to-end proof that the Mod-Morph Builder tab/modal actually works wired into the real app —
// not just that core/zmk/modMorph.js's CRUD helpers are correct in isolation
// (tests/core/modMorph.test.js already covers that against both real fixtures).
//
// Uses tests/fixtures/tynstar.json, which has 21 real user-authored mod-morphs.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, delay } from './testAppHarness.js';

const modal = () => q('[data-testid="modmorph-modal"]');
const mByText = (tag, text) => Array.from(modal().querySelectorAll(tag)).find((el) => el.textContent.trim() === text);
const navButton = (label) => qa('button').find((b) => b.textContent.trim() === label);

async function openModMorphsTab() {
  // Morphs lives under the collapsible "Behavior Library" section, collapsed by default.
  if (!navButton('Morphs')) await click(qa('button').find((b) => b.textContent.includes('Behavior Library')));
  await click(navButton('Morphs'));
}

function rowFor(text) {
  return Array.from(qa('div')).find((el) => el.textContent.includes(text) && el.className.includes('cursor-pointer'));
}

describe('Mod-Morph Builder', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('lists the real fixture mod-morphs under the Morphs tab', async () => {
    await openModMorphsTab();
    expect(document.body.textContent).toContain('f11f21');
  });

  it('opening one shows its real bindings and trigger mods', async () => {
    await openModMorphsTab();
    await click(rowFor('f11f21'));
    expect(modal()).toBeTruthy();
    expect(modal().textContent).toContain('kp F11');
    expect(modal().textContent).toContain('kp F21');
    // MOD_LSFT/MOD_RSFT should both be highlighted as active trigger mods.
    const activeMods = Array.from(modal().querySelectorAll('button')).filter((b) => ['LSFT', 'RSFT'].includes(b.textContent.trim()) && b.className.includes('bg-app-accent'));
    expect(activeMods).toHaveLength(2);
  });

  it('shows a real single-sided-mods, non-empty-keepMods case correctly (&parsl)', async () => {
    await openModMorphsTab();
    await click(rowFor('parsl'));
    expect(modal().textContent).toContain('Keep Held');
    const rsftButtons = Array.from(modal().querySelectorAll('button')).filter((b) => b.textContent.trim() === 'RSFT');
    // one in Triggering Mods (active), one in Keep Held (also active) — both highlighted.
    expect(rsftButtons.every((b) => b.className.includes('bg-app-accent'))).toBe(true);
  });

  it('toggling a trigger mod off and applying persists on reopen', async () => {
    await openModMorphsTab();
    await click(rowFor('f11f21'));
    const rsftToggle = Array.from(modal().querySelectorAll('button')).find((b) => b.textContent.trim() === 'RSFT');
    await click(rsftToggle);
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Mod-morph saved');

    await openModMorphsTab();
    await click(rowFor('f11f21'));
    const rsftAfter = Array.from(modal().querySelectorAll('button')).find((b) => b.textContent.trim() === 'RSFT');
    expect(rsftAfter.className).not.toMatch(/bg-app-accent/);
  });

  it('creating a new mod-morph opens it immediately with the default LSFT+RSFT trigger', async () => {
    await openModMorphsTab();
    await click(Array.from(qa('button')).find((b) => b.textContent.includes('Create Mod-Morph')));
    expect(modal()).toBeTruthy();
    expect(modal().querySelector('input').value).toBe('my_mod_morph');
    const lsft = Array.from(modal().querySelectorAll('button')).find((b) => b.textContent.trim() === 'LSFT');
    expect(lsft.className).toMatch(/bg-app-accent/);
  });

  it('cloning adds a second entry without opening a modal', async () => {
    await openModMorphsTab();
    const row = rowFor('f11f21');
    await click(Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Clone mod-morph'));
    expect(document.body.textContent).toContain('Mod-morph cloned');
    expect(document.body.textContent).toContain('f11f21_copy');
  });

  it('deleting a mod-morph that is directly key-bound asks for confirmation first', async () => {
    await openModMorphsTab();
    const row = rowFor('f11f21');
    await click(Array.from(row.querySelectorAll('button')).find((b) => b.title === 'Delete mod-morph'));
    expect(document.body.textContent).toContain('Mod-morph still in use');
    await click(Array.from(qa('button')).find((b) => b.textContent.trim() === 'Delete Anyway'));
    expect(document.body.textContent).toContain('Mod-morph deleted');
  });
});
