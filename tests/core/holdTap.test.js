// tests/core/holdTap.test.js — core/zmk/holdTap.js, grounded against the 36 real hold-tap
// definitions across both fixtures (tynstar.json has 1, engrammer.json has 35).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
new Function(readFileSync(path.join(repoRoot, 'core/zmk/naming.js'), 'utf8')).call(globalThis);
new Function(readFileSync(path.join(repoRoot, 'core/zmk/holdTap.js'), 'utf8')).call(globalThis);
const {
    normalizeHoldTapFields, holdTapNames, findHoldTapReferences, uniqueHoldTapName,
    createHoldTap, updateHoldTap, renameHoldTap, deleteHoldTap, cloneHoldTap,
} = globalThis.GlideCore;

const tynstar = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'tynstar.json'), 'utf8'));
const engrammer = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'engrammer.json'), 'utf8'));

describe('holdTapNames', () => {
    it('lists all real hold-taps in both fixtures', () => {
        expect(holdTapNames(tynstar)).toEqual(['&strong']);
        expect(holdTapNames(engrammer)).toHaveLength(35);
    });
});

describe('normalizeHoldTapFields', () => {
    it('preserves the real tynstar &strong record exactly, with missing fields left undefined', () => {
        const ht = tynstar.holdTaps.find((h) => h.name === '&strong');
        const parsed = normalizeHoldTapFields(ht);
        expect(parsed).toEqual({
            description: '', flavor: 'tap-preferred', tappingTermMs: 100, quickTapMs: 100,
            requirePriorIdleMs: undefined, holdTriggerOnRelease: undefined, retroTap: undefined,
            holdWhileUndecided: undefined, holdWhileUndecidedLinger: undefined, holdTriggerKeyPositions: [],
            bindings: ['&kp', '&none'],
        });
    });

    it("preserves a real engrammer HRM record's fields, including holdTriggerOnRelease", () => {
        const ht = engrammer.holdTaps.find((h) => h.name === '&HRM_left_index_middy_v1B_TKZ');
        const parsed = normalizeHoldTapFields(ht);
        expect(parsed.flavor).toBe('tap-preferred');
        expect(parsed.tappingTermMs).toBe(180);
        expect(parsed.quickTapMs).toBe(300);
        expect(parsed.requirePriorIdleMs).toBe(100);
        expect(parsed.holdTriggerOnRelease).toBe(true);
        expect(parsed.bindings).toEqual(['&kp', '&HRM_left_index_tap_v1B_TKZ']);
        // The real record for this key has a real holdTriggerKeyPositions allowlist — proves
        // normalizeHoldTapFields doesn't drop it (it used to have no representation at all here).
        expect(parsed.holdTriggerKeyPositions.length).toBeGreaterThan(0);
    });

    it('falls back to a sane default for a missing/malformed record', () => {
        expect(normalizeHoldTapFields(undefined)).toEqual({
            description: '', flavor: 'tap-preferred', tappingTermMs: undefined, quickTapMs: undefined,
            requirePriorIdleMs: undefined, holdTriggerOnRelease: undefined, retroTap: undefined,
            holdWhileUndecided: undefined, holdWhileUndecidedLinger: undefined, holdTriggerKeyPositions: [],
            bindings: ['&kp', '&kp'],
        });
    });
});

describe('findHoldTapReferences', () => {
    it('finds a real hold-tap directly assigned to a key on a layer (tynstar &strong)', () => {
        expect(findHoldTapReferences(tynstar, '&strong')).toEqual(['layer 0', 'layer 0']);
    });

    it('finds a real hold-tap directly assigned to a key on a layer (engrammer HRM)', () => {
        expect(findHoldTapReferences(engrammer, '&HRM_left_index_middy_v1B_TKZ')).toEqual(['layer 5']);
    });

    it('returns empty for a hold-tap nothing references', () => {
        expect(findHoldTapReferences(engrammer, '&ht_nonexistent')).toEqual([]);
    });

    it('finds a hold-tap referenced from a macro step, a mod-morph case, and a sticky key wrapper', () => {
        const config = {
            layers: [], combos: [],
            macros: [{ name: '&m1', bindings: [{ value: '&ht1' }] }],
            modMorphs: [{ name: '&mm1', cases: [{ binding: { value: '&kp', params: [{ value: 'A' }] } }, { binding: { value: '&ht1' } }] }],
            stickyKeys: [{ name: '&sk1', bindings: ['&ht1'] }],
            holdTaps: [{ name: '&ht1', bindings: ['&kp', '&kp'] }],
        };
        expect(findHoldTapReferences(config, '&ht1')).toEqual(['macro &m1', 'mod-morph &mm1', 'sticky key &sk1']);
    });
});

describe('uniqueHoldTapName', () => {
    it('sanitizes and dedupes against every real hold-tap and every other behavior namespace', () => {
        expect(uniqueHoldTapName(tynstar, 'Strong')).toBe('&Strong');
        expect(uniqueHoldTapName(tynstar, 'strong')).not.toBe('&strong');
    });
});

describe('create/update/rename/delete/clone round-trip', () => {
    it('creates a new hold-tap with sane defaults', () => {
        const { config, name } = createHoldTap(tynstar, 'my_ht');
        expect(name).toBe('&my_ht');
        const created = config.holdTaps.find((h) => h.name === name);
        expect(created).toEqual({ name: '&my_ht', description: '', flavor: 'tap-preferred', tappingTermMs: 200, bindings: ['&kp', '&kp'] });
        // original untouched
        expect(tynstar.holdTaps.find((h) => h.name === '&my_ht')).toBeUndefined();
    });

    it('update preserves holdTriggerKeyPositions and other unmanaged fields when editing managed ones', () => {
        const htName = '&HRM_left_index_middy_v1B_TKZ';
        const original = engrammer.holdTaps.find((h) => h.name === htName);
        const parsed = normalizeHoldTapFields(original);
        const next = updateHoldTap(engrammer, htName, { ...parsed, tappingTermMs: 250 });
        const updated = next.holdTaps.find((h) => h.name === htName);
        expect(updated.tappingTermMs).toBe(250);
        expect(updated.holdTriggerKeyPositions).toEqual(original.holdTriggerKeyPositions);
        expect(updated.holdTriggerKeyPositions.length).toBeGreaterThan(0);
    });

    it('update removes a numeric/boolean field when the form leaves it undefined', () => {
        const { config, name } = createHoldTap(tynstar, 'ht_clear');
        const withExtra = updateHoldTap(config, name, { description: '', flavor: 'balanced', tappingTermMs: 175, holdTriggerOnRelease: true, bindings: ['&kp', '&kp'] });
        const cleared = updateHoldTap(withExtra, name, { description: '', flavor: 'balanced', bindings: ['&kp', '&kp'] });
        const rec = cleared.holdTaps.find((h) => h.name === name);
        expect(rec.tappingTermMs).toBeUndefined();
        expect(rec.holdTriggerOnRelease).toBeUndefined();
        expect(rec.flavor).toBe('balanced');
    });

    it('renames a hold-tap and fixes up every real reference to it', () => {
        const renamed = renameHoldTap(tynstar, '&strong', '&strong_v2');
        expect(renamed.holdTaps.find((h) => h.name === '&strong_v2')).toBeTruthy();
        expect(findHoldTapReferences(renamed, '&strong_v2').length).toBe(2);
        expect(findHoldTapReferences(renamed, '&strong')).toEqual([]);
    });

    it('rename fixes up another hold-tap that names it in its own bindings list', () => {
        const config = { holdTaps: [{ name: '&ht1', bindings: ['&kp', '&kp'] }, { name: '&ht2', bindings: ['&ht1', '&kp'] }] };
        const renamed = renameHoldTap(config, '&ht1', '&ht1_renamed');
        expect(renamed.holdTaps.find((h) => h.name === '&ht2').bindings).toEqual(['&ht1_renamed', '&kp']);
    });

    it('deletes a hold-tap', () => {
        const { config, name } = createHoldTap(tynstar, 'to_delete');
        const deleted = deleteHoldTap(config, name);
        expect(deleted.holdTaps.find((h) => h.name === name)).toBeUndefined();
    });

    it('clones a hold-tap with a deduped name and identical contents', () => {
        const { config, name } = cloneHoldTap(tynstar, '&strong');
        expect(name).toBe('&strong_copy');
        const clone = config.holdTaps.find((h) => h.name === name);
        const original = tynstar.holdTaps.find((h) => h.name === '&strong');
        expect(clone).toEqual({ ...original, name: '&strong_copy' });
    });

    // holdWhileUndecided/holdWhileUndecidedLinger and holdTriggerKeyPositions had no editable
    // path anywhere in GLIDE before this audit (see this file's own header) — proving the write
    // side here, not just that normalizeHoldTapFields reads them back.
    it('writes and clears holdWhileUndecided/holdWhileUndecidedLinger like every other optional boolean', () => {
        const { config, name } = createHoldTap(tynstar, 'ht_undecided');
        const withFlags = updateHoldTap(config, name, { description: '', flavor: 'balanced', bindings: ['&kp', '&kp'], holdWhileUndecided: true, holdWhileUndecidedLinger: true });
        expect(withFlags.holdTaps.find((h) => h.name === name).holdWhileUndecided).toBe(true);
        expect(withFlags.holdTaps.find((h) => h.name === name).holdWhileUndecidedLinger).toBe(true);

        const cleared = updateHoldTap(withFlags, name, { description: '', flavor: 'balanced', bindings: ['&kp', '&kp'] });
        expect(cleared.holdTaps.find((h) => h.name === name).holdWhileUndecided).toBeUndefined();
        expect(cleared.holdTaps.find((h) => h.name === name).holdWhileUndecidedLinger).toBeUndefined();
    });

    it('can set holdTriggerKeyPositions on a hold-tap that never had one (the previously-missing write path)', () => {
        const { config, name } = createHoldTap(tynstar, 'ht_keys');
        const withKeys = updateHoldTap(config, name, { description: '', flavor: 'tap-preferred', bindings: ['&kp', '&kp'], holdTriggerKeyPositions: [3, 7, 12] });
        expect(withKeys.holdTaps.find((h) => h.name === name).holdTriggerKeyPositions).toEqual([3, 7, 12]);
    });
});
