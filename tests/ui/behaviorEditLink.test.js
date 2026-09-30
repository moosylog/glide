// @vitest-environment jsdom
//
// UX pass (bidirectional canvas selection), forward link: selecting a key bound to a named custom
// behavior shows a small "Edit" affordance next to its slot, opening that behavior's own builder
// modal directly — see glide.html's findBehaviorCategory/openBehaviorEditor and renderSlot's new
// behaviorCategory-gated button.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, keyEl, byText, q, qa } from './testAppHarness.js';

describe('Key -> named behavior "Edit" link', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('opens the Macro Builder modal for a key bound to a macro', async () => {
    // &msteams_ptt is assigned to key 9 on layer 1 ("Meeting").
    await click(byText('span', 'Meeting'));
    await click(keyEl(9));

    const editBtn = qa('button').find((b) => b.title === "Edit this behavior's own definition");
    expect(editBtn).toBeTruthy();

    await click(editBtn);

    expect(q('[data-testid="macro-modal"]')).toBeTruthy();
    expect(q('[data-testid="macro-modal"] input')?.value).toBe('msteams_ptt');
  });

  it('does not show the link for a plain, non-custom key binding', async () => {
    await click(byText('span', 'Base'));
    await click(keyEl(0));
    expect(qa('button').find((b) => b.title === "Edit this behavior's own definition")).toBeFalsy();
  });
});
