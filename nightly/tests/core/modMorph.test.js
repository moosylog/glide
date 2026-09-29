// tests/core/modMorph.test.js — core/zmk/modMorph.js against both real MoErgo exports' real,
// user-authored mod-morphs (tynstar.json: 21, engrammer.json: 6) — none of them GLIDE's own
// GLIDE_MM_-generated ones. Since this module doesn't reshape the JSON (see its header), the main
// thing to prove is that the CRUD/reference-safety helpers operate correctly against the real
// shape, including the real single-sided-mods and non-empty-keepMods variety tynstar's
// &parsl/&parsr actually use.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
new Function(readFileSync(path.join(repoRoot, 'core/zmk/modMorph.js'), 'utf8')).call(globalThis);
const {
    modMorphNames, findModMorphReferences, uniqueModMorphName, normalizeModMorphCases,
    createModMorph, updateModMorph, renameModMorph, deleteModMorph, cloneModMorph,
} = globalThis.GlideCore;

const tynstar = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'tynstar.json'), 'utf8'));
const engrammer = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'engrammer.json'), 'utf8'));

describe('modMorphNames', () => {
    it('lists every real mod-morph in both real fixtures', () => {
        expect(modMorphNames(tynstar)).toHaveLength(21);
        expect(modMorphNames(engrammer)).toHaveLength(6);
        expect(modMorphNames(tynstar)).toContain('&parsl');
    });
});

describe('normalizeModMorphCases', () => {
    it('forces case 0\'s mods/keepMods empty regardless of input, matching every real example', () => {
        const normalized = normalizeModMorphCases([{ binding: { value: '&kp', params: [{ value: 'A' }] }, mods: ['MOD_LSFT'], keepMods: ['MOD_LSFT'] }, { binding: { value: '&kp', params: [{ value: 'B' }] }, mods: ['MOD_RSFT'], keepMods: [] }]);
        expect(normalized[0].mods).toEqual([]);
        expect(normalized[0].keepMods).toEqual([]);
        expect(normalized[1].mods).toEqual(['MOD_RSFT']);
    });

    it('preserves a real single-sided mods/non-empty keepMods case exactly (tynstar\'s &parsl)', () => {
        const parsl = tynstar.modMorphs.find((m) => m.name === '&parsl');
        const normalized = normalizeModMorphCases(parsl.cases);
        expect(normalized).toEqual(parsl.cases);
    });

    it('fills in missing cases with an empty &none binding rather than crashing', () => {
        expect(normalizeModMorphCases(undefined)).toEqual([
            { binding: { value: '&none' }, mods: [], keepMods: [] },
            { binding: { value: '&none' }, mods: [], keepMods: [] },
        ]);
    });
});

describe('findModMorphReferences', () => {
    it('finds a mod-morph used as a hold-tap\'s bound behavior (a plain string, not a binding object)', () => {
        const config = { holdTaps: [{ name: '&ht', bindings: ['&mm_shift', '&kp'] }] };
        expect(findModMorphReferences(config, '&mm_shift')).toEqual(['hold-tap &ht']);
    });

    it('finds a mod-morph invoked as another mod-morph\'s own case binding', () => {
        const config = { modMorphs: [{ name: '&outer', cases: [{ binding: { value: '&mm_inner' } }, { binding: { value: '&kp' } }] }] };
        expect(findModMorphReferences(config, '&mm_inner')).toEqual(['mod-morph &outer']);
    });

    it('finds a real mod-morph directly assigned to a key on a layer (every real mod-morph in tynstar is actually key-bound)', () => {
        expect(findModMorphReferences(tynstar, '&f11f21')).toEqual(['layer 4']);
    });

    it('returns empty for a mod-morph nothing references', () => {
        expect(findModMorphReferences(tynstar, '&mm_nonexistent')).toEqual([]);
    });
});

describe('uniqueModMorphName', () => {
    it('normalizes to a leading & and safe characters', () => {
        expect(uniqueModMorphName({ modMorphs: [] }, 'My Mod Morph!')).toBe('&My_Mod_Morph');
    });
    it('dedupes against existing mod-morph, macro, hold-tap, tap-dance and sticky-key names', () => {
        const config = { modMorphs: [{ name: '&foo' }], macros: [{ name: '&foo_2' }] };
        expect(uniqueModMorphName(config, 'foo')).toBe('&foo_3');
    });
});

describe('createModMorph / updateModMorph / deleteModMorph / cloneModMorph / renameModMorph', () => {
    it('createModMorph adds a new, minimal, uniquely-named mod-morph without mutating the original config', () => {
        const config = { modMorphs: [{ name: '&foo', cases: [] }] };
        const { config: next, name } = createModMorph(config, 'foo');
        expect(name).toBe('&foo_2');
        expect(next.modMorphs).toHaveLength(2);
        expect(next.modMorphs[1].cases[1].mods).toEqual(['MOD_LSFT', 'MOD_RSFT']);
        expect(config.modMorphs).toHaveLength(1); // original untouched
    });

    it('updateModMorph replaces exactly the targeted mod-morph, leaving the rest of the array untouched, and normalizes case 0', () => {
        const config = { modMorphs: [{ name: '&a', cases: [] }, { name: '&b', cases: [] }] };
        const next = updateModMorph(config, '&b', {
            description: 'now has a desc',
            cases: [{ binding: { value: '&kp', params: [{ value: 'A' }] }, mods: ['MOD_LSFT'] }, { binding: { value: '&kp', params: [{ value: 'B' }] }, mods: ['MOD_RSFT'], keepMods: ['MOD_RSFT'] }],
        });
        expect(next.modMorphs[0]).toEqual(config.modMorphs[0]);
        expect(next.modMorphs[1]).toEqual({
            name: '&b', description: 'now has a desc',
            cases: [{ binding: { value: '&kp', params: [{ value: 'A' }] }, mods: [], keepMods: [] }, { binding: { value: '&kp', params: [{ value: 'B' }] }, mods: ['MOD_RSFT'], keepMods: ['MOD_RSFT'] }],
        });
    });

    it('deleteModMorph removes only the named mod-morph', () => {
        const config = { modMorphs: [{ name: '&a' }, { name: '&b' }] };
        expect(deleteModMorph(config, '&a').modMorphs).toEqual([{ name: '&b' }]);
    });

    it('cloneModMorph copies a real mod-morph under a new unique name, leaving the original untouched', () => {
        const { config: next, name } = cloneModMorph(tynstar, '&f11f21');
        expect(name).toBe('&f11f21_copy');
        const clone = next.modMorphs.find((m) => m.name === name);
        expect(clone.cases).toEqual(tynstar.modMorphs.find((m) => m.name === '&f11f21').cases);
        expect(tynstar.modMorphs.find((m) => m.name === '&f11f21')).toBeTruthy(); // original untouched
    });

    it('renameModMorph updates the mod-morph\'s own name AND every real place that referenced it', () => {
        const config = {
            modMorphs: [{ name: '&mm_shift', cases: [{ binding: { value: '&kp' } }, { binding: { value: '&kp' } }] }],
            holdTaps: [{ name: '&ht', bindings: ['&mm_shift', '&kp'] }],
        };
        const renamed = renameModMorph(config, '&mm_shift', '&renamed_mm');
        expect(renamed.modMorphs.find((m) => m.name === '&renamed_mm')).toBeTruthy();
        expect(renamed.modMorphs.find((m) => m.name === '&mm_shift')).toBeUndefined();
        expect(findModMorphReferences(renamed, '&mm_shift')).toEqual([]);
        expect(findModMorphReferences(renamed, '&renamed_mm')).toEqual(['hold-tap &ht']);
        expect(config.modMorphs.find((m) => m.name === '&mm_shift')).toBeTruthy(); // never mutates the original
    });

    it('renameModMorph also fixes up a mod-morph-invoking-another-mod-morph case binding', () => {
        const config = { modMorphs: [
            { name: '&inner', cases: [{ binding: { value: '&kp' } }, { binding: { value: '&kp' } }] },
            { name: '&outer', cases: [{ binding: { value: '&inner' } }, { binding: { value: '&kp' } }] },
        ] };
        const renamed = renameModMorph(config, '&inner', '&renamed_inner');
        const outer = renamed.modMorphs.find((m) => m.name === '&outer');
        expect(outer.cases[0].binding.value).toBe('&renamed_inner');
    });
});
