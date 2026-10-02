// core/usage.js — Behavior-usage counting and GLIDE-native-vs-custom classification.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { isGlideHtName, isGlideMmName, isRecognizedTdName } = GlideCore;

        const countBehaviorUsage = (config, behaviorName) => {
            if (!config || !behaviorName) return 0;
            let count = 0;
            const scan = (node) => {
                if (!node) return;
                if (typeof node === 'object') {
                    if (node.value === behaviorName) count++;
                    if (Array.isArray(node.params)) node.params.forEach(scan);
                }
            };
            (config.layers || []).forEach(layer => (layer || []).forEach(scan));
            (config.combos || []).forEach(combo => scan(combo.binding));
            return count;
        };

        // Same walk as countBehaviorUsage, but for one specific layer, returning WHICH key
        // indices reference behaviorName rather than just how many times. Feeds the virtual
        // keyboard's hover-to-highlight reverse-selection (GLIDE UX pass — see ARCHITECTURE.md
        // §7/README.md's "Status" section): hovering a macro/sticky-key/mod-morph/hold-tap/
        // tap-dance row lights up every key on the current layer that uses it.
        const findBehaviorUsageKeys = (config, layerIdx, behaviorName) => {
            if (!config || !behaviorName) return [];
            const layer = (config.layers || [])[layerIdx];
            if (!layer) return [];
            const usesIt = (node) => {
                if (!node || typeof node !== 'object') return false;
                if (node.value === behaviorName) return true;
                if (Array.isArray(node.params)) return node.params.some(usesIt);
                return false;
            };
            const keys = [];
            layer.forEach((binding, keyIdx) => { if (usesIt(binding)) keys.push(keyIdx); });
            return keys;
        };

        // True for behavior names GLIDE itself understands structurally (native ZMK primitives,
        // or GLIDE's own auto_/td_ synthesized names). Anything else is a hand-authored custom
        // behavior that must go through "Detach & Customize" before the slot model can rewrite it.
        const isGlideNativeBindingValue = (val) => {
            if (!val) return true;
            const NATIVE = ['&kp', '&mt', '&lt', '&trans', '&none', '&magic', '&lower', '&mo', '&to', '&tog', '&sl', '&layer', '&bt', '&out', '&rgb_ug', '&ext_power', '&sk', 'Custom'];
            if (NATIVE.includes(val)) return true;
            return isGlideHtName(val) || isGlideMmName(val) || isRecognizedTdName(val);
        };

    Object.assign(GlideCore, { countBehaviorUsage, findBehaviorUsageKeys, isGlideNativeBindingValue });
})();
