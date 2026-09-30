// core/zmk/combos.js — ZMK combo constraints, as data (same pattern as
// core/zmk/layerPointers.js's LAYER_POINTER_BEHAVIORS): a fact about the firmware, not a UI
// choice, so it lives in core/ and is reusable anywhere a combo gets built or validated.
//
// MAX_COMBO_KEYS: ZMK's Kconfig CONFIG_ZMK_COMBOS_MAX_KEYS_PER_COMBO defaults to 4 — a combo
// with more key-positions than this can't actually be built by the firmware. GLIDE enforces
// this at the point of adding a key to a combo (glide.html's handleCanvasKeySelect), rather
// than only catching it on export, so the user finds out immediately, not after generating.
//
// comboHasBinding/findDuplicateCombos: two real gaps found by actually using the Combos editor
// — nothing stopped a combo from being created, given key positions, and left with its default
// `&none` binding (a combo that does nothing when triggered), and nothing stopped two different
// combos from ending up with the exact same set of key positions on overlapping layers (ZMK's
// behavior for two combos that can both trigger off the same physical press is undefined/
// order-dependent, never useful). Both are validated as data here, not baked into one UI call
// site, so the sidebar list (a live badge on each combo) and the pre-export check (glide.html's
// handleExport) can both use the same real answer instead of two hand-rolled checks drifting
// apart.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    const MAX_COMBO_KEYS = 4;

    // A combo bound to `&none` (GLIDE's own default for a freshly created combo) or with no
    // `binding` at all fires and does nothing — never a real, intentional end state.
    function comboHasBinding(combo) {
        const binding = combo && combo.binding;
        return !!(binding && binding.value && binding.value !== '&none');
    }

    // Order-independent equality: [3, 7] and [7, 3] are the same combo trigger as far as the
    // firmware (and the user) is concerned — key positions are stored in whatever order they
    // were pressed while building the combo, not sorted.
    function keyPositionSetsEqual(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        const sa = [...a].sort((x, y) => x - y);
        const sb = [...b].sort((x, y) => x - y);
        return sa.every((v, i) => v === sb[i]);
    }

    // Two combos can only actually collide if there's a layer where both are live. `layers`
    // missing, empty, or containing the `-1` "all layers" sentinel (see layerShift.js) all mean
    // "every layer" — so either combo naming -1, or any shared explicit layer index, overlaps.
    function comboLayerScopesOverlap(a, b) {
        const la = (a && a.layers) || [-1];
        const lb = (b && b.layers) || [-1];
        if (la.length === 0 || lb.length === 0 || la.includes(-1) || lb.includes(-1)) return true;
        return la.some((l) => lb.includes(l));
    }

    // Returns one entry per (comboIdx, otherComboIdx) pair whose key positions are identical
    // AND whose layer scopes overlap — i.e. an actual, live conflict, not just two combos that
    // happen to share a key/combo trigger on layers that never both apply. A combo with zero key
    // positions (not built yet) can't conflict with anything, so those are skipped rather than
    // every empty combo flagging every other empty combo.
    function findDuplicateCombos(combos) {
        const list = combos || [];
        const conflicts = [];
        for (let i = 0; i < list.length; i++) {
            const keysI = list[i].keyPositions || list[i].key_positions || [];
            if (keysI.length === 0) continue;
            for (let j = 0; j < list.length; j++) {
                if (i === j) continue;
                const keysJ = list[j].keyPositions || list[j].key_positions || [];
                if (keysJ.length === 0) continue;
                if (keyPositionSetsEqual(keysI, keysJ) && comboLayerScopesOverlap(list[i], list[j])) {
                    conflicts.push({ idx: i, conflictsWithIdx: j });
                }
            }
        }
        return conflicts;
    }

    Object.assign(GlideCore, { MAX_COMBO_KEYS, comboHasBinding, keyPositionSetsEqual, comboLayerScopesOverlap, findDuplicateCombos });
})();
