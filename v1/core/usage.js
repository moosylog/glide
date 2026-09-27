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

        // True for behavior names GLIDE itself understands structurally (native ZMK primitives,
        // or GLIDE's own auto_/td_ synthesized names). Anything else is a hand-authored custom
        // behavior that must go through "Detach & Customize" before the slot model can rewrite it.
        const isGlideNativeBindingValue = (val) => {
            if (!val) return true;
            const NATIVE = ['&kp', '&mt', '&lt', '&trans', '&none', '&magic', '&mo', '&to', '&tog', '&sl', '&layer', '&bt', '&out', '&rgb_ug', '&ext_power', '&sk', 'Custom'];
            if (NATIVE.includes(val)) return true;
            return isGlideHtName(val) || isGlideMmName(val) || isRecognizedTdName(val);
        };

    Object.assign(GlideCore, { countBehaviorUsage, isGlideNativeBindingValue });
})();
