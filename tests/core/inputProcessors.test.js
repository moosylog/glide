// tests/core/inputProcessors.test.js — core/zmk/inputProcessors.js against a real MoErgo Go60
// export (tests/fixtures/go60-touchpads.json) with both Cirque trackpads actually configured:
// a plain sensitivity scaler on the right pad, and a scaled+Y-inverted+scroll-mode+right-click
// remap on the left pad, each with one per-layer override node. Parsing must read exactly what
// the real file says, and round-tripping (parse -> build, or a full get/set through a config
// object) must reproduce it losslessly — this is firmware config, not cosmetic UI state, so a
// silent corruption here would be a real, hard-to-notice bug.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE_SCRIPT_PATHS = ['core/zmk/inputProcessors.js'];
for (const p of CORE_SCRIPT_PATHS) {
  new Function(readFileSync(path.join(repoRoot, p), 'utf8')).call(globalThis);
}
const {
  isTouchpadIndex, parseChain, buildChain, parseListener, buildListener,
  getTouchpadConfig, setTouchpadConfig, TOUCHPAD_LISTENER_CODE_BY_INDEX,
  CLICK_MAPPER_CODE_BY_TARGET, UNVERIFIED_CLICK_TARGETS,
} = globalThis.GlideCore;

const fixture = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'go60-touchpads.json'), 'utf8'));
// A second real MoErgo Go60 export whose RH trackpad's base chain uses
// &zip_click_to_button_4_click_mapper — confirms the click-mapper naming pattern extends beyond
// the single right-click instance in the first fixture.
const clickmapFixture = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'go60-touchpads-clickmap.json'), 'utf8'));

describe('isTouchpadIndex / TOUCHPAD_LISTENER_CODE_BY_INDEX', () => {
  it('maps exactly key positions 60 (left) and 61 (right) on Go60, nothing else', () => {
    expect(isTouchpadIndex(60)).toBe(true);
    expect(isTouchpadIndex(61)).toBe(true);
    expect(isTouchpadIndex(0)).toBe(false);
    expect(isTouchpadIndex(59)).toBe(false);
    expect(TOUCHPAD_LISTENER_CODE_BY_INDEX[60]).toBe('&cirque_lh_listener');
    expect(TOUCHPAD_LISTENER_CODE_BY_INDEX[61]).toBe('&cirque_rh_listener');
  });
});

describe('parseChain', () => {
  it('reads a plain sensitivity-only chain (the real RH base chain)', () => {
    const rh = fixture.inputListeners.find((l) => l.code === '&cirque_rh_listener');
    const model = parseChain(rh.inputProcessors);
    expect(model.multiplier).toBe(3);
    expect(model.divisor).toBe(1);
    expect(model.disabled).toBe(false);
    expect(model.mode).toBe('movement');
    expect(model.flipX).toBe(false);
    expect(model.flipY).toBe(false);
    expect(model.swapped).toBe(false);
    expect(model.clickTarget).toBe('left');
    expect(model.tempLayer).toBeNull();
    expect(model.extra).toEqual([]);
  });

  it('reads scale + Y-invert + scroll-mode + right-click-remap (the real LH base chain)', () => {
    const lh = fixture.inputListeners.find((l) => l.code === '&cirque_lh_listener');
    const model = parseChain(lh.inputProcessors);
    expect(model.multiplier).toBe(11);
    expect(model.divisor).toBe(12);
    expect(model.flipY).toBe(true);
    expect(model.flipX).toBe(false);
    expect(model.swapped).toBe(false);
    expect(model.mode).toBe('scroll');
    expect(model.clickTarget).toBe('right');
  });

  it('treats a 0-multiplier scaler as "disabled" and round-trips it back to 0/1', () => {
    const model = parseChain([{ code: '&zip_xy_scaler', params: [0, 1] }]);
    expect(model.disabled).toBe(true);
    expect(buildChain(model)).toEqual([{ code: '&zip_xy_scaler', params: [0, 1] }]);
  });

  it('preserves an unrecognized processor verbatim in `extra` rather than dropping it', () => {
    const weird = { code: '&zip_x_scaler', params: [2, 1] };
    const model = parseChain([{ code: '&zip_xy_scaler', params: [1, 1] }, weird]);
    expect(model.extra).toEqual([weird]);
    expect(buildChain(model)).toEqual([{ code: '&zip_xy_scaler', params: [1, 1] }, weird]);
  });

  it('preserves an unrecognized transform flag alongside recognized ones', () => {
    const model = parseChain([{ code: '&zip_xy_transform', params: [['INPUT_TRANSFORM_Y_INVERT', 'SOME_FUTURE_FLAG']] }]);
    expect(model.flipY).toBe(true);
    expect(model.extraFlags).toEqual(['SOME_FUTURE_FLAG']);
  });
});

describe('click-mapper targets (&zip_click_to_<target>_mapper)', () => {
  it('reads &zip_click_to_button_4_click_mapper off a second real fixture\'s RH base chain', () => {
    const rh = clickmapFixture.inputListeners.find((l) => l.code === '&cirque_rh_listener');
    const model = parseChain(rh.inputProcessors);
    expect(model.clickTarget).toBe('button4');
    // and it sits alongside a plain scaler, order-preserving on round-trip:
    expect(buildChain(model)).toEqual(rh.inputProcessors);
  });

  it('right and button4 are confirmed against real exports; only middle/button5 are flagged unverified', () => {
    expect(UNVERIFIED_CLICK_TARGETS).toEqual(['middle', 'button5']);
    expect(UNVERIFIED_CLICK_TARGETS).not.toContain('right');
    expect(UNVERIFIED_CLICK_TARGETS).not.toContain('button4');
  });

  it('round-trips every click target, including the inferred middle/button5 codes, losslessly', () => {
    for (const target of Object.keys(CLICK_MAPPER_CODE_BY_TARGET)) {
      const model = parseChain([{ code: CLICK_MAPPER_CODE_BY_TARGET[target] }]);
      expect(model.clickTarget).toBe(target);
      expect(buildChain(model)).toEqual([{ code: '&zip_xy_scaler', params: [1, 1] }, { code: CLICK_MAPPER_CODE_BY_TARGET[target] }]);
    }
  });

  it('"left" (the default) never emits a click-mapper processor at all', () => {
    const model = parseChain([]);
    expect(model.clickTarget).toBe('left');
    expect(buildChain(model)).toEqual([{ code: '&zip_xy_scaler', params: [1, 1] }]);
  });
});

describe('parseChain / buildChain round-trip against the real fixture', () => {
  it('reproduces the exact RH base chain', () => {
    const rh = fixture.inputListeners.find((l) => l.code === '&cirque_rh_listener');
    expect(buildChain(parseChain(rh.inputProcessors))).toEqual(rh.inputProcessors);
  });

  it('reproduces the exact LH base chain (scaler, transform, scroll mapper, click mapper — in the original order)', () => {
    const lh = fixture.inputListeners.find((l) => l.code === '&cirque_lh_listener');
    expect(buildChain(parseChain(lh.inputProcessors))).toEqual(lh.inputProcessors);
  });

  it('reproduces both listeners\' per-layer override chains', () => {
    for (const listener of fixture.inputListeners) {
      for (const node of listener.nodes || []) {
        expect(buildChain(parseChain(node.inputProcessors))).toEqual(node.inputProcessors);
      }
    }
  });
});

describe('parseListener / buildListener', () => {
  it('reads the RH listener\'s one override node (layer 2, 9x sensitivity)', () => {
    const rh = fixture.inputListeners.find((l) => l.code === '&cirque_rh_listener');
    const parsed = parseListener(rh);
    expect(parsed.base.multiplier).toBe(3);
    expect(parsed.overrides).toHaveLength(1);
    expect(parsed.overrides[0].layers).toEqual([2]);
    expect(parsed.overrides[0].chain.multiplier).toBe(9);
  });

  it('round-trips a whole listener (base + override) back to the exact original object', () => {
    for (const listener of fixture.inputListeners) {
      const rebuilt = buildListener(listener.code, parseListener(listener));
      expect(rebuilt).toEqual(listener);
    }
  });

  it('gives a listener with no override nodes a listener object with no `nodes` key at all', () => {
    const rebuilt = buildListener('&cirque_lh_listener', { base: parseChain([{ code: '&zip_xy_scaler', params: [1, 1] }]), overrides: [] });
    expect(rebuilt).not.toHaveProperty('nodes');
  });
});

describe('getTouchpadConfig / setTouchpadConfig (the config-object-level API the UI binds to)', () => {
  it('reads both real touchpads straight off the fixture config by key index', () => {
    const left = getTouchpadConfig(fixture, 60);
    const right = getTouchpadConfig(fixture, 61);
    expect(left.code).toBe('&cirque_lh_listener');
    expect(left.parsed.base.mode).toBe('scroll');
    expect(right.code).toBe('&cirque_rh_listener');
    expect(right.parsed.base.multiplier).toBe(3);
  });

  it('returns null for a non-touchpad key index', () => {
    expect(getTouchpadConfig(fixture, 0)).toBeNull();
  });

  it('gives every key on a config with no inputListeners at all a sensible, non-crashing default', () => {
    const blank = { keyboard: 'go60', layers: [[]] };
    const result = getTouchpadConfig(blank, 60);
    expect(result.parsed.base.multiplier).toBe(1);
    expect(result.parsed.overrides).toEqual([]);
  });

  it('setTouchpadConfig round-trips a whole real config unchanged when nothing was edited', () => {
    const left = getTouchpadConfig(fixture, 60);
    const rewritten = setTouchpadConfig(fixture, 60, left.parsed);
    expect(rewritten.inputListeners).toEqual(fixture.inputListeners);
    // never mutates the original
    expect(rewritten).not.toBe(fixture);
  });

  it('setTouchpadConfig only touches the one listener it targets, leaving the other trackpad and the rest of the config untouched', () => {
    const left = getTouchpadConfig(fixture, 60);
    left.parsed.base.multiplier = 7;
    const rewritten = setTouchpadConfig(fixture, 60, left.parsed);
    const rhAfter = rewritten.inputListeners.find((l) => l.code === '&cirque_rh_listener');
    const rhBefore = fixture.inputListeners.find((l) => l.code === '&cirque_rh_listener');
    expect(rhAfter).toEqual(rhBefore);
    expect(rewritten.layers).toEqual(fixture.layers);
    const lhAfter = rewritten.inputListeners.find((l) => l.code === '&cirque_lh_listener');
    expect(lhAfter.inputProcessors[0]).toEqual({ code: '&zip_xy_scaler', params: [7, 12] });
  });

  it('setTouchpadConfig creates a brand-new listener entry for a config that had none', () => {
    const blank = { keyboard: 'go60', layers: [[]] };
    const parsed = getTouchpadConfig(blank, 61).parsed;
    parsed.base.multiplier = 4;
    const rewritten = setTouchpadConfig(blank, 61, parsed);
    expect(rewritten.inputListeners).toEqual([{ code: '&cirque_rh_listener', inputProcessors: [{ code: '&zip_xy_scaler', params: [4, 1] }] }]);
  });
});
