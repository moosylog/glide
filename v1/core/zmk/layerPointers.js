// core/zmk/layerPointers.js — The set of ZMK behaviors that carry a layer index as their first param.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
        const LAYER_POINTER_BEHAVIORS = new Set(['&mo', '&to', '&tog', '&sl', '&lt', '&layer']);

    Object.assign(GlideCore, { LAYER_POINTER_BEHAVIORS });
})();
