import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { compileBehaviorProperty, compileBehaviorProperties } = GlideCore;

describe('behaviors/compile — coercing raw widget input against a schema', () => {
  it('coerces a stringified number from a DOM input into a real number', () => {
    expect(compileBehaviorProperty('hold_tap', 'tappingTermMs', '350')).toBe(350);
  });

  it('clamps a number above the schema max down to the max', () => {
    expect(compileBehaviorProperty('hold_tap', 'tappingTermMs', 5000)).toBe(1000);
  });

  it('clamps a number below the schema min up to the min', () => {
    // quickTapMs's min is -1 (meaning "disabled"); anything lower is nonsensical input.
    expect(compileBehaviorProperty('hold_tap', 'quickTapMs', -50)).toBe(-1);
  });

  it('falls back to the property default on a non-numeric value for a number property', () => {
    expect(compileBehaviorProperty('hold_tap', 'tappingTermMs', 'not-a-number')).toBe(200);
  });

  it('falls back to the property default when an enum value is not one of its options', () => {
    expect(compileBehaviorProperty('hold_tap', 'flavor', 'made-up-flavor')).toBe('tap-preferred');
  });

  it('accepts a valid enum value unchanged', () => {
    expect(compileBehaviorProperty('hold_tap', 'flavor', 'balanced')).toBe('balanced');
  });

  it('coerces a boolean-widget value with double-negation (checkbox .checked is already boolean, but truthy strings/0/1 should still normalize)', () => {
    expect(compileBehaviorProperty('hold_tap', 'retroTap', true)).toBe(true);
    expect(compileBehaviorProperty('hold_tap', 'retroTap', 0)).toBe(false);
  });

  it('passes an unrecognized key/schema straight through rather than blocking the write', () => {
    expect(compileBehaviorProperty('hold_tap', 'not_a_real_key', 'whatever')).toBe('whatever');
    expect(compileBehaviorProperty('nonexistent_behavior', 'flavor', 'whatever')).toBe('whatever');
  });

  it('compileBehaviorProperties fills in every schema property, defaulting anything missing from the input', () => {
    const result = compileBehaviorProperties('hold_tap', { flavor: 'balanced', tappingTermMs: 300 });
    expect(result).toEqual({
      flavor: 'balanced',
      tappingTermMs: 300,
      quickTapMs: -1,
      requirePriorIdleMs: 0,
      retroTap: false,
      holdTriggerOnRelease: false,
      holdWhileUndecided: false,
      holdWhileUndecidedLinger: false,
      holdTriggerKeyPositions: [],
    });
  });

  it('compileBehaviorProperties round-trips a real GLIDE-synthesized holdTap object unchanged', () => {
    // Exactly the shape core/slots.js's makeHoldTap produces for a new behavior.
    const real = {
      name: '&GLIDE_ht_N1_F4', description: 'x', bindings: [{ value: '&kp' }, { value: '&kp' }],
      tappingTermMs: 200, flavor: 'tap-preferred', quickTapMs: -1, requirePriorIdleMs: 0,
      retroTap: false, holdTriggerOnRelease: false,
    };
    const compiled = compileBehaviorProperties('hold_tap', real);
    expect(compiled.tappingTermMs).toBe(200);
    expect(compiled.flavor).toBe('tap-preferred');
    expect(compiled.quickTapMs).toBe(-1);
    expect(compiled.requirePriorIdleMs).toBe(0);
    expect(compiled.retroTap).toBe(false);
    expect(compiled.holdTriggerOnRelease).toBe(false);
  });
});
