// core/zmk/tapDance.js — CRUD/reference-safety helpers for user-authored ZMK &tap-dance behavior
// definitions (config.tapDances), for the Tap-Dance Builder UI.
//
// Neither real fixture (tests/fixtures/tynstar.json, tests/fixtures/engrammer.json) contains a
// user-authored tap-dance, so unlike macro.js/stickyKey.js/modMorph.js/holdTap.js this module
// isn't grounded against a real example of the top-level record shape. What IS grounded, from two
// other places already proven against real data in this repo, is the shape of the two things
// inside it:
//   - `bindings`: an ordered array of ordinary ZMK binding objects (`{ value, params }`), one per
//     tap count — not plain name strings like a hold-tap's `bindings`. This is how
//     core/slots.js's own `buildBindingAndConfig` already synthesizes a GLIDE-generated tap-dance
//     (`GLIDE_TD_...`) when composing a key's tap + double-tap slots, and matches ZMK's own docs
//     (zmk.dev/docs/keymaps/behaviors/tap-dance) — each binding entry can be `&kp A`, a full
//     behavior invocation, not just a bare name.
//   - `tappingTermMs`: same single numeric property core/slots.js's synthesized tap-dances always
//     set (200 there), and the same field name ZMK's own tap-dance config uses.
// A tap-dance needs at least 2 bindings to mean anything (ZMK requires 2+); this module never
// lets one drop below that.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    function normalizeTapDanceFields(td) {
        const bindings = Array.isArray(td?.bindings) && td.bindings.length >= 2
            ? td.bindings.map((b) => (b && typeof b === 'object' ? structuredClone(b) : { value: '&none' }))
            : [{ value: '&kp', params: [{ value: 'A' }] }, { value: '&kp', params: [{ value: 'B' }] }];
        return {
            description: td?.description || '',
            tappingTermMs: typeof td?.tappingTermMs === 'number' ? td.tappingTermMs : undefined,
            bindings,
        };
    }

    // -- CRUD over config.tapDances, plus reference safety --

    const tapDanceNames = (config) => (config?.tapDances || []).map((t) => t.name);

    // A tap-dance's name can be referenced from exactly the same places a hold-tap's can (see
    // core/zmk/holdTap.js's findHoldTapReferences) plus another tap-dance's own `bindings` — a
    // tap-dance binding entry can itself invoke a different tap-dance by name.
    function findTapDanceReferences(config, name) {
        if (!config || !name) return [];
        const hits = [];
        const scanBindingTree = (node, where) => { if (node && typeof node === 'object') { if (node.value === name) hits.push(where); if (Array.isArray(node.params)) node.params.forEach((p) => scanBindingTree(p, where)); } };
        const scanNameList = (list, where) => (list || []).forEach((entry) => { if (entry === name || (entry && entry.value === name)) hits.push(where); });

        (config.layers || []).forEach((layer, li) => (layer || []).forEach((b) => scanBindingTree(b, `layer ${li}`)));
        (config.combos || []).forEach((combo, ci) => scanBindingTree(combo.binding, `combo ${ci}`));
        (config.holdTaps || []).forEach((ht) => scanNameList(ht.bindings, `hold-tap ${ht.name}`));
        (config.tapDances || []).forEach((td) => { if (td.name !== name) (td.bindings || []).forEach((b) => scanBindingTree(b, `tap-dance ${td.name}`)); });
        (config.macros || []).forEach((m) => (m.bindings || []).forEach((b) => scanBindingTree(b, `macro ${m.name}`)));
        (config.modMorphs || []).forEach((mm) => (mm.cases || []).forEach((c) => scanBindingTree(c.binding, `mod-morph ${mm.name}`)));
        (config.stickyKeys || []).forEach((sk) => scanNameList(sk.bindings, `sticky key ${sk.name}`));
        return hits;
    }

    function uniqueTapDanceName(config, desired) {
        let base = String(desired || 'my_tap_dance').trim().replace(/^&/, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'my_tap_dance';
        const taken = new Set([
            ...tapDanceNames(config), ...(config?.macros || []).map((b) => b.name),
            ...(config?.holdTaps || []).map((b) => b.name), ...(config?.modMorphs || []).map((b) => b.name),
            ...(config?.stickyKeys || []).map((b) => b.name),
        ]);
        let candidate = `&${base}`, n = 2;
        while (taken.has(candidate)) candidate = `&${base}_${n++}`;
        return candidate;
    }

    // Never mutates the passed-in config — same convention as every other create* in core/zmk/.
    function createTapDance(config, desiredName) {
        const next = structuredClone(config || { tapDances: [] });
        if (!Array.isArray(next.tapDances)) next.tapDances = [];
        const name = uniqueTapDanceName(next, desiredName || 'my_tap_dance');
        next.tapDances.push({ name, description: '', tappingTermMs: 200, bindings: [{ value: '&kp', params: [{ value: 'A' }] }, { value: '&kp', params: [{ value: 'B' }] }] });
        return { config: next, name };
    }

    function updateTapDance(config, name, parsed) {
        const next = structuredClone(config);
        const idx = (next.tapDances || []).findIndex((t) => t.name === name);
        const existing = idx >= 0 ? next.tapDances[idx] : {};
        const bindings = Array.isArray(parsed.bindings) && parsed.bindings.length >= 2 ? parsed.bindings.map((b) => structuredClone(b)) : (existing.bindings || [{ value: '&kp', params: [{ value: 'A' }] }, { value: '&kp', params: [{ value: 'B' }] }]);
        const built = { ...existing, name, description: parsed.description || '', bindings };
        if (typeof parsed.tappingTermMs === 'number') built.tappingTermMs = parsed.tappingTermMs; else delete built.tappingTermMs;
        if (idx >= 0) next.tapDances[idx] = built; else { if (!next.tapDances) next.tapDances = []; next.tapDances.push(built); }
        return next;
    }

    // Renames a tap-dance AND every place that referenced it (see findTapDanceReferences) in one
    // atomic config transform.
    function renameTapDance(config, oldName, newName) {
        if (oldName === newName) return config;
        const next = structuredClone(config);
        const rewriteBindingTree = (node) => { if (node && typeof node === 'object') { if (node.value === oldName) node.value = newName; if (Array.isArray(node.params)) node.params.forEach(rewriteBindingTree); } };
        const rewriteNameList = (list) => { if (!Array.isArray(list)) return; for (let i = 0; i < list.length; i++) { if (list[i] === oldName) list[i] = newName; else if (list[i] && list[i].value === oldName) list[i].value = newName; } };

        (next.layers || []).forEach((layer) => (layer || []).forEach(rewriteBindingTree));
        (next.combos || []).forEach((combo) => rewriteBindingTree(combo.binding));
        (next.holdTaps || []).forEach((ht) => rewriteNameList(ht.bindings));
        (next.macros || []).forEach((m) => (m.bindings || []).forEach(rewriteBindingTree));
        (next.modMorphs || []).forEach((mm) => (mm.cases || []).forEach((c) => rewriteBindingTree(c.binding)));
        (next.stickyKeys || []).forEach((sk) => rewriteNameList(sk.bindings));
        (next.tapDances || []).forEach((td) => { if (td.name === oldName) td.name = newName; else (td.bindings || []).forEach(rewriteBindingTree); });
        return next;
    }

    function deleteTapDance(config, name) {
        const next = structuredClone(config);
        next.tapDances = (next.tapDances || []).filter((t) => t.name !== name);
        return next;
    }

    function cloneTapDance(config, name) {
        const next = structuredClone(config);
        const src = (next.tapDances || []).find((t) => t.name === name);
        if (!src) return { config, name: null };
        const newName = uniqueTapDanceName(next, name.replace(/^&/, '') + '_copy');
        next.tapDances.push({ ...structuredClone(src), name: newName });
        return { config: next, name: newName };
    }

    Object.assign(GlideCore, {
        normalizeTapDanceFields,
        tapDanceNames, findTapDanceReferences, uniqueTapDanceName,
        createTapDance, updateTapDance, renameTapDance, deleteTapDance, cloneTapDance,
    });
})();
