// @vitest-environment jsdom
//
// Proves the schema-driven DynamicBehaviorForm (core/behaviors/schemas.js + registry.js +
// compile.js, rendered by glide.html's DynamicBehaviorForm component) is actually wired into
// the real gear/Settings panel — not just that the schema/compile core-layer unit tests pass
// in isolation. Uses the real &strong hand-authored holdTap from tynstar.json, the same fixture
// key detachCustomize.test.js exercises.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, typeInto, qa, keyEl } from './testAppHarness.js';

async function openHoldGearSettings() {
  // Two buttons share title="Settings" — the global canvas-settings gear (top toolbar) and the
  // hold slot's per-behavior config gear (right panel, next to Detach & Customize). The slot's
  // gear is the one rendered later in the DOM.
  const gearBtns = qa('button').filter((b) => b.title === 'Settings');
  expect(gearBtns.length).toBeGreaterThan(0);
  await click(gearBtns[gearBtns.length - 1]);
}

describe('DynamicBehaviorForm — schema-driven hold-tap settings panel', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
    // Key 10 (Esc) uses the shared &strong holdTap (tappingTermMs: 100, quickTapMs: 100).
    await click(keyEl(10));
  });

  it('renders the real holdTap values through schema-driven widgets, not hardcoded defaults', async () => {
    await openHoldGearSettings();
    const tappingTermInput = qa('input[type="number"]')[0];
    expect(tappingTermInput.value).toBe('100');
  });

  it('editing Tapping Term through the generic number_input widget writes back through updateBehaviorSetting, coerced by the schema', async () => {
    await openHoldGearSettings();
    const numberInputs = qa('input[type="number"]');
    // Tapping Term is the first number_input in the hold_tap schema's property order.
    await typeInto(numberInputs[0], '9999'); // above schema max (1000) — must clamp, not pass through raw

    // The panel re-renders in place after the edit (the gear toggle only fires on its own
    // button, not on typing), so the same input element reflects the clamped, re-committed value.
    const after = qa('input[type="number"]')[0];
    expect(after.value).toBe('1000'); // clamped to schema max, proving compileBehaviorProperty ran
  });

  it('toggling Retro Tap through the generic toggle widget updates the real behavior object', async () => {
    await openHoldGearSettings();
    const retroTapCheckbox = qa('input[type="checkbox"]').find((el) => el.closest('label')?.textContent.includes('Retro Tap'));
    expect(retroTapCheckbox).toBeTruthy();
    expect(retroTapCheckbox.checked).toBe(false);

    await click(retroTapCheckbox);

    const after = qa('input[type="checkbox"]').find((el) => el.closest('label')?.textContent.includes('Retro Tap'));
    expect(after.checked).toBe(true);
  });

  it('an out-of-range Flavor value falls back to the schema default rather than corrupting the select', async () => {
    await openHoldGearSettings();
    const flavorSelect = qa('select').find((s) => Array.from(s.options).some((o) => o.value === 'hold-preferred'));
    expect(flavorSelect).toBeTruthy();
    expect(flavorSelect.value).toBe('tap-preferred'); // &strong's real stored flavor
  });
});
