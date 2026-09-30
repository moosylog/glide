// core/keycodes/modChain.js — Compose/decompose a &kp modifier-wrapped keycode chain (e.g. LC(LS(A))).
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { MOD_WRAPPER_TO_FULL } = GlideCore;

        function unwrapModChain(node) {
            const mods = [];
            while (node && typeof node === 'object' && MOD_WRAPPER_TO_FULL[node.value] && node.params?.[0]) { mods.push(MOD_WRAPPER_TO_FULL[node.value]); node = node.params[0]; }
            const keyVal = (node && typeof node === 'object') ? node.value : node; return { mods, keyVal };
        }

        function composeKeycodeParam(baseCode, modCodes) {
            let node = { value: baseCode, params: [] };
            for (let i = modCodes.length - 1; i >= 0; i--) node = { value: modCodes[i], params: [node] };
            return node;
        }

    Object.assign(GlideCore, { unwrapModChain, composeKeycodeParam });
})();
