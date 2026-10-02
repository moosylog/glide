// @vitest-environment jsdom
//
// MoErgo ships a handful of its own proprietary, zero-param ZMK behaviors (&magic, &lower) that
// aren't something a user hand-authors — they're fixed firmware primitives, same category as
// &kp or &mo. &magic was already recognized as such; &lower was missing from the NATIVE list
// (core/usage.js), so the inspector's "Tap Action" row treated it like a hand-authored custom
// macro: a generic "Custom" badge, a "Detach & Customize" button that makes no sense for a fixed
// primitive, and the actual behavior name hidden entirely. This proves &lower now gets the same
// clean treatment &magic already had. tests/fixtures/tynstar.json has a real &lower binding at
// layer 0, key 79.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa, keyEl } from './testAppHarness.js';

describe('MoErgo native behaviors (&magic, &lower) in the inspector', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('shows &lower as a clean "Lower Action" row, not the generic "Custom" badge', async () => {
    await click(keyEl(79));
    expect(document.body.textContent).toContain('Tap Action');
    expect(document.body.textContent).toContain('Lower Action');
    const customBadge = qa('span').find((el) => el.textContent.trim().startsWith('Custom') && el.title.includes('Hand-authored custom behavior'));
    expect(customBadge).toBeFalsy();
  });

  it('offers no "Detach & Customize" button for &lower — it is a fixed MoErgo primitive, not a hand-authored behavior', async () => {
    await click(keyEl(79));
    const detachBtn = qa('button').find((b) => b.textContent.includes('⑂'));
    expect(detachBtn).toBeFalsy();
  });
});
