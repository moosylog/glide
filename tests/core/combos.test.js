import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { MAX_COMBO_KEYS, comboHasBinding, keyPositionSetsEqual, comboLayerScopesOverlap, findDuplicateCombos } = GlideCore;

describe('zmk/combos — ZMK combo constraints', () => {
  it('MAX_COMBO_KEYS matches ZMK\'s CONFIG_ZMK_COMBOS_MAX_KEYS_PER_COMBO default', () => {
    expect(MAX_COMBO_KEYS).toBe(4);
  });
});

describe('comboHasBinding', () => {
  it('is false for a freshly-created combo (GLIDE\'s own &none default)', () => {
    expect(comboHasBinding({ binding: { value: '&none' } })).toBe(false);
  });
  it('is false with no binding field at all', () => {
    expect(comboHasBinding({})).toBe(false);
    expect(comboHasBinding(null)).toBe(false);
  });
  it('is true once a real action is assigned', () => {
    expect(comboHasBinding({ binding: { value: '&kp', params: [{ value: 'ESC' }] } })).toBe(true);
  });
});

describe('keyPositionSetsEqual', () => {
  it('is order-independent', () => {
    expect(keyPositionSetsEqual([3, 7], [7, 3])).toBe(true);
  });
  it('is false for different lengths or different members', () => {
    expect(keyPositionSetsEqual([3, 7], [3, 7, 9])).toBe(false);
    expect(keyPositionSetsEqual([3, 7], [3, 9])).toBe(false);
  });
});

describe('comboLayerScopesOverlap', () => {
  it('treats missing/empty layers and the -1 sentinel as "all layers"', () => {
    expect(comboLayerScopesOverlap({}, { layers: [2] })).toBe(true);
    expect(comboLayerScopesOverlap({ layers: [] }, { layers: [2] })).toBe(true);
    expect(comboLayerScopesOverlap({ layers: [-1] }, { layers: [2] })).toBe(true);
  });
  it('overlaps when they share an explicit layer', () => {
    expect(comboLayerScopesOverlap({ layers: [0, 1] }, { layers: [1, 2] })).toBe(true);
  });
  it('does not overlap for disjoint explicit layers', () => {
    expect(comboLayerScopesOverlap({ layers: [0] }, { layers: [1] })).toBe(false);
  });
});

describe('findDuplicateCombos', () => {
  it('flags two combos with the same keys on overlapping layers', () => {
    const combos = [
      { keyPositions: [3, 7], layers: [-1] },
      { keyPositions: [7, 3], layers: [-1] },
    ];
    const conflicts = findDuplicateCombos(combos);
    expect(conflicts).toEqual(expect.arrayContaining([
      { idx: 0, conflictsWithIdx: 1 },
      { idx: 1, conflictsWithIdx: 0 },
    ]));
  });
  it('does not flag the same keys when their layer scopes never overlap', () => {
    const combos = [
      { keyPositions: [3, 7], layers: [0] },
      { keyPositions: [3, 7], layers: [1] },
    ];
    expect(findDuplicateCombos(combos)).toEqual([]);
  });
  it('never flags a combo that has no key positions yet (still being built)', () => {
    const combos = [{ keyPositions: [], layers: [-1] }, { keyPositions: [], layers: [-1] }];
    expect(findDuplicateCombos(combos)).toEqual([]);
  });
  it('supports the legacy key_positions (snake_case) field name', () => {
    const combos = [
      { key_positions: [3, 7], layers: [-1] },
      { key_positions: [3, 7], layers: [-1] },
    ];
    expect(findDuplicateCombos(combos).length).toBe(2);
  });
});
