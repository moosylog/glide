// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, byText, delay } from './testAppHarness.js';

// tynstar.json's real layer names — NOT generic "Layer N" labels. Tests assert against these
// rather than hardcoded "Layer 0" text, since the app renders layerNames[i] for real fixtures.
const LAYER_NAMES = ['Base', 'Meeting', 'Lower', 'Magic', 'Infinity', 'Mouse'];

async function openComboSettings() {
  const btn = qa('button').find((b) => b.textContent.includes('Combo Settings'));
  await click(btn);
}

function getAllLayersCheckbox() {
  return qa('input[type="checkbox"]').find((el) => el.closest('label')?.textContent.includes('all layers'));
}

// Layer-name chips also appear elsewhere on the page (e.g. a Momentary-Layer keycode picker),
// so layer-chip queries must be scoped to the Combo Settings panel itself, not the whole document.
function getSettingsPanel() {
  return getAllLayersCheckbox()?.closest('.shadow-inner.flex.flex-col.gap-4') || null;
}
function settingsButtons() {
  const panel = getSettingsPanel();
  return panel ? Array.from(panel.querySelectorAll('button')) : [];
}

describe('Combo layer scope (layers: [-1] = all layers)', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
    await click(byText('button', 'Combos'));
  });

  it('a new combo defaults to "applies on all layers" checked, with no per-layer picker shown', async () => {
    const createBtn = qa('button').find((b) => b.textContent.includes('Create Combo'));
    await click(createBtn);
    await openComboSettings();

    const checkbox = getAllLayersCheckbox();
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(true);
    // With "all layers" checked, none of the real layer-name chips should be rendered
    // within the Combo Settings panel.
    LAYER_NAMES.forEach((name) => {
      const chip = settingsButtons().find((b) => b.textContent.trim() === name);
      expect(chip).toBeFalsy();
    });
  });

  it('unchecking reveals the layer picker, pre-populated with the current active layer (never empty)', async () => {
    const createBtn = qa('button').find((b) => b.textContent.includes('Create Combo'));
    await click(createBtn);
    await openComboSettings();

    const checkbox = getAllLayersCheckbox();
    await click(checkbox);
    expect(checkbox.checked).toBe(false);

    // The active layer (Base, layer 0 by default) should show as selected.
    const baseChip = settingsButtons().find((b) => b.textContent.trim() === 'Base');
    expect(baseChip).toBeTruthy();
    expect(baseChip.className).toMatch(/bg-app-accent/);
  });

  it('cannot leave zero layers selected — deselecting the last specific layer falls back to the active layer', async () => {
    const createBtn = qa('button').find((b) => b.textContent.includes('Create Combo'));
    await click(createBtn);
    await openComboSettings();

    const checkbox = getAllLayersCheckbox();
    await click(checkbox); // now specific layers, defaults to ['Base']

    const baseChip = settingsButtons().find((b) => b.textContent.trim() === 'Base');
    // Deselect the only selected layer.
    await click(baseChip);
    await delay();

    // It must fall back to the active layer rather than leaving nothing selected.
    const baseChipAfter = settingsButtons().find((b) => b.textContent.trim() === 'Base');
    expect(baseChipAfter.className).toMatch(/bg-app-accent/);
  });

  it('re-checking "all layers" hides the picker again and hides the specific-layer chips', async () => {
    const createBtn = qa('button').find((b) => b.textContent.includes('Create Combo'));
    await click(createBtn);
    await openComboSettings();

    const checkbox = getAllLayersCheckbox();
    await click(checkbox);
    await click(checkbox);

    expect(checkbox.checked).toBe(true);
    LAYER_NAMES.forEach((name) => {
      const chip = settingsButtons().find((b) => b.textContent.trim() === name);
      expect(chip).toBeFalsy();
    });
  });

  it('creating a combo automatically switches the inspector tab back to Keymap', async () => {
    // Switch away from Keymap first (e.g. Advanced tab) to prove the reset actually happens.
    const advancedTabBtn = qa('button[title="Advanced Behaviors"]')[0];
    if (advancedTabBtn) await click(advancedTabBtn);

    const createBtn = qa('button').find((b) => b.textContent.includes('Create Combo'));
    await click(createBtn);

    const keymapBtn = qa('button[title="Pick Key"]')[0];
    expect(keymapBtn.className).toMatch(/btn-active/);
  });
});
