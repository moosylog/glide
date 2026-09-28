import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { parseSlots, buildBindingAndConfig, GLIDE_HT_PREFIX, GLIDE_MM_PREFIX, GLIDE_TD_PREFIX, GLIDE_BEHAVIOR_DESCRIPTION } = GlideCore;

const emptyConfig = () => ({ layers: [[]] });

describe('buildBindingAndConfig / parseSlots — hold-tap synthesis', () => {
  it('collapses hold=Momentary-Layer + tap=&kp directly to native &lt (already-real-tap case)', () => {
    const { newBinding } = buildBindingAndConfig(
      { tap: { value: '&kp', params: [{ value: 'A' }] }, hold: { value: '&mo', params: [{ value: 2 }] } },
      emptyConfig()
    );
    expect(newBinding.value).toBe('&lt');
    expect(newBinding.params[0].value).toBe(2);
    expect(newBinding.params[1].value).toBe('A');
  });

  it('REGRESSION (assignLayerTap bug): hold-only with tap=null produces a binding that CANNOT be decomposed back into a hold — this is exactly why callers must never do this', () => {
    // This test documents the dangerous contract, not a desired behavior: makeHoldTap's
    // early-return optimization (`if (!tap && hold) return hold;`) is correct when the caller
    // genuinely means "just a standalone momentary-layer key", but indistinguishable from an
    // in-progress "hold assigned, tap still pending" state. The UI-level fix (assignLayerTap)
    // works around this by never calling buildBindingAndConfig with tap: null in the first
    // place — see the next test for the correct contract it relies on instead.
    const { newBinding } = buildBindingAndConfig(
      { tap: null, hold: { value: '&mo', params: [{ value: 3 }] } },
      emptyConfig()
    );
    expect(newBinding).toEqual({ value: '&mo', params: [{ value: 3 }] });

    // Prove the danger: parsing this binding back does NOT recover the hold.
    const reparsed = parseSlots(newBinding, emptyConfig());
    expect(reparsed.hold).toBeNull();
  });

  it('FIX CONTRACT: hold + an explicit tap placeholder ({value:"&none"}) survives a round-trip through parseSlots', () => {
    const config = emptyConfig();
    const { newBinding, newConfig } = buildBindingAndConfig(
      { tap: { value: '&none' }, hold: { value: '&mo', params: [{ value: 3 }] } },
      config
    );
    // Must NOT be a bare native &mo — must be a real, GLIDE-owned, decomposable wrapper.
    expect(newBinding.value.startsWith(GLIDE_HT_PREFIX)).toBe(true);

    const reparsed = parseSlots(newBinding, newConfig);
    expect(reparsed.hold).toEqual({ value: '&mo', params: [{ value: 3 }] });
    // The &none placeholder normalizes to null on the way back out — same as &none does
    // everywhere else in parseSlots/parseModMorph. What actually matters, and is the whole
    // point of this fix, is that the hold survived the round-trip.
    expect(reparsed.tap).toBeFalsy();
  });

  it('FIX CONTRACT continued: assigning a real tap afterwards preserves the hold and collapses to native &lt', () => {
    const config = emptyConfig();
    // Step 1: assignLayerTap's actual behavior — hold set, explicit tap placeholder.
    const step1 = buildBindingAndConfig(
      { tap: { value: '&none' }, hold: { value: '&mo', params: [{ value: 3 }] } },
      config
    );
    // Step 2: assignAction's actual behavior — re-parse, then overwrite tap only.
    const slotsAfterStep1 = parseSlots(step1.newBinding, step1.newConfig);
    const step2 = buildBindingAndConfig(
      { ...slotsAfterStep1, tap: { value: '&kp', params: [{ value: 'B' }] } },
      step1.newConfig
    );
    expect(step2.newBinding).toEqual({
      value: '&lt',
      params: [{ value: 3 }, { value: 'B' }],
    });
  });

  it('synthesizes a GLIDE_ht_ behavior with the ownership description for a non-&kp tap', () => {
    const { newBinding, newConfig } = buildBindingAndConfig(
      { tap: { value: '&some_macro' }, hold: { value: '&mo', params: [{ value: 1 }] } },
      emptyConfig()
    );
    expect(newBinding.value.startsWith(GLIDE_HT_PREFIX)).toBe(true);
    const behavior = newConfig.holdTaps.find((h) => h.name === newBinding.value);
    expect(behavior.description).toBe(GLIDE_BEHAVIOR_DESCRIPTION);
  });
});

describe('buildBindingAndConfig / parseSlots — mod-morph synthesis', () => {
  it('synthesizes a GLIDE_mm_ behavior for tap+shiftTap and round-trips through parseSlots', () => {
    const { newBinding, newConfig } = buildBindingAndConfig(
      { tap: { value: '&kp', params: [{ value: 'N1' }] }, shiftTap: { value: '&kp', params: [{ value: 'F4' }] } },
      emptyConfig()
    );
    expect(newBinding.value.startsWith(GLIDE_MM_PREFIX)).toBe(true);
    const behavior = newConfig.modMorphs.find((m) => m.name === newBinding.value);
    expect(behavior.description).toBe(GLIDE_BEHAVIOR_DESCRIPTION);
    expect(behavior.cases[1].mods).toEqual(['MOD_LSFT', 'MOD_RSFT']);

    const reparsed = parseSlots(newBinding, newConfig);
    expect(reparsed.tap).toEqual({ value: '&kp', params: [{ value: 'N1' }] });
    expect(reparsed.shiftTap).toEqual({ value: '&kp', params: [{ value: 'F4' }] });
  });
});

describe('buildBindingAndConfig / parseSlots — tap-dance synthesis', () => {
  it('synthesizes a GLIDE_td_ behavior for tap+doubleTap and round-trips through parseSlots', () => {
    const { newBinding, newConfig } = buildBindingAndConfig(
      { tap: { value: '&kp', params: [{ value: 'A' }] }, doubleTap: { value: '&kp', params: [{ value: 'B' }] } },
      emptyConfig()
    );
    expect(newBinding.value.startsWith(GLIDE_TD_PREFIX)).toBe(true);
    const behavior = newConfig.tapDances.find((t) => t.name === newBinding.value);
    expect(behavior.description).toBe(GLIDE_BEHAVIOR_DESCRIPTION);

    const reparsed = parseSlots(newBinding, newConfig);
    expect(reparsed.tap).toEqual({ value: '&kp', params: [{ value: 'A' }] });
    expect(reparsed.doubleTap).toEqual({ value: '&kp', params: [{ value: 'B' }] });
  });
});
