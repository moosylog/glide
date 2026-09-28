import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { GLOVE80_GEO, GO60_GEO, GLOVE80_NAMES, GO60_NAMES, getLogicalName } = GlideCore;

describe('board geometry', () => {
  it('Glove80 has 80 key positions', () => {
    expect(GLOVE80_GEO).toHaveLength(80);
  });

  it('Go60 geometry has 62 entries: the 60-key matrix plus 2 touchpad regions (indices 60/61, special-cased elsewhere as non-key zones)', () => {
    expect(GO60_GEO).toHaveLength(62);
  });

  it('every Glove80 geometry entry has finite pixel coordinates', () => {
    GLOVE80_GEO.forEach((k) => {
      expect(Number.isFinite(k.x)).toBe(true);
      expect(Number.isFinite(k.y)).toBe(true);
    });
  });

  it('getLogicalName resolves a known index to its human-readable position and falls back to the raw index otherwise', () => {
    expect(getLogicalName(0, 'glove80')).toBe(GLOVE80_NAMES[0]);
    expect(getLogicalName(0, 'go60')).toBe(GO60_NAMES[0]);
    expect(getLogicalName(9999, 'glove80')).toBe(9999);
  });
});
