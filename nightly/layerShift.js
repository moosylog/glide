// core/layerShift.js — Re-indexes every layer-pointer reference (native and nested inside custom behaviors) on layer insert/delete/move.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { LAYER_POINTER_BEHAVIORS } = GlideCore;

        const shiftLayerPointers = (config, shiftType, targetIdx, newIdx = null) => {
            const remapVal = (val) => {
                if (shiftType === 'insert') return val >= targetIdx ? val + 1 : val;
                if (shiftType === 'delete') {
                    if (val === targetIdx) return -1;
                    return val > targetIdx ? val - 1 : val;
                }
                if (shiftType === 'move') {
                    if (val === targetIdx) return newIdx;
                    if (targetIdx < newIdx && val > targetIdx && val <= newIdx) return val - 1;
                    if (targetIdx > newIdx && val >= newIdx && val < targetIdx) return val + 1;
                    return val;
                }
                return val;
            };

            // Remaps the layer index on a binding that IS a layer-pointer (&mo/&lt/etc directly),
            // or that WRAPS one — e.g. a synthesized &GLIDE_ht_* hold-tap whose hold-side is a layer
            // pointer, where GLIDE always flattens the hold's param onto this outer binding's
            // params[0]. Without this second case, a layer delete/move/insert silently leaves the
            // embedded index stale whenever the tap-side isn't a plain &kp (so it never collapsed
            // to a native &lt).
            const remapDirectBinding = (binding) => {
                if (!binding) return;
                let isLayerPointer = LAYER_POINTER_BEHAVIORS.has(binding.value);
                if (!isLayerPointer && typeof binding.value === 'string') {
                    const ht = (config.holdTaps || []).find(h => h.name === binding.value);
                    if (ht && ht.bindings && LAYER_POINTER_BEHAVIORS.has(ht.bindings[0])) isLayerPointer = true;
                }
                if (!isLayerPointer) return;
                const p = binding.params?.[0];
                if (!p || p.value === undefined || p.value === null) return;
                let val = parseInt(p.value, 10);
                if (isNaN(val)) return;
                let newVal = remapVal(val);
                if (newVal === -1) {
                    binding.value = '&none'; binding.params = [];
                } else {
                    p.value = typeof p.value === 'string' ? String(newVal) : newVal;
                }
            };

            // Recurses into any mod-morph/tap-dance definition referenced by name — GLIDE's own
            // auto-named ones and arbitrary hand-authored custom names alike — since both carry
            // fully self-contained nested binding objects that can themselves hide a layer pointer.
            // Shared definitions are processed at most once per pass so a behavior referenced by
            // several keys doesn't get its layer index shifted multiple times.
            const processedNames = new Set();
            const remapNestedBehavior = (binding) => {
                if (!binding || typeof binding.value !== 'string') return;
                remapDirectBinding(binding);
                if (processedNames.has(binding.value)) return;
                const mm = (config.modMorphs || []).find(m => m.name === binding.value);
                const td = (config.tapDances || []).find(t => t.name === binding.value);
                if (mm || td) {
                    processedNames.add(binding.value);
                    if (mm && mm.cases) mm.cases.forEach(c => remapNestedBehavior(c.binding));
                    if (td && td.bindings) td.bindings.forEach(b => remapNestedBehavior(b));
                }
            };

            config.layers.forEach(layer => {
                (layer || []).forEach(binding => remapNestedBehavior(binding));
            });

            if (config.combos) {
                config.combos.forEach(combo => {
                    remapNestedBehavior(combo.binding);
                    if (!combo.layers) return;
                    combo.layers = [...new Set(combo.layers.map(remapVal).filter(v => v !== -1))];
                });
            }
        };

    Object.assign(GlideCore, { shiftLayerPointers });
})();
