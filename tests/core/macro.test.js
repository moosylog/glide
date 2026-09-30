// tests/core/macro.test.js — core/zmk/macro.js against two real MoErgo exports with real macros
// already in them: tests/fixtures/tynstar.json (62 macros, mostly &macro_tap unicode-input
// sequences) and tests/fixtures/engrammer.json (29 macros using &macro_press/&macro_release/
// &macro_param_1to1/&macro_param_2to1, including one macro invoking another custom behavior as a
// step). Parsing must read exactly what the real files say, and round-tripping every one of the
// 91 real macros across both files must reproduce it losslessly — this is firmware config, not
// cosmetic UI state.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE_SCRIPT_PATHS = ['core/zmk/macro.js'];
for (const p of CORE_SCRIPT_PATHS) {
  new Function(readFileSync(path.join(repoRoot, p), 'utf8')).call(globalThis);
}
const {
  parseMacroStep, buildMacroStep, parseMacro, buildMacro, inferMacroParamCount,
  macroNames, findMacroReferences, uniqueMacroName,
  createMacro, updateMacro, renameMacro, deleteMacro, cloneMacro,
} = globalThis.GlideCore;

const tynstar = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'tynstar.json'), 'utf8'));
const engrammer = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'engrammer.json'), 'utf8'));

describe('parseMacroStep', () => {
  it('recognizes the three mode-setting controls', () => {
    expect(parseMacroStep({ value: '&macro_tap' })).toEqual({ kind: 'mode', mode: 'tap' });
    expect(parseMacroStep({ value: '&macro_press' })).toEqual({ kind: 'mode', mode: 'press' });
    expect(parseMacroStep({ value: '&macro_release' })).toEqual({ kind: 'mode', mode: 'release' });
  });

  it('recognizes pause-for-release, wait-time and tap-time', () => {
    expect(parseMacroStep({ value: '&macro_pause_for_release' })).toEqual({ kind: 'pauseForRelease' });
    expect(parseMacroStep({ value: '&macro_wait_time', params: [{ value: 50 }] })).toEqual({ kind: 'waitTime', ms: 50 });
    expect(parseMacroStep({ value: '&macro_tap_time', params: [{ value: 30 }] })).toEqual({ kind: 'tapTime', ms: 30 });
  });

  it('recognizes all four parameter-forwarding controls', () => {
    expect(parseMacroStep({ value: '&macro_param_1to1' })).toEqual({ kind: 'paramForward', from: 1, to: 1 });
    expect(parseMacroStep({ value: '&macro_param_1to2' })).toEqual({ kind: 'paramForward', from: 1, to: 2 });
    expect(parseMacroStep({ value: '&macro_param_2to1' })).toEqual({ kind: 'paramForward', from: 2, to: 1 });
    expect(parseMacroStep({ value: '&macro_param_2to2' })).toEqual({ kind: 'paramForward', from: 2, to: 2 });
  });

  it('treats anything else as an opaque behavior step, kept verbatim', () => {
    const binding = { value: '&kp', params: [{ value: 'LC', params: [{ value: 'A' }] }] };
    const step = parseMacroStep(binding);
    expect(step).toEqual({ kind: 'behavior', binding });
    expect(step.binding).not.toBe(binding); // cloned, not aliased
  });

  it('round-trips every step kind back to its exact original binding', () => {
    const bindings = [
      { value: '&macro_tap' }, { value: '&macro_press' }, { value: '&macro_release' },
      { value: '&macro_pause_for_release' },
      { value: '&macro_wait_time', params: [{ value: 40 }] }, { value: '&macro_tap_time', params: [{ value: 5 }] },
      { value: '&macro_param_1to1' }, { value: '&macro_param_2to1' },
      { value: '&kp', params: [{ value: 'A' }] }, { value: '&mo', params: [{ value: 5 }] },
      { value: '&some_other_macro' },
    ];
    for (const b of bindings) expect(buildMacroStep(parseMacroStep(b))).toEqual(b);
  });
});

describe('parseMacro / buildMacro round-trip against both real fixtures', () => {
  it('reproduces every one of tynstar.json\'s 62 real macros exactly', () => {
    for (const macro of tynstar.macros) expect(buildMacro(parseMacro(macro))).toEqual(macro);
  });

  it('reproduces every one of engrammer.json\'s 29 real macros exactly', () => {
    for (const macro of engrammer.macros) expect(buildMacro(parseMacro(macro))).toEqual(macro);
  });

  it('never invents a tapMs/waitMs the real macro did not have (device-default vs explicit 0 stay distinct)', () => {
    const noTiming = tynstar.macros.find((m) => m.name === '&msteams_ptt');
    expect(noTiming.tapMs).toBeUndefined(); expect(noTiming.waitMs).toBeUndefined();
    const parsed = parseMacro(noTiming);
    expect(parsed.tapMs).toBeUndefined(); expect(parsed.waitMs).toBeUndefined();
    expect(buildMacro(parsed)).not.toHaveProperty('tapMs');
    expect(buildMacro(parsed)).not.toHaveProperty('waitMs');

    const explicitZero = tynstar.macros.find((m) => m.name === '&xauml1');
    expect(explicitZero.waitMs).toBe(0); // present and exactly 0, not "absent"
    expect(buildMacro(parseMacro(explicitZero))).toHaveProperty('waitMs', 0);
  });

  it('parses the real press/param-forward/pause/release macro into exactly the expected step sequence', () => {
    const m = engrammer.macros.find((m) => m.name === '&HRM_left_index_hold_v1B_TKZ');
    const parsed = parseMacro(m);
    expect(parsed.steps.map((s) => s.kind)).toEqual([
      'mode', 'paramForward', 'behavior', 'behavior', 'pauseForRelease', 'mode', 'paramForward', 'behavior', 'behavior',
    ]);
    expect(parsed.steps[0].mode).toBe('press');
    expect(parsed.steps[5].mode).toBe('release');
    expect(parsed.steps[1]).toEqual({ kind: 'paramForward', from: 1, to: 1 });
  });

  it('keeps a macro invoking another custom behavior as a step fully opaque (not just &kp/&mo)', () => {
    const m = engrammer.macros.find((m) => m.name === '&mod_tab_chord_v2_TKZ');
    const parsed = parseMacro(m);
    const otherBehaviorStep = parsed.steps.find((s) => s.kind === 'behavior' && s.binding.value === '&mod_tab_v1_TKZ');
    expect(otherBehaviorStep).toBeTruthy();
    expect(buildMacro(parsed)).toEqual(m);
  });
});

describe('inferMacroParamCount', () => {
  it('is 0 for an ordinary macro with no param-forwarding at all', () => {
    expect(inferMacroParamCount(parseMacro(tynstar.macros.find((m) => m.name === '&xauml1')))).toBe(0);
  });
  it('is 1 for a macro that only forwards its first parameter', () => {
    expect(inferMacroParamCount(parseMacro(engrammer.macros.find((m) => m.name === '&HRM_left_index_hold_v1B_TKZ')))).toBe(1);
  });
  it('is 2 for a macro that forwards a second parameter', () => {
    const twoParam = { name: '&x', bindings: [{ value: '&macro_param_2to1' }, { value: '&kp' }] };
    expect(inferMacroParamCount(parseMacro(twoParam))).toBe(2);
  });
});

describe('findMacroReferences', () => {
  it('finds a macro used as a hold-tap\'s hold behavior (a plain string in holdTaps[].bindings, not a binding object)', () => {
    const refs = findMacroReferences(engrammer, '&HRM_left_index_hold_v1B_TKZ');
    expect(refs.some((r) => r.startsWith('hold-tap'))).toBe(true);
  });

  it('finds a macro invoked as a step inside a different macro', () => {
    const refs = findMacroReferences(engrammer, '&mod_tab_v1_TKZ');
    expect(refs.some((r) => r === 'macro &mod_tab_chord_v2_TKZ')).toBe(true);
  });

  it('returns empty for a macro nothing else references', () => {
    // &xstar is one of tynstar's plain unicode-sequence macros — not invoked from anywhere else
    // in that file (only ever assigned directly to a key, which findMacroReferences intentionally
    // doesn't count as a "reference" the same way, since deleting the macro already breaks that
    // key's own binding directly and visibly, unlike an indirect hold-tap/macro reference).
    expect(findMacroReferences(tynstar, '&xstar')).toEqual([]);
  });
});

describe('uniqueMacroName', () => {
  it('normalizes to a leading & and safe characters', () => {
    expect(uniqueMacroName({ macros: [] }, 'My Macro!')).toBe('&My_Macro');
  });
  it('dedupes against existing macro, hold-tap, tap-dance and mod-morph names', () => {
    const config = { macros: [{ name: '&foo' }], holdTaps: [{ name: '&foo_2' }] };
    expect(uniqueMacroName(config, 'foo')).toBe('&foo_3');
  });
});

describe('createMacro / updateMacro / deleteMacro / cloneMacro / renameMacro', () => {
  it('createMacro adds a new, minimal, uniquely-named macro without mutating the original config', () => {
    const config = { macros: [{ name: '&foo', bindings: [] }] };
    const { config: next, name } = createMacro(config, 'foo');
    expect(name).toBe('&foo_2');
    expect(next.macros).toHaveLength(2);
    expect(config.macros).toHaveLength(1); // original untouched
  });

  it('updateMacro replaces exactly the targeted macro, leaving the rest of the array untouched', () => {
    const config = { macros: [{ name: '&a', bindings: [] }, { name: '&b', bindings: [] }] };
    const next = updateMacro(config, '&b', { name: '&b', description: 'now has a desc', steps: [{ kind: 'mode', mode: 'tap' }] });
    expect(next.macros[0]).toEqual(config.macros[0]);
    expect(next.macros[1]).toEqual({ name: '&b', description: 'now has a desc', bindings: [{ value: '&macro_tap' }] });
  });

  it('deleteMacro removes only the named macro', () => {
    const config = { macros: [{ name: '&a' }, { name: '&b' }] };
    expect(deleteMacro(config, '&a').macros).toEqual([{ name: '&b' }]);
  });

  it('cloneMacro copies a macro under a new unique name, leaving the original untouched', () => {
    const config = { macros: [{ name: '&a', bindings: [{ value: '&kp', params: [{ value: 'A' }] }] }] };
    const { config: next, name } = cloneMacro(config, '&a');
    expect(name).toBe('&a_copy');
    expect(next.macros[1]).toEqual({ name: '&a_copy', bindings: [{ value: '&kp', params: [{ value: 'A' }] }] });
  });

  it('renameMacro updates the macro\'s own name AND every real place that referenced it', () => {
    const renamed = renameMacro(engrammer, '&HRM_left_index_hold_v1B_TKZ', '&renamed_hrm');
    expect(renamed.macros.find((m) => m.name === '&renamed_hrm')).toBeTruthy();
    expect(renamed.macros.find((m) => m.name === '&HRM_left_index_hold_v1B_TKZ')).toBeUndefined();
    expect(findMacroReferences(renamed, '&HRM_left_index_hold_v1B_TKZ')).toEqual([]);
    expect(findMacroReferences(renamed, '&renamed_hrm').some((r) => r.startsWith('hold-tap'))).toBe(true);
    // never mutates the original
    expect(engrammer.macros.find((m) => m.name === '&HRM_left_index_hold_v1B_TKZ')).toBeTruthy();
  });

  it('renameMacro also fixes up a macro-invoking-another-macro reference', () => {
    const renamed = renameMacro(engrammer, '&mod_tab_v1_TKZ', '&renamed_modtab');
    const holder = renamed.macros.find((m) => m.name === '&mod_tab_chord_v2_TKZ');
    expect(holder.bindings.some((b) => b.value === '&renamed_modtab')).toBe(true);
    expect(holder.bindings.some((b) => b.value === '&mod_tab_v1_TKZ')).toBe(false);
  });
});
