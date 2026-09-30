// core/zmk/modMorph.js — CRUD/reference-safety helpers for user-authored ZMK &mod_morph behavior
// definitions (config.modMorphs), for the Mod-Morph Builder UI.
//
// Unlike core/zmk/macro.js and core/zmk/stickyKey.js, this module deliberately does NOT add a
// parse/build translation layer on top of the raw JSON shape — the real shape
// (`{ name, description, cases: [{ binding, mods, keepMods }, ...] }`) is already the friendly
// model a settings UI wants to bind to, one-to-one, so introducing a second intermediate
// representation would just be indirection with no round-trip risk to guard against. What this
// module *does* add is the same CRUD/reference-safety layer core/zmk/macro.js and
// core/zmk/stickyKey.js already established (createX/updateX/renameX/deleteX/cloneX,
// findXReferences, uniqueXName) — copied structurally from those two for consistency, since a
// mod-morph's name can be referenced from exactly the same places theirs can.
//
// Also unlike those two modules, GLIDE already has a small amount of mod-morph-aware code — the
// auto-generated GLIDE_MM_-prefixed mod-morphs core/slots.js's makeModMorph synthesizes for a
// key's Shift Action, and the existing mods-only toggle panel in glide.html's gear-icon settings
// view for editing THOSE. This module is for the other, larger real-world case (grounded against
// 27 real user-authored mod-morphs across both real fixtures — tests/fixtures/tynstar.json has
// 21, tests/fixtures/engrammer.json has 6 — none of them GLIDE-generated): a *named*, reusable
// mod-morph a real file already defines, assignable to any key by name, previously listable in
// the key-assignment palette but with no way to create or edit one.
//
// Confirmed against ZMK's own docs (zmk.dev/docs/keymaps/behaviors/mod-morph) and both real
// fixtures: a mod-morph always has exactly two cases — `cases[0]`, the default (fires when none
// of `cases[1].mods` are held; always has empty `mods`/`keepMods` in every real example, since
// ZMK's own `&mod_morph` only ever has ONE `mods` bitmask to test, not a per-case one) and
// `cases[1]`, the "modified" case (its `mods` is the OR'd set of modifiers that trigger it — real
// examples include both-shift `["MOD_LSFT","MOD_RSFT"]` and single-sided-only
// `["MOD_RSFT"]`/`["MOD_LSFT"]`; its `keepMods` is the subset of `mods` to still send through
// alongside the morphed keycode, real in tynstar's `&parsl`/`&parsr`, empty in most others). A
// case's `binding` is an ordinary binding object and can name any behavior, not just `&kp` — real
// in engrammer, whose mod-morphs invoke other custom behaviors as their cases' bindings.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    const modMorphNames = (config) => (config?.modMorphs || []).map((m) => m.name);

    // A mod-morph's name can be referenced from exactly the same places a macro's or sticky key's
    // can: an ordinary key/combo binding value; a hold-tap's/tap-dance's own `bindings` list
    // (plain behavior-name strings); or invoked as a step inside a macro, or as a case's binding
    // inside a *different* mod-morph. countBehaviorUsage (core/usage.js) only walks
    // layers+combos, same gap as for macros/sticky keys — this covers the rest.
    function findModMorphReferences(config, name) {
        if (!config || !name) return [];
        const hits = [];
        const scanBindingTree = (node, where) => { if (node && typeof node === 'object') { if (node.value === name) hits.push(where); if (Array.isArray(node.params)) node.params.forEach((p) => scanBindingTree(p, where)); } };
        const scanNameList = (list, where) => (list || []).forEach((entry) => { if (entry === name || (entry && entry.value === name)) hits.push(where); });

        (config.layers || []).forEach((layer, li) => (layer || []).forEach((b) => scanBindingTree(b, `layer ${li}`)));
        (config.combos || []).forEach((combo, ci) => scanBindingTree(combo.binding, `combo ${ci}`));
        (config.holdTaps || []).forEach((ht) => scanNameList(ht.bindings, `hold-tap ${ht.name}`));
        (config.tapDances || []).forEach((td) => scanNameList(td.bindings, `tap-dance ${td.name}`));
        (config.macros || []).forEach((m) => (m.bindings || []).forEach((b) => scanBindingTree(b, `macro ${m.name}`)));
        (config.modMorphs || []).forEach((mm) => { if (mm.name !== name) (mm.cases || []).forEach((c) => scanBindingTree(c.binding, `mod-morph ${mm.name}`)); });
        return hits;
    }

    function uniqueModMorphName(config, desired) {
        let base = String(desired || 'my_mod_morph').trim().replace(/^&/, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'my_mod_morph';
        const taken = new Set([
            ...modMorphNames(config), ...(config?.macros || []).map((b) => b.name),
            ...(config?.holdTaps || []).map((b) => b.name), ...(config?.tapDances || []).map((b) => b.name),
            ...(config?.stickyKeys || []).map((b) => b.name),
        ]);
        let candidate = `&${base}`, n = 2;
        while (taken.has(candidate)) candidate = `&${base}_${n++}`;
        return candidate;
    }

    // Always normalizes to exactly two cases, case 0's mods/keepMods forced empty — that's not an
    // editable UI choice, it's an invariant of the real behavior (ZMK's &mod_morph has exactly one
    // `mods` bitmask, tested for case 1; case 0 is simply "otherwise").
    function normalizeModMorphCases(cases) {
        const c0 = cases?.[0] || {};
        const c1 = cases?.[1] || {};
        return [
            { binding: c0.binding || { value: '&none' }, mods: [], keepMods: [] },
            { binding: c1.binding || { value: '&none' }, mods: Array.isArray(c1.mods) ? [...c1.mods] : [], keepMods: Array.isArray(c1.keepMods) ? [...c1.keepMods] : [] },
        ];
    }

    // Never mutates the passed-in config — same convention as createMacro/createStickyKey/runGC/…
    function createModMorph(config, desiredName) {
        const next = structuredClone(config || { modMorphs: [] });
        if (!Array.isArray(next.modMorphs)) next.modMorphs = [];
        const name = uniqueModMorphName(next, desiredName || 'my_mod_morph');
        next.modMorphs.push({
            name, description: '',
            cases: [
                { binding: { value: '&none' }, mods: [], keepMods: [] },
                { binding: { value: '&none' }, mods: ['MOD_LSFT', 'MOD_RSFT'], keepMods: [] },
            ],
        });
        return { config: next, name };
    }

    function updateModMorph(config, name, updated) {
        const next = structuredClone(config);
        const idx = (next.modMorphs || []).findIndex((m) => m.name === name);
        const built = { name, description: updated.description || '', cases: normalizeModMorphCases(updated.cases) };
        if (idx >= 0) next.modMorphs[idx] = built; else { if (!next.modMorphs) next.modMorphs = []; next.modMorphs.push(built); }
        return next;
    }

    // Renames a mod-morph AND every real place that referenced it (see findModMorphReferences) in
    // one atomic config transform.
    function renameModMorph(config, oldName, newName) {
        if (oldName === newName) return config;
        const next = structuredClone(config);
        const rewriteBindingTree = (node) => { if (node && typeof node === 'object') { if (node.value === oldName) node.value = newName; if (Array.isArray(node.params)) node.params.forEach(rewriteBindingTree); } };
        const rewriteNameList = (list) => { if (!Array.isArray(list)) return; for (let i = 0; i < list.length; i++) { if (list[i] === oldName) list[i] = newName; else if (list[i] && list[i].value === oldName) list[i].value = newName; } };

        (next.layers || []).forEach((layer) => (layer || []).forEach(rewriteBindingTree));
        (next.combos || []).forEach((combo) => rewriteBindingTree(combo.binding));
        (next.holdTaps || []).forEach((ht) => rewriteNameList(ht.bindings));
        (next.tapDances || []).forEach((td) => rewriteNameList(td.bindings));
        (next.macros || []).forEach((m) => (m.bindings || []).forEach(rewriteBindingTree));
        (next.modMorphs || []).forEach((mm) => { if (mm.name === oldName) mm.name = newName; else (mm.cases || []).forEach((c) => rewriteBindingTree(c.binding)); });
        return next;
    }

    function deleteModMorph(config, name) {
        const next = structuredClone(config);
        next.modMorphs = (next.modMorphs || []).filter((m) => m.name !== name);
        return next;
    }

    function cloneModMorph(config, name) {
        const next = structuredClone(config);
        const src = (next.modMorphs || []).find((m) => m.name === name);
        if (!src) return { config, name: null };
        const newName = uniqueModMorphName(next, name.replace(/^&/, '') + '_copy');
        next.modMorphs.push({ ...structuredClone(src), name: newName });
        return { config: next, name: newName };
    }

    Object.assign(GlideCore, {
        modMorphNames, findModMorphReferences, uniqueModMorphName, normalizeModMorphCases,
        createModMorph, updateModMorph, renameModMorph, deleteModMorph, cloneModMorph,
    });
})();
