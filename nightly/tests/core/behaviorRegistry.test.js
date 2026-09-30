import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { getBehaviorSchema, getAllBehaviorSchemas, getDefaultValues } = GlideCore;

describe('behaviors/registry — schema lookup', () => {
  it('returns the hold_tap schema with its full property list', () => {
    const schema = getBehaviorSchema('hold_tap');
    expect(schema).toBeTruthy();
    expect(schema.zmk_behavior).toBe('zmk,behavior-hold-tap');
    const keys = schema.properties.map((p) => p.key);
    expect(keys).toEqual([
      'flavor', 'tappingTermMs', 'quickTapMs', 'requirePriorIdleMs', 'retroTap', 'holdTriggerOnRelease',
      'holdWhileUndecided', 'holdWhileUndecidedLinger', 'holdTriggerKeyPositions',
    ]);
  });

  it('returns undefined for an unregistered behavior id', () => {
    expect(getBehaviorSchema('nonexistent_behavior')).toBeUndefined();
  });

  it('getAllBehaviorSchemas lists all three registered behaviors, including mod_morph despite its empty properties', () => {
    const all = getAllBehaviorSchemas();
    const ids = all.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['hold_tap', 'tap_dance', 'mod_morph']));
    const modMorph = all.find((s) => s.id === 'mod_morph');
    expect(modMorph.properties).toEqual([]);
  });

  // These defaults must match what core/slots.js's makeHoldTap/makeTapDance actually hardcode
  // when synthesizing a new behavior — the schema describes the real objects GLIDE creates,
  // not an idealized shape, so a drift here would mean the registry lies about real defaults.
  it('getDefaultValues("hold_tap") matches makeHoldTap\'s real defaults', () => {
    expect(getDefaultValues('hold_tap')).toEqual({
      flavor: 'tap-preferred',
      tappingTermMs: 200,
      quickTapMs: -1,
      requirePriorIdleMs: 0,
      retroTap: false,
      holdTriggerOnRelease: false,
      holdWhileUndecided: false,
      holdWhileUndecidedLinger: false,
      holdTriggerKeyPositions: [],
    });
  });

  it('getDefaultValues("tap_dance") matches makeTapDance\'s real default', () => {
    expect(getDefaultValues('tap_dance')).toEqual({ tappingTermMs: 200 });
  });

  it('getDefaultValues returns undefined for an unregistered id', () => {
    expect(getDefaultValues('nonexistent_behavior')).toBeUndefined();
  });
});
