// tests/core/tapDance.test.js — core/zmk/tapDance.js. Neither real fixture has a user-authored
// tap-dance (see the module's own header comment), so this is grounded against the binding-object
// `bindings` shape core/slots.js's buildBindingAndConfig already synthesizes for GLIDE's own
// auto-generated tap-dances, plus synthetic cases for the CRUD/reference-safety layer itself.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
new Function(readFileSync(path.join(repoRoot, 'core/zmk/naming.js'), 'utf8')).call(globalThis);
new Function(readFileSync(path.join(repoRoot, 'core/zmk/tapDance.js'), 'utf8')).call(globalThis);
const {
    normalizeTapDanceFields, tapDanceNames, findTapDanceReferences, uniqueTapDanceName,
    createTapDance, updateTapDance, renameTapDance, deleteTapDance, cloneTapDance,
} = globalThis.GlideCore;

describe('normalizeTapDanceFields', () => {
    it('preserves a real-shaped record (binding objects, not name strings)', () => {
        const td = { name: '&td1', description: 'test', tappingTermMs: 200, bindings: [{ value: '&kp', params: [{ value: 'A' }] }, { value: '&kp', params: [{ value: 'B' }] }] };
        const parsed = normalizeTapDanceFields(td);
        expect(parsed).toEqual({ description: 'test', tappingTermMs: 200, bindings: td.bindings });
    });

    it('falls back to two &kp bindings for a missing/malformed record', () => {
        const parsed = normalizeTapDanceFields(undefined);
        expect(parsed.bindings).toHaveLength(2);
        expect(parsed.tappingTermMs).toBeUndefined();
    });
});

describe('findTapDanceReferences', () => {
    it('finds a tap-dance referenced from a layer, a hold-tap, a macro, a mod-morph, and a sticky key', () => {
        const config = {
            layers: [[{ value: '&td1' }]],
            combos: [],
            holdTaps: [{ name: '&ht1', bindings: ['&td1', '&kp'] }],
            macros: [{ name: '&m1', bindings: [{ value: '&td1' }] }],
            modMorphs: [{ name: '&mm1', cases: [{ binding: { value: '&td1' } }, { binding: { value: '&kp' } }] }],
            stickyKeys: [{ name: '&sk1', bindings: ['&td1'] }],
            tapDances: [{ name: '&td1', bindings: [{ value: '&kp' }, { value: '&kp' }] }],
        };
        const hits = findTapDanceReferences(config, '&td1');
        expect(hits).toEqual(['layer 0', 'hold-tap &ht1', 'macro &m1', 'mod-morph &mm1', 'sticky key &sk1']);
    });

    it('finds a tap-dance invoked from inside another tap-dance\'s own bindings', () => {
        const config = { tapDances: [{ name: '&td1', bindings: [{ value: '&kp' }, { value: '&kp' }] }, { name: '&td2', bindings: [{ value: '&td1' }, { value: '&kp' }] }] };
        expect(findTapDanceReferences(config, '&td1')).toEqual(['tap-dance &td2']);
    });

    it('returns empty for a tap-dance nothing references', () => {
        const config = { tapDances: [{ name: '&td_lonely', bindings: [{ value: '&kp' }, { value: '&kp' }] }] };
        expect(findTapDanceReferences(config, '&td_lonely')).toEqual([]);
    });
});

describe('uniqueTapDanceName', () => {
    it('sanitizes and dedupes against every existing name in every behavior namespace', () => {
        const config = { tapDances: [{ name: '&td1' }], macros: [{ name: '&td2' }] };
        expect(uniqueTapDanceName(config, 'My Dance!')).toBe('&My_Dance');
        expect(uniqueTapDanceName(config, 'td1')).toBe('&td1_2');
        expect(uniqueTapDanceName(config, 'td2')).toBe('&td2_2');
    });
});

describe('create/update/rename/delete/clone round-trip', () => {
    it('creates a new tap-dance with two default &kp bindings', () => {
        const { config, name } = createTapDance({ tapDances: [] }, 'my_td');
        expect(name).toBe('&my_td');
        const created = config.tapDances.find((t) => t.name === name);
        expect(created.bindings).toHaveLength(2);
        expect(created.tappingTermMs).toBe(200);
    });

    it('never mutates the passed-in config', () => {
        const original = { tapDances: [] };
        createTapDance(original, 'x');
        expect(original.tapDances).toEqual([]);
    });

    it('updates bindings and tappingTermMs, and can clear tappingTermMs back to undefined', () => {
        const { config, name } = createTapDance({ tapDances: [] }, 'my_td');
        const withTerm = updateTapDance(config, name, { description: '', tappingTermMs: 250, bindings: [{ value: '&kp', params: [{ value: 'X' }] }, { value: '&kp', params: [{ value: 'Y' }] }] });
        expect(withTerm.tapDances.find((t) => t.name === name).tappingTermMs).toBe(250);
        const cleared = updateTapDance(withTerm, name, { description: '', bindings: withTerm.tapDances[0].bindings });
        expect(cleared.tapDances.find((t) => t.name === name).tappingTermMs).toBeUndefined();
    });

    it('renames a tap-dance and fixes up a reference from another tap-dance\'s bindings', () => {
        const config = { tapDances: [{ name: '&td1', bindings: [{ value: '&kp' }, { value: '&kp' }] }, { name: '&td2', bindings: [{ value: '&td1' }, { value: '&kp' }] }] };
        const renamed = renameTapDance(config, '&td1', '&td1_v2');
        expect(renamed.tapDances.find((t) => t.name === '&td2').bindings[0].value).toBe('&td1_v2');
        expect(renamed.tapDances.find((t) => t.name === '&td1_v2')).toBeTruthy();
    });

    it('deletes a tap-dance', () => {
        const { config, name } = createTapDance({ tapDances: [] }, 'to_delete');
        expect(deleteTapDance(config, name).tapDances.find((t) => t.name === name)).toBeUndefined();
    });

    it('clones a tap-dance with a deduped name and identical bindings', () => {
        const { config } = createTapDance({ tapDances: [] }, 'orig');
        const { config: cloned, name } = cloneTapDance(config, '&orig');
        expect(name).toBe('&orig_copy');
        expect(cloned.tapDances.find((t) => t.name === name).bindings).toEqual(config.tapDances[0].bindings);
    });
});
