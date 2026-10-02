// @vitest-environment jsdom
//
// Real gap found by auditing "can auto-generated behaviors be edited from the Behavior Library,
// and should they be?": the per-key inspector already protects a GLIDE-owned behavior
// (&GLD_ht_.../&GLD_mm_.../&GLD_td_..., see core/zmk/naming.js) by cloning a shared one
// before letting it be tweaked (tests/ui/detachCustomize.test.js) — but the standalone Behavior
// Library sidebar had NO protection at all. Clicking one of these rows opened its builder modal
// exactly like any hand-made behavior; the only hint anything was different was a plain
// description string sitting in an ordinary editable text field. This proves the new
// guardGlideOwnedBehaviorOpen wrapper (glide.html) actually intercepts that click with a real
// confirm dialog, and that an ordinary, non-GLIDE-owned behavior is completely unaffected.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, byTitle, byText, keyEl, delay } from './testAppHarness.js';

const navButton = (label) => qa('button').find((b) => b.textContent.trim() === label);
const rowFor = (text) => Array.from(qa('div')).find((el) => el.textContent.includes(text) && el.className.includes('cursor-pointer'));

async function openHoldTapsTab() {
  if (!navButton('Hold-Taps')) await click(qa('button').find((b) => b.textContent.includes('Behavior Library')));
  await click(navButton('Hold-Taps'));
}

describe('Behavior Library: warning before editing a GLIDE-owned behavior', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('an ordinary hold-tap opens its builder immediately, no confirm dialog', async () => {
    await openHoldTapsTab();
    await click(rowFor('strong'));
    expect(qa('[data-testid="holdtap-modal"]')[0]).toBeTruthy();
    expect(document.body.textContent).not.toContain('GLIDE-generated behavior');
  });

  it('a GLIDE-owned hold-tap (created via Detach & Customize) asks for confirmation first, and Cancel leaves it closed', async () => {
    // Produce a real &GLD_ht_detached_... record the same way a user would — via the per-key
    // inspector's Detach & Customize flow (tests/ui/detachCustomize.test.js) — rather than
    // hand-crafting one, so this proves the real, GLIDE-generated shape triggers the guard.
    await click(keyEl(10));
    const detachBtn = qa('button').find((b) => b.textContent.includes('⑂'));
    await click(detachBtn);
    await delay(50);
    await click(byText('button', 'Detach'));

    await openHoldTapsTab();
    const detachedRow = Array.from(qa('div')).find((el) => el.textContent.includes('detached_strong') && el.className.includes('cursor-pointer'));
    expect(detachedRow).toBeTruthy();
    await click(detachedRow);

    expect(document.body.textContent).toContain('GLIDE-generated behavior');
    expect(document.body.textContent).toMatch(/break that correlation/);
    expect(qa('[data-testid="holdtap-modal"]')[0]).toBeFalsy(); // not open yet — still behind the confirm

    await click(byText('button', 'Cancel'));
    expect(qa('[data-testid="holdtap-modal"]')[0]).toBeFalsy();
    expect(document.body.textContent).not.toContain('GLIDE-generated behavior');
  });

  it('"Edit Anyway" proceeds to the real builder modal', async () => {
    await click(keyEl(10));
    const detachBtn = qa('button').find((b) => b.textContent.includes('⑂'));
    await click(detachBtn);
    await delay(50);
    await click(byText('button', 'Detach'));

    await openHoldTapsTab();
    const detachedRow = Array.from(qa('div')).find((el) => el.textContent.includes('detached_strong') && el.className.includes('cursor-pointer'));
    await click(detachedRow);
    await click(byText('button', 'Edit Anyway'));

    expect(qa('[data-testid="holdtap-modal"]')[0]).toBeTruthy();
  });
});
