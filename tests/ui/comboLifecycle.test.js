// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, typeInto, q, qa, byText, byTitle, keyEl } from './testAppHarness.js';

describe('Combo lifecycle — create, edit, delete', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json'); // 21 real pre-existing combos
    await click(byText('button', 'Combos'));
  });

  it('creates a new combo, assigns two keys to it via Zen mode, renames it, and it becomes findable by that name', async () => {
    const createBtn = byText('button', '+ Create Combo');
    await click(createBtn);

    // Creating a combo enters Zen (focus) mode automatically.
    expect(document.body.textContent).toContain('Focus Mode');

    // Pick two keys for the combo.
    await click(keyEl(0));
    await click(keyEl(1));
    expect(document.body.textContent).toMatch(/2 keys active/);

    // Rename it via Combo Settings — available throughout Zen mode, before exiting.
    await click(qa('button').find((b) => b.textContent.includes('Combo Settings')));
    const nameInput = qa('input[type="text"]').find((el) => el.closest('div')?.textContent.includes('Name'));
    expect(nameInput).toBeTruthy();
    await typeInto(nameInput, 'my special combo');

    // Now exit Zen mode.
    await click(byText('button', 'Done Editing'));
    expect(document.body.textContent).not.toContain('Focus Mode');

    // Back out to the combo list and confirm it shows the new name and total count grew by 1.
    const rows = qa('.bg-app-panel\\/30');
    expect(rows.length).toBe(22); // 21 original + 1 new

    // Confirm it's findable by the new name via search.
    const searchInput = q('input[placeholder*="Search by name or key"]');
    await typeInto(searchInput, 'my special combo');
    expect(qa('.bg-app-panel\\/30').length).toBe(1);
    expect(document.body.textContent).toContain('my special combo');
  });

  it('deletes a combo and it disappears from the list', async () => {
    const initialCount = qa('.bg-app-panel\\/30').length;
    expect(initialCount).toBe(21);

    // Hover-reveal delete buttons are opacity-0 by default but still clickable via dispatch.
    const deleteButtons = qa('button').filter((b) => b.textContent.trim() === '🗑️');
    expect(deleteButtons.length).toBeGreaterThan(0);
    await click(deleteButtons[0]);

    expect(qa('.bg-app-panel\\/30').length).toBe(20);
  });
});
