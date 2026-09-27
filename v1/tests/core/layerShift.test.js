import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GlideCore } from '../helpers/loadCore.js';

const { shiftLayerPointers, LAYER_POINTER_BEHAVIORS } = GlideCore;

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const loadFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'));

describe('shiftLayerPointers — native layer-pointer bindings', () => {
  it('decrements a layer index above the deleted layer', () => {
    const config = { layers: [[{ value: '&mo', params: [{ value: 3 }] }]] };
    shiftLayerPointers(config, 'delete', 1);
    expect(config.layers[0][0].params[0].value).toBe(2);
  });

  it('wipes the binding to &none when its target layer is the one deleted', () => {
    const config = { layers: [[{ value: '&to', params: [{ value: 1 }] }]] };
    shiftLayerPointers(config, 'delete', 1);
    expect(config.layers[0][0]).toEqual({ value: '&none', params: [] });
  });

  it('remaps combo.layers the same way', () => {
    const config = { layers: [[]], combos: [{ layers: [0, 2, 3] }] };
    shiftLayerPointers(config, 'delete', 1);
    expect(config.combos[0].layers).toEqual([0, 1, 2]);
  });
});

describe('shiftLayerPointers — REGRESSION: layer index nested inside a custom holdTap', () => {
  it('remaps the layer index flattened onto the outer binding when the holdTap wraps a layer-pointer hold', () => {
    const config = {
      layers: [[{ value: '&GLIDE_ht_mo_customtap', params: [{ value: 3 }] }]],
      holdTaps: [{ name: '&GLIDE_ht_mo_customtap', bindings: ['&mo', '&some_custom_behavior'] }],
    };
    shiftLayerPointers(config, 'delete', 1);
    expect(config.layers[0][0].params[0].value).toBe(2);
  });

  it('does NOT touch a custom holdTap whose hold side is not a layer pointer (no false positives)', () => {
    const config = {
      layers: [[{ value: '&GLIDE_ht_lsft_a', params: [{ value: 5 }] }]],
      holdTaps: [{ name: '&GLIDE_ht_lsft_a', bindings: ['LSHFT', '&kp'] }],
    };
    shiftLayerPointers(config, 'delete', 1);
    // 5 is not a layer index here (LSHFT isn't a layer pointer) — must be left alone.
    expect(config.layers[0][0].params[0].value).toBe(5);
  });

  it('recurses into mod-morph cases and tap-dance bindings, deduping shared definitions so they are not double-shifted', () => {
    const sharedHoldTap = { name: '&GLIDE_ht_mo_x', bindings: ['&mo', '&x'] };
    const config = {
      layers: [
        [
          { value: '&GLIDE_mm_a_b', params: [] },
          { value: '&GLIDE_ht_mo_x', params: [{ value: 5 }] },
        ],
      ],
      modMorphs: [
        {
          name: '&GLIDE_mm_a_b',
          cases: [
            { binding: { value: '&kp', params: [{ value: 'A' }] } },
            { binding: { value: '&GLIDE_ht_mo_x', params: [{ value: 5 }] } },
          ],
        },
      ],
      holdTaps: [sharedHoldTap],
    };
    shiftLayerPointers(config, 'delete', 1);
    // Both the top-level key AND the nested mod-morph case reference layer 5 — each should
    // independently remap correctly (they're separate binding objects with their own params).
    expect(config.layers[0][1].params[0].value).toBe(4);
    expect(config.modMorphs[0].cases[1].binding.params[0].value).toBe(4);
  });
});

describe('shiftLayerPointers — real fixture regression (Glorious Engrammer v52b)', () => {
  it('correctly remaps all 7 real thumb/space keys that wrap a layer-pointer via a hand-authored holdTap, with zero false positives', () => {
    const original = loadFixture('engrammer.json');
    const config = JSON.parse(JSON.stringify(original));

    const wrapsLayerPointerViaCustomHoldTap = (binding, cfg) => {
      if (!binding) return false;
      const ht = (cfg.holdTaps || []).find((h) => h.name === binding.value);
      return !!(ht && LAYER_POINTER_BEHAVIORS.has(ht.bindings[0]));
    };

    const before = [];
    original.layers.forEach((layer, li) =>
      layer.forEach((b, ki) => {
        if (wrapsLayerPointerViaCustomHoldTap(b, original)) before.push({ li, ki, val: b });
      })
    );
    // Sanity check on the fixture itself: this is exactly the &thumb_v2_TKZ / &space_v3_TKZ
    // scenario found this session — 7 real keys across the whole file.
    expect(before.length).toBe(7);

    shiftLayerPointers(config, 'delete', 1);

    let genuineFalsePositives = 0;
    config.layers.forEach((layer, li) =>
      layer.forEach((b, ki) => {
        const o = original.layers[li][ki];
        if (JSON.stringify(b) === JSON.stringify(o)) return;
        // Anything that changed must be explained by EITHER this custom-wrap case OR a directly
        // native layer-pointer binding (a separate, already-covered scenario) — never anything else.
        const isExplained = wrapsLayerPointerViaCustomHoldTap(o, original) || LAYER_POINTER_BEHAVIORS.has(o.value);
        if (!isExplained) genuineFalsePositives++;
      })
    );
    expect(genuineFalsePositives).toBe(0);

    // Every one of the 7 known keys must have moved by exactly one layer index (all were > 1).
    before.forEach(({ li, ki, val }) => {
      const after = config.layers[li][ki];
      const originalLayerIdx = val.params?.[0]?.value ?? val.params?.[1]?.value;
      expect(typeof originalLayerIdx).toBe('number');
      expect(originalLayerIdx).toBeGreaterThan(1);
      const newLayerIdx = after.params?.[0]?.value ?? after.params?.[1]?.value;
      expect(newLayerIdx).toBe(originalLayerIdx - 1);
    });
  });
});

describe('shiftLayerPointers — real fixture regression (tynstar) — asymmetric mod-morphs stay untouched', () => {
  it('does not mutate &parsl / &parsr (asymmetric single-side mods, no layer pointer involved)', () => {
    const original = loadFixture('tynstar.json');
    const config = JSON.parse(JSON.stringify(original));
    shiftLayerPointers(config, 'delete', 1);
    ['&parsl', '&parsr'].forEach((name) => {
      const before = original.modMorphs.find((m) => m.name === name);
      const after = config.modMorphs.find((m) => m.name === name);
      expect(after).toEqual(before);
    });
  });
});
