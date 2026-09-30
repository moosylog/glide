// core/zmk/holdTap.js — CRUD/reference-safety helpers for user-authored ZMK &hold-tap behavior
// definitions (config.holdTaps), for the Hold-Tap Builder UI.
//
// Like core/zmk/modMorph.js, this deliberately skips a parse/build translation layer — the real
// shape (`{ name, description, flavor, tappingTermMs, quickTapMs, requirePriorIdleMs,
// holdTriggerOnRelease, bindings: [holdVal, tapVal], ... }`) is already close enough to a form
// model that a second representation would just be indirection. What it *does* add on top is a
// `normalizeHoldTapFields` seed for the modal's initial state, plus the same
// createX/updateX/renameX/deleteX/cloneX + findXReferences + uniqueXName layer established by
// core/zmk/macro.js, core/zmk/stickyKey.js and core/zmk/modMorph.js.
//
// Grounded against ZMK's own docs (zmk.dev/docs/keymaps/behaviors/hold-tap) and the 36 real
// hold-tap definitions across both fixtures (tests/fixtures/engrammer.json has 35,
// tests/fixtures/tynstar.json has 1). Two things the real data settled that the docs alone
// wouldn't have:
//   - `bindings` is a plain 2-element array of behavior-name STRINGS (`["&kp",
//     "&HRM_left_index_tap_v1B_TKZ"]`), not binding objects with params — confirmed against every
//     real record. This matches core/slots.js's own `makeHoldTap`, which writes hold-taps the
//     same way. `retroTap` never appears in the real data (ZMK's own default is false), but is
//     still exposed as an editable boolean since it's a documented, real behavior property.
//   - Real records carry `holdTriggerKeyPositions` (a per-key physical-position allowlist,
//     sometimes 40+ entries). It IS editable — through the per-key inspector's inline hold-tap
//     editor (DynamicBehaviorForm, core/behaviors/schemas.js's `keyboard_picker` widget) — but
//     the separate, standalone Behavior Library HoldTapBuilderModal (ui/builders.js) had no field
//     for it at all, a real gap between the two editors for the same data found by auditing this
//     module against ZMK's actual property list rather than just this file's own tests. Both
//     normalizeHoldTapFields and updateHoldTap below now manage it explicitly (default `[]`, not
//     silently dropped) so HoldTapBuilderModal can gain the same field without a second, divergent
//     read/write path.
//
// `holdWhileUndecided`/`holdWhileUndecidedLinger` (ZMK device-tree `hold-while-undecided`/
// `hold-while-undecided-linger`): two more real, documented hold-tap properties that had no
// representation anywhere in GLIDE at all — not in this module, not in core/behaviors/schemas.js,
// not in either editor UI — until this same audit. `hold-while-undecided` sends the hold binding's
// key-down the moment the hold-tap is triggered, while ZMK is still deciding tap vs. hold (instead
// of waiting for the decision); `hold-while-undecided-linger` keeps that hold binding active until
// the tap binding's own key-up, rather than releasing it as soon as the decision resolves. Same
// undefined-means-"use the firmware default" convention as every other optional boolean here.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    const HOLD_TAP_FLAVORS = ['hold-preferred', 'balanced', 'tap-preferred'];

    // Seeds a settings-UI form from a real (or partial) hold-tap record. Absence of a numeric/
    // boolean field is kept as `undefined` (meaning "use ZMK's compiled-in default"), same
    // presence-vs-explicit-value convention as core/zmk/stickyKey.js's parseStickyKey.
    function normalizeHoldTapFields(ht) {
        return {
            description: ht?.description || '',
            flavor: typeof ht?.flavor === 'string' && HOLD_TAP_FLAVORS.includes(ht.flavor) ? ht.flavor : 'tap-preferred',
            tappingTermMs: typeof ht?.tappingTermMs === 'number' ? ht.tappingTermMs : undefined,
            quickTapMs: typeof ht?.quickTapMs === 'number' ? ht.quickTapMs : undefined,
            requirePriorIdleMs: typeof ht?.requirePriorIdleMs === 'number' ? ht.requirePriorIdleMs : undefined,
            holdTriggerOnRelease: typeof ht?.holdTriggerOnRelease === 'boolean' ? ht.holdTriggerOnRelease : undefined,
            retroTap: typeof ht?.retroTap === 'boolean' ? ht.retroTap : undefined,
            holdWhileUndecided: typeof ht?.holdWhileUndecided === 'boolean' ? ht.holdWhileUndecided : undefined,
            holdWhileUndecidedLinger: typeof ht?.holdWhileUndecidedLinger === 'boolean' ? ht.holdWhileUndecidedLinger : undefined,
            holdTriggerKeyPositions: Array.isArray(ht?.holdTriggerKeyPositions) ? [...ht.holdTriggerKeyPositions] : [],
            bindings: Array.isArray(ht?.bindings) && ht.bindings.length >= 2 ? [ht.bindings[0], ht.bindings[1]] : ['&kp', '&kp'],
        };
    }

    // -- CRUD over config.holdTaps, plus reference safety --

    const holdTapNames = (config) => (config?.holdTaps || []).map((h) => h.name);

    // A hold-tap's name can be referenced from: an ordinary key/combo binding value; another
    // hold-tap's or a tap-dance's own `bindings` list; a macro's steps; a mod-morph's case
    // binding; or a sticky key's `bindings` name list (it wraps a single behavior name, which —
    // structurally, if rarely in practice — could be a hold-tap). Mirrors
    // findModMorphReferences's structure, extended with the stickyKeys bucket modMorph.js didn't
    // have yet.
    function findHoldTapReferences(config, name) {
        if (!config || !name) return [];
        const hits = [];
        const scanBindingTree = (node, where) => { if (node && typeof node === 'object') { if (node.value === name) hits.push(where); if (Array.isArray(node.params)) node.params.forEach((p) => scanBindingTree(p, where)); } };
        const scanNameList = (list, where) => (list || []).forEach((entry) => { if (entry === name || (entry && entry.value === name)) hits.push(where); });

        (config.layers || []).forEach((layer, li) => (layer || []).forEach((b) => scanBindingTree(b, `layer ${li}`)));
        (config.combos || []).forEach((combo, ci) => scanBindingTree(combo.binding, `combo ${ci}`));
        (config.holdTaps || []).forEach((ht) => { if (ht.name !== name) scanNameList(ht.bindings, `hold-tap ${ht.name}`); });
        (config.tapDances || []).forEach((td) => scanNameList(td.bindings, `tap-dance ${td.name}`));
        (config.macros || []).forEach((m) => (m.bindings || []).forEach((b) => scanBindingTree(b, `macro ${m.name}`)));
        (config.modMorphs || []).forEach((mm) => (mm.cases || []).forEach((c) => scanBindingTree(c.binding, `mod-morph ${mm.name}`)));
        (config.stickyKeys || []).forEach((sk) => scanNameList(sk.bindings, `sticky key ${sk.name}`));
        return hits;
    }

    function uniqueHoldTapName(config, desired) {
        let base = String(desired || 'my_hold_tap').trim().replace(/^&/, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'my_hold_tap';
        const taken = new Set([
            ...holdTapNames(config), ...(config?.macros || []).map((b) => b.name),
            ...(config?.tapDances || []).map((b) => b.name), ...(config?.modMorphs || []).map((b) => b.name),
            ...(config?.stickyKeys || []).map((b) => b.name),
        ]);
        let candidate = `&${base}`, n = 2;
        while (taken.has(candidate)) candidate = `&${base}_${n++}`;
        return candidate;
    }

    // Never mutates the passed-in config — same convention as createMacro/createStickyKey/
    // createModMorph/runGC/….
    function createHoldTap(config, desiredName) {
        const next = structuredClone(config || { holdTaps: [] });
        if (!Array.isArray(next.holdTaps)) next.holdTaps = [];
        const name = uniqueHoldTapName(next, desiredName || 'my_hold_tap');
        next.holdTaps.push({ name, description: '', flavor: 'tap-preferred', tappingTermMs: 200, bindings: ['&kp', '&kp'] });
        return { config: next, name };
    }

    // Merges onto the existing record (if any) rather than rebuilding it from scratch, so fields
    // this module doesn't manage — `holdTriggerKeyPositions` above all — survive an edit untouched.
    function updateHoldTap(config, name, parsed) {
        const next = structuredClone(config);
        const idx = (next.holdTaps || []).findIndex((h) => h.name === name);
        const existing = idx >= 0 ? next.holdTaps[idx] : {};
        const built = {
            ...existing,
            name,
            description: parsed.description || '',
            flavor: HOLD_TAP_FLAVORS.includes(parsed.flavor) ? parsed.flavor : 'tap-preferred',
            bindings: Array.isArray(parsed.bindings) && parsed.bindings.length >= 2 ? [parsed.bindings[0], parsed.bindings[1]] : ['&kp', '&kp'],
        };
        ['tappingTermMs', 'quickTapMs', 'requirePriorIdleMs'].forEach((k) => {
            if (typeof parsed[k] === 'number') built[k] = parsed[k]; else delete built[k];
        });
        ['holdTriggerOnRelease', 'retroTap', 'holdWhileUndecided', 'holdWhileUndecidedLinger'].forEach((k) => {
            if (typeof parsed[k] === 'boolean') built[k] = parsed[k]; else delete built[k];
        });
        if (Array.isArray(parsed.holdTriggerKeyPositions) && parsed.holdTriggerKeyPositions.length > 0) built.holdTriggerKeyPositions = parsed.holdTriggerKeyPositions;
        else delete built.holdTriggerKeyPositions;
        if (idx >= 0) next.holdTaps[idx] = built; else { if (!next.holdTaps) next.holdTaps = []; next.holdTaps.push(built); }
        return next;
    }

    // Renames a hold-tap AND every place that referenced it (see findHoldTapReferences) in one
    // atomic config transform.
    function renameHoldTap(config, oldName, newName) {
        if (oldName === newName) return config;
        const next = structuredClone(config);
        const rewriteBindingTree = (node) => { if (node && typeof node === 'object') { if (node.value === oldName) node.value = newName; if (Array.isArray(node.params)) node.params.forEach(rewriteBindingTree); } };
        const rewriteNameList = (list) => { if (!Array.isArray(list)) return; for (let i = 0; i < list.length; i++) { if (list[i] === oldName) list[i] = newName; else if (list[i] && list[i].value === oldName) list[i].value = newName; } };

        (next.layers || []).forEach((layer) => (layer || []).forEach(rewriteBindingTree));
        (next.combos || []).forEach((combo) => rewriteBindingTree(combo.binding));
        (next.tapDances || []).forEach((td) => rewriteNameList(td.bindings));
        (next.macros || []).forEach((m) => (m.bindings || []).forEach(rewriteBindingTree));
        (next.modMorphs || []).forEach((mm) => (mm.cases || []).forEach((c) => rewriteBindingTree(c.binding)));
        (next.stickyKeys || []).forEach((sk) => rewriteNameList(sk.bindings));
        (next.holdTaps || []).forEach((ht) => { if (ht.name === oldName) ht.name = newName; else rewriteNameList(ht.bindings); });
        return next;
    }

    function deleteHoldTap(config, name) {
        const next = structuredClone(config);
        next.holdTaps = (next.holdTaps || []).filter((h) => h.name !== name);
        return next;
    }

    function cloneHoldTap(config, name) {
        const next = structuredClone(config);
        const src = (next.holdTaps || []).find((h) => h.name === name);
        if (!src) return { config, name: null };
        const newName = uniqueHoldTapName(next, name.replace(/^&/, '') + '_copy');
        next.holdTaps.push({ ...structuredClone(src), name: newName });
        return { config: next, name: newName };
    }

    Object.assign(GlideCore, {
        HOLD_TAP_FLAVORS, normalizeHoldTapFields,
        holdTapNames, findHoldTapReferences, uniqueHoldTapName,
        createHoldTap, updateHoldTap, renameHoldTap, deleteHoldTap, cloneHoldTap,
    });
})();
