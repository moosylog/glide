import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const {
  GLIDE_HT_PREFIX, GLIDE_MM_PREFIX, GLIDE_TD_PREFIX, GLIDE_BEHAVIOR_DESCRIPTION,
  isGlideHtName, isGlideMmName, isRecognizedTdName,
  stripGlideHtPrefix, stripGlideMmPrefix, stripTdPrefix,
} = GlideCore;

describe('GLIDE naming convention', () => {
  it('the three behavior-type prefixes are distinct, so the same identifier suffix never collides across types', () => {
    // This is the exact scenario ARCHITECTURE.md calls out: a hold-tap of hold=N1/tap=F4 and a
    // mod-morph of tap=N1/shiftTap=F4 both reduce to the identifier suffix "N1_F4". Behavior
    // names must be globally unique in the exported ZMK devicetree — without a type marker these
    // would collide into one invalid, ambiguous name.
    const suffix = 'N1_F4';
    const htName = `${GLIDE_HT_PREFIX}${suffix}`;
    const mmName = `${GLIDE_MM_PREFIX}${suffix}`;
    const tdName = `${GLIDE_TD_PREFIX}${suffix}`;
    expect(new Set([htName, mmName, tdName]).size).toBe(3);
  });

  it('only recognizes its own prefix per type — a mod-morph name is never mistaken for a hold-tap', () => {
    const mmName = `${GLIDE_MM_PREFIX}a_b`;
    expect(isGlideMmName(mmName)).toBe(true);
    expect(isGlideHtName(mmName)).toBe(false);
    expect(isRecognizedTdName(mmName)).toBe(false);
  });

  it('recognizes any hand-authored &td_ name as a tap-dance (pre-existing broad behavior, unrelated to GLIDE ownership)', () => {
    expect(isRecognizedTdName('&td_something_custom')).toBe(true);
    expect(isRecognizedTdName(`${GLIDE_TD_PREFIX}a_b`)).toBe(true);
    expect(isRecognizedTdName('&kp')).toBe(false);
  });

  it('does NOT recognize a hand-authored custom name as GLIDE-owned (no false ownership claims)', () => {
    expect(isGlideHtName('&thumb_v2_TKZ')).toBe(false);
    expect(isGlideMmName('&parsl')).toBe(false);
  });

  it('strips exactly its own prefix and nothing else', () => {
    expect(stripGlideHtPrefix(`${GLIDE_HT_PREFIX}mo_a`)).toBe('mo_a');
    expect(stripGlideMmPrefix(`${GLIDE_MM_PREFIX}n1_f4`)).toBe('n1_f4');
    expect(stripTdPrefix(`${GLIDE_TD_PREFIX}a_b`)).toBe('a_b');
    expect(stripTdPrefix('&td_auto_a_b')).toBe('a_b'); // legacy/hand-authored &td_auto_ shape
  });

  it('the ownership description is a fixed, non-empty string (used verbatim on every synthesized behavior)', () => {
    expect(typeof GLIDE_BEHAVIOR_DESCRIPTION).toBe('string');
    expect(GLIDE_BEHAVIOR_DESCRIPTION.length).toBeGreaterThan(0);
  });
});
