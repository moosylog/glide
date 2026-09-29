// tests/core/stickyKey.test.js — core/zmk/stickyKey.js against the one real MoErgo export with a
// real sticky-key definition in it: tests/fixtures/engrammer.json's `&sticky_key_quickrel_v1_TKZ`
// (tynstar.json has none). Parsing must read exactly what the real file says, and round-tripping
// it must reproduce it losslessly — this is firmware config, not cosmetic UI state.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
new Function(readFileSync(path.join(repoRoot, 'core/zmk/stickyKey.js'), 'utf8')).call(globalThis);
const {
    parseStickyKey, buildStickyKey,
    stickyKeyNames, findStickyKeyReferences, uniqueStickyKeyName,
    createStickyKey, updateStickyKey, renameStickyKey, deleteStickyKey, cloneStickyKey,
} = globalThis.GlideCore;

const engrammer = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'engrammer.json'), 'utf8'));
const tynstar = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'fixtures', 'tynstar.json'), 'utf8'));

describe('parseStickyKey / buildStickyKey against the real fixture', () => {
    it('reproduces engrammer.json\'s one real sticky key exactly', () => {
        const sk = engrammer.stickyKeys.find((s) => s.name === '&sticky_key_quickrel_v1_TKZ');
        expect(buildStickyKey(parseStickyKey(sk))).toEqual(sk);
    });

    it('parses the real fixture\'s explicit flag values correctly, not just their presence', () => {
        const sk = engrammer.stickyKeys.find((s) => s.name === '&sticky_key_quickrel_v1_TKZ');
        const parsed = parseStickyKey(sk);
        expect(parsed.releaseAfterMs).toBe(500);
        expect(parsed.quickRelease).toBe(true);
        expect(parsed.lazy).toBe(false);
        expect(parsed.ignoreModifiers).toBe(true);
        expect(parsed.bindings).toEqual(['&kp']);
    });

    it('never invents releaseAfterMs/quickRelease/lazy/ignoreModifiers a real sticky key did not have', () => {
        const minimal = { name: '&sk_minimal', description: '', bindings: ['&kp'] };
        const parsed = parseStickyKey(minimal);
        expect(parsed.releaseAfterMs).toBeUndefined();
        expect(parsed.quickRelease).toBeUndefined();
        expect(parsed.lazy).toBeUndefined();
        expect(parsed.ignoreModifiers).toBeUndefined();
        const built = buildStickyKey(parsed);
        expect(built).not.toHaveProperty('releaseAfterMs');
        expect(built).not.toHaveProperty('quickRelease');
        expect(built).not.toHaveProperty('lazy');
        expect(built).not.toHaveProperty('ignoreModifiers');
        expect(built).toEqual(minimal);
    });

    it('defaults bindings to ["&kp"] if missing or empty, never an empty array', () => {
        expect(parseStickyKey({ name: '&x' }).bindings).toEqual(['&kp']);
        expect(buildStickyKey({ name: '&x', bindings: [] })).toHaveProperty('bindings', ['&kp']);
    });
});

describe('findStickyKeyReferences', () => {
    it('finds the real fixture\'s sticky key referenced as a step inside another real macro', () => {
        // &sticky_key_oneshot_v1_TKZ (a different macro) invokes this sticky key as one of its
        // own steps — a real cross-behavior reference, not a synthetic one.
        expect(findStickyKeyReferences(engrammer, '&sticky_key_quickrel_v1_TKZ')).toEqual(['macro &sticky_key_oneshot_v1_TKZ']);
    });

    it('returns empty for a sticky key nothing else references', () => {
        expect(findStickyKeyReferences(tynstar, '&sk_nonexistent')).toEqual([]);
    });

    it('finds a sticky key used as a hold-tap\'s bound behavior (a plain string, not a binding object)', () => {
        const config = { holdTaps: [{ name: '&ht', bindings: ['&sk_shift', '&kp'] }] };
        expect(findStickyKeyReferences(config, '&sk_shift')).toEqual(['hold-tap &ht']);
    });

    it('finds a sticky key invoked as a step inside a macro', () => {
        const config = { macros: [{ name: '&m', bindings: [{ value: '&sk_shift' }] }] };
        expect(findStickyKeyReferences(config, '&sk_shift')).toEqual(['macro &m']);
    });

    it('finds a sticky key assigned directly to a key on a layer', () => {
        const config = { layers: [[{ value: '&sk_shift' }]] };
        expect(findStickyKeyReferences(config, '&sk_shift')).toEqual(['layer 0']);
    });
});

describe('uniqueStickyKeyName', () => {
    it('normalizes to a leading & and safe characters', () => {
        expect(uniqueStickyKeyName({ stickyKeys: [] }, 'My Sticky Key!')).toBe('&My_Sticky_Key');
    });
    it('dedupes against existing sticky-key, macro, hold-tap and tap-dance names', () => {
        const config = { stickyKeys: [{ name: '&foo' }], macros: [{ name: '&foo_2' }] };
        expect(uniqueStickyKeyName(config, 'foo')).toBe('&foo_3');
    });
});

describe('createStickyKey / updateStickyKey / deleteStickyKey / cloneStickyKey / renameStickyKey', () => {
    it('createStickyKey adds a new, minimal, uniquely-named sticky key without mutating the original config', () => {
        const config = { stickyKeys: [{ name: '&foo', bindings: ['&kp'] }] };
        const { config: next, name } = createStickyKey(config, 'foo');
        expect(name).toBe('&foo_2');
        expect(next.stickyKeys).toHaveLength(2);
        expect(config.stickyKeys).toHaveLength(1); // original untouched
    });

    it('updateStickyKey replaces exactly the targeted sticky key, leaving the rest of the array untouched', () => {
        const config = { stickyKeys: [{ name: '&a', bindings: ['&kp'] }, { name: '&b', bindings: ['&kp'] }] };
        const next = updateStickyKey(config, '&b', { name: '&b', description: 'now has a desc', quickRelease: true, bindings: ['&kp'] });
        expect(next.stickyKeys[0]).toEqual(config.stickyKeys[0]);
        expect(next.stickyKeys[1]).toEqual({ name: '&b', description: 'now has a desc', quickRelease: true, bindings: ['&kp'] });
    });

    it('deleteStickyKey removes only the named sticky key', () => {
        const config = { stickyKeys: [{ name: '&a' }, { name: '&b' }] };
        expect(deleteStickyKey(config, '&a').stickyKeys).toEqual([{ name: '&b' }]);
    });

    it('cloneStickyKey copies a sticky key under a new unique name, leaving the original untouched', () => {
        const config = { stickyKeys: [{ name: '&a', quickRelease: true, bindings: ['&kp'] }] };
        const { config: next, name } = cloneStickyKey(config, '&a');
        expect(name).toBe('&a_copy');
        expect(next.stickyKeys[1]).toEqual({ name: '&a_copy', quickRelease: true, bindings: ['&kp'] });
    });

    it('renameStickyKey updates the sticky key\'s own name AND every real place that referenced it', () => {
        const config = { stickyKeys: [{ name: '&sk_shift', bindings: ['&kp'] }], holdTaps: [{ name: '&ht', bindings: ['&sk_shift', '&kp'] }] };
        const renamed = renameStickyKey(config, '&sk_shift', '&renamed_sk');
        expect(renamed.stickyKeys.find((s) => s.name === '&renamed_sk')).toBeTruthy();
        expect(renamed.stickyKeys.find((s) => s.name === '&sk_shift')).toBeUndefined();
        expect(findStickyKeyReferences(renamed, '&sk_shift')).toEqual([]);
        expect(findStickyKeyReferences(renamed, '&renamed_sk')).toEqual(['hold-tap &ht']);
        // never mutates the original
        expect(config.stickyKeys.find((s) => s.name === '&sk_shift')).toBeTruthy();
    });
});
