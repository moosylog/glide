// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, typeInto, q, qa, byText } from './testAppHarness.js';

async function openCombosTab() {
  await click(byText('button', 'Combos'));
}

describe('Combos list — search, layer filter, and mini-keyboard previews', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('engrammer.json'); // 21 real combos
    await openCombosTab();
  });

  it('shows all 21 combos with no filter applied, each with a mini-keyboard preview', async () => {
    const rows = qa('[data-key-idx]').length; // sanity: canvas still rendered underneath
    expect(rows).toBeGreaterThan(0);
    const searchInput = q('input[placeholder*="Search by name or key"]');
    expect(searchInput).toBeTruthy();
    // Each combo row renders a MiniKeyboardMap; count its distinctive container class.
    const previews = qa('.bg-app-panel\\/30');
    expect(previews.length).toBe(21);
  });

  it('filters by name (case-insensitive substring match)', async () => {
    const searchInput = q('input[placeholder*="Search by name or key"]');
    await typeInto(searchInput, 'caps');
    const previews = qa('.bg-app-panel\\/30');
    expect(previews.length).toBe(4); // matches the real fixture count checked directly above
  });

  it('filters by layer using the dropdown (compact regardless of layer count), independent of the search box', async () => {
    const layerSelect = qa('select').find((s) => s.options[0]?.textContent === 'All Layers');
    expect(layerSelect).toBeTruthy();
    const gamingOption = Array.from(layerSelect.options).find((o) => o.textContent === 'Gaming');
    expect(gamingOption).toBeTruthy();

    layerSelect.value = gamingOption.value;
    layerSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    expect(qa('.bg-app-panel\\/30').length).toBe(1); // exactly one combo is active on the Gaming layer

    // Back to "All Layers" restores the full set.
    layerSelect.value = '';
    layerSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    expect(qa('.bg-app-panel\\/30').length).toBe(21);
  });

  it('shows a distinct empty state when the filter matches nothing, vs. "no combos at all"', async () => {
    const searchInput = q('input[placeholder*="Search by name or key"]');
    await typeInto(searchInput, 'zzz_no_such_combo');
    expect(document.body.textContent).toContain('No combos match your search/filter.');
  });
});
