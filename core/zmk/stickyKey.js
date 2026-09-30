// core/zmk/stickyKey.js — parsing/building ZMK &sk (sticky-key) behavior definitions
// (config.stickyKeys) and the CRUD/reference-safety helpers the Sticky Key Builder UI needs on
// top of them.
//
// GLIDE's file-IO layer already carries `config.stickyKeys` through load/export completely
// untouched (see core/io/layoutSchema.js — a plain passthrough `array` field, same as `macros`)
// — this module doesn't change that contract. It adds a friendly, structured *view* onto one
// sticky-key definition's flat properties, the same "parse into a model a settings UI can bind
// to, build back into the exact JSON" shape as core/zmk/macro.js and core/behaviors/compile.js.
//
// Grounded against ZMK's own docs (zmk.dev/docs/keymaps/behaviors/sticky-key) for the four
// configurable properties (release-after-ms/quick-release/lazy/ignore-modifiers) and against the
// one real sticky-key definition that exists across both real fixtures used throughout this repo
// (tests/fixtures/engrammer.json's `&sticky_key_quickrel_v1_TKZ` — tynstar.json has none) for the
// real JSON property names and shape.
//
// IMPORTANT, unlike macro.js: a sticky key's `bindings` array is NOT a list of binding objects —
// confirmed against the real fixture, it's a plain array of behavior-name strings (`["&kp"]`),
// declaring what single-param behavior this sticky key wraps (per ZMK docs, #binding-cells is
// always 1 for &sk, and &kp is the overwhelmingly common — effectively universal — choice). Kept
// exactly as given rather than assumed to always be `["&kp"]`, in case a real export ever wraps
// something else.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // tapMs/waitMs-style absence-vs-explicit-value distinction applies here too: a real sticky
    // key with no `releaseAfterMs` key at all means "use the device's compiled-in 1000ms
    // default," not the same thing as an explicit `1000`. Same for the three booleans — ZMK's own
    // defaults (quickRelease/lazy disabled, ignoreModifiers enabled) apply when the key is
    // missing, but a real file can and does write them out explicitly (the real fixture writes
    // all three even where they match ZMK's own default), so this never invents or collapses that
    // either.
    function parseStickyKey(sk) {
        return {
            name: sk.name,
            description: sk.description || '',
            releaseAfterMs: typeof sk.releaseAfterMs === 'number' ? sk.releaseAfterMs : undefined,
            quickRelease: typeof sk.quickRelease === 'boolean' ? sk.quickRelease : undefined,
            lazy: typeof sk.lazy === 'boolean' ? sk.lazy : undefined,
            ignoreModifiers: typeof sk.ignoreModifiers === 'boolean' ? sk.ignoreModifiers : undefined,
            bindings: Array.isArray(sk.bindings) ? [...sk.bindings] : ['&kp'],
        };
    }

    function buildStickyKey(parsed) {
        const out = { name: parsed.name, description: parsed.description || '' };
        if (typeof parsed.releaseAfterMs === 'number') out.releaseAfterMs = parsed.releaseAfterMs;
        if (typeof parsed.quickRelease === 'boolean') out.quickRelease = parsed.quickRelease;
        if (typeof parsed.lazy === 'boolean') out.lazy = parsed.lazy;
        if (typeof parsed.ignoreModifiers === 'boolean') out.ignoreModifiers = parsed.ignoreModifiers;
        out.bindings = Array.isArray(parsed.bindings) && parsed.bindings.length > 0 ? [...parsed.bindings] : ['&kp'];
        return out;
    }

    // -- CRUD over config.stickyKeys, plus reference safety --

    const stickyKeyNames = (config) => (config?.stickyKeys || []).map((s) => s.name);

    // A sticky key's name can be referenced from: an ordinary key/combo binding value; a hold-tap's
    // or tap-dance's own `bindings` list (plain behavior-name strings, same convention proven for
    // macros in core/zmk/macro.js's findMacroReferences); or a macro's own steps (a sticky key
    // invoked as one step of a macro is valid ZMK, same as any other behavior). Mirrors
    // findMacroReferences's exact structure for consistency — countBehaviorUsage (core/usage.js)
    // still only walks layers+combos, so this fuller scan is needed here too.
    function findStickyKeyReferences(config, name) {
        if (!config || !name) return [];
        const hits = [];
        const scanBindingTree = (node, where) => { if (node && typeof node === 'object') { if (node.value === name) hits.push(where); if (Array.isArray(node.params)) node.params.forEach((p) => scanBindingTree(p, where)); } };
        const scanNameList = (list, where) => (list || []).forEach((entry) => { if (entry === name || (entry && entry.value === name)) hits.push(where); });

        (config.layers || []).forEach((layer, li) => (layer || []).forEach((b) => scanBindingTree(b, `layer ${li}`)));
        (config.combos || []).forEach((combo, ci) => scanBindingTree(combo.binding, `combo ${ci}`));
        (config.holdTaps || []).forEach((ht) => scanNameList(ht.bindings, `hold-tap ${ht.name}`));
        (config.tapDances || []).forEach((td) => scanNameList(td.bindings, `tap-dance ${td.name}`));
        (config.macros || []).forEach((m) => (m.bindings || []).forEach((b) => scanBindingTree(b, `macro ${m.name}`)));
        return hits;
    }

    function uniqueStickyKeyName(config, desired) {
        let base = String(desired || 'my_sticky_key').trim().replace(/^&/, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'my_sticky_key';
        const taken = new Set([
            ...stickyKeyNames(config), ...(config?.macros || []).map((b) => b.name),
            ...(config?.holdTaps || []).map((b) => b.name), ...(config?.tapDances || []).map((b) => b.name),
            ...(config?.modMorphs || []).map((b) => b.name),
        ]);
        let candidate = `&${base}`, n = 2;
        while (taken.has(candidate)) candidate = `&${base}_${n++}`;
        return candidate;
    }

    // Never mutates the passed-in config — same convention as every other config-transforming
    // function in core/ (runGC, applyFlow, setTouchpadConfig, createMacro, …).
    function createStickyKey(config, desiredName) {
        const next = structuredClone(config || { stickyKeys: [] });
        if (!Array.isArray(next.stickyKeys)) next.stickyKeys = [];
        const name = uniqueStickyKeyName(next, desiredName || 'my_sticky_key');
        next.stickyKeys.push({ name, description: '', quickRelease: false, lazy: false, ignoreModifiers: true, bindings: ['&kp'] });
        return { config: next, name };
    }

    function updateStickyKey(config, name, parsed) {
        const next = structuredClone(config);
        const idx = (next.stickyKeys || []).findIndex((s) => s.name === name);
        const built = buildStickyKey({ ...parsed, name });
        if (idx >= 0) next.stickyKeys[idx] = built; else { if (!next.stickyKeys) next.stickyKeys = []; next.stickyKeys.push(built); }
        return next;
    }

    // Renames a sticky key AND every place that names it (see findStickyKeyReferences) in one
    // atomic config transform, so a rename can never silently leave something else pointing at a
    // name that no longer exists.
    function renameStickyKey(config, oldName, newName) {
        if (oldName === newName) return config;
        const next = structuredClone(config);
        const rewriteBindingTree = (node) => { if (node && typeof node === 'object') { if (node.value === oldName) node.value = newName; if (Array.isArray(node.params)) node.params.forEach(rewriteBindingTree); } };
        const rewriteNameList = (list) => { if (!Array.isArray(list)) return; for (let i = 0; i < list.length; i++) { if (list[i] === oldName) list[i] = newName; else if (list[i] && list[i].value === oldName) list[i].value = newName; } };

        (next.layers || []).forEach((layer) => (layer || []).forEach(rewriteBindingTree));
        (next.combos || []).forEach((combo) => rewriteBindingTree(combo.binding));
        (next.holdTaps || []).forEach((ht) => rewriteNameList(ht.bindings));
        (next.tapDances || []).forEach((td) => rewriteNameList(td.bindings));
        (next.macros || []).forEach((m) => (m.bindings || []).forEach(rewriteBindingTree));
        (next.stickyKeys || []).forEach((s) => { if (s.name === oldName) s.name = newName; });
        return next;
    }

    function deleteStickyKey(config, name) {
        const next = structuredClone(config);
        next.stickyKeys = (next.stickyKeys || []).filter((s) => s.name !== name);
        return next;
    }

    function cloneStickyKey(config, name) {
        const next = structuredClone(config);
        const src = (next.stickyKeys || []).find((s) => s.name === name);
        if (!src) return { config, name: null };
        const newName = uniqueStickyKeyName(next, name.replace(/^&/, '') + '_copy');
        next.stickyKeys.push({ ...structuredClone(src), name: newName });
        return { config: next, name: newName };
    }

    Object.assign(GlideCore, {
        parseStickyKey, buildStickyKey,
        stickyKeyNames, findStickyKeyReferences, uniqueStickyKeyName,
        createStickyKey, updateStickyKey, renameStickyKey, deleteStickyKey, cloneStickyKey,
    });
})();
