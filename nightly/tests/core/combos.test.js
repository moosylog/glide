import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { MAX_COMBO_KEYS } = GlideCore;

describe('zmk/combos — ZMK combo constraints', () => {
  it('MAX_COMBO_KEYS matches ZMK\'s CONFIG_ZMK_COMBOS_MAX_KEYS_PER_COMBO default', () => {
    expect(MAX_COMBO_KEYS).toBe(4);
  });
});
