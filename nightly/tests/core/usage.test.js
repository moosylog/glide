import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GlideCore } from '../helpers/loadCore.js';

const { countBehaviorUsage, isGlideNativeBindingValue, GLIDE_HT_PREFIX } = GlideCore;

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const loadFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'));

describe('isGlideNativeBindingValue', () => {
  it('treats plain ZMK primitives as native', () => {
    ['&kp', '&mt', '&lt', '&trans', '&none', '&mo'].forEach((v) => {
      expect(isGlideNativeBindingValue(v)).toBe(true);
    });
  });

  it('treats a GLIDE-synthesized name as native', () => {
    expect(isGlideNativeBindingValue(`${GLIDE_HT_PREFIX}mo_a`)).toBe(true);
  });

  it('treats a hand-authored custom behavior as NOT native (so it gets the "Custom" UI treatment)', () => {
    expect(isGlideNativeBindingValue('&thumb_v2_TKZ')).toBe(false);
    expect(isGlideNativeBindingValue('&parsl')).toBe(false);
  });
});

describe('countBehaviorUsage — real fixture regression', () => {
  it('correctly counts the 6-way-shared &thumb_v2_TKZ behavior in the Engrammer fixture', () => {
    const config = loadFixture('engrammer.json');
    expect(countBehaviorUsage(config, '&thumb_v2_TKZ')).toBe(6);
  });

  it('correctly counts the 2-way-shared &strong behavior in the tynstar fixture', () => {
    const config = loadFixture('tynstar.json');
    expect(countBehaviorUsage(config, '&strong')).toBe(2);
  });

  it('returns 0 for a name that does not appear anywhere', () => {
    const config = loadFixture('tynstar.json');
    expect(countBehaviorUsage(config, '&does_not_exist_anywhere')).toBe(0);
  });
});
