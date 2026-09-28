// core/gc.js — Garbage-collects GLIDE-owned holdTaps/modMorphs/tapDances that are no longer referenced.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { isGlideHtName, isGlideMmName, isRecognizedTdName } = GlideCore;

        const runGC = (newConfig) => {
            const usedNames = new Set();
            const isTrackedName = (v) => isGlideHtName(v) || isRecognizedTdName(v) || isGlideMmName(v);
            const extractNames = (node) => {
                if (!node) return;
                if (typeof node === 'object') {
                    if (node.value && typeof node.value === 'string' && isTrackedName(node.value)) usedNames.add(node.value);
                    if (Array.isArray(node.params)) node.params.forEach(extractNames); if (Array.isArray(node.bindings)) node.bindings.forEach(extractNames); if (Array.isArray(node.cases)) node.cases.forEach(c => extractNames(c.binding));
                }
            };
            newConfig.layers?.forEach(layer => layer.forEach(extractNames)); newConfig.combos?.forEach(combo => extractNames(combo.binding));
            let size;
            do {
                size = usedNames.size;
                ['holdTaps', 'tapDances', 'modMorphs'].forEach(arrKey => {
                    (newConfig[arrKey] || []).forEach(beh => {
                        if (usedNames.has(beh.name)) {
                            if (beh.bindings) beh.bindings.forEach(b => { if (typeof b === 'object') extractNames(b); else if (typeof b === 'string' && isTrackedName(b)) usedNames.add(b); });
                            if (beh.cases) beh.cases.forEach(c => extractNames(c.binding));
                        }
                    });
                });
            } while (usedNames.size > size);
            if (newConfig.holdTaps) newConfig.holdTaps = newConfig.holdTaps.filter(h => !isGlideHtName(h.name) || usedNames.has(h.name));
            if (newConfig.tapDances) newConfig.tapDances = newConfig.tapDances.filter(t => !isRecognizedTdName(t.name) || usedNames.has(t.name));
            if (newConfig.modMorphs) newConfig.modMorphs = newConfig.modMorphs.filter(m => !isGlideMmName(m.name) || usedNames.has(m.name));
            if (newConfig.holdTaps && newConfig.holdTaps.length === 0) delete newConfig.holdTaps; if (newConfig.tapDances && newConfig.tapDances.length === 0) delete newConfig.tapDances; if (newConfig.modMorphs && newConfig.modMorphs.length === 0) delete newConfig.modMorphs;
            return newConfig;
        };

    Object.assign(GlideCore, { runGC });
})();
