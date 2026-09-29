// core/zmk/combos.js — ZMK combo constraints, as data (same pattern as
// core/zmk/layerPointers.js's LAYER_POINTER_BEHAVIORS): a fact about the firmware, not a UI
// choice, so it lives in core/ and is reusable anywhere a combo gets built or validated.
//
// MAX_COMBO_KEYS: ZMK's Kconfig CONFIG_ZMK_COMBOS_MAX_KEYS_PER_COMBO defaults to 4 — a combo
// with more key-positions than this can't actually be built by the firmware. GLIDE enforces
// this at the point of adding a key to a combo (glide.html's handleCanvasKeySelect), rather
// than only catching it on export, so the user finds out immediately, not after generating.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    const MAX_COMBO_KEYS = 4;

    Object.assign(GlideCore, { MAX_COMBO_KEYS });
})();
