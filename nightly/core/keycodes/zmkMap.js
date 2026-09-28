// core/keycodes/zmkMap.js — Raw ZMK keycode -> display-symbol tables and modifier-wrapper lookups.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
        const RAW_MOD_CODES = new Set(['LSHFT', 'RSHFT', 'LCTRL', 'RCTRL', 'LALT', 'RALT', 'LGUI', 'RGUI', 'MOD_LSFT', 'MOD_RSFT']);
        const ZMK_MAP = { BSPC:'⌫', RET:'↵', PG_DN:'PgDn', PG_UP:'PgUp', UP:'↑', DOWN:'↓', LEFT:'←', RIGHT:'→', ESC:'Esc', TAB:'Tab', MINUS:'-', EQUAL:'=', GRAVE:'`', BSLH:'\\', SEMI:';', SQT:"'", FSLH:'/', LBKT:'[', RBKT:']', COMMA:',', DOT:'.', SPACE:'␣', C_VOL_DN:'Vol -', C_VOL_UP:'Vol +', C_MUTE:'Mute', C_PP:'Play', C_NEXT:'Next', C_PREV:'Prev', KP_EQUAL:'=', KP_COMMA:',', KP_DIVIDE:'÷', KP_MULTIPLY:'×', KP_MINUS:'-', KP_PLUS:'+', KP_DOT:'.', NON_US_HASH:'Nuhs', NON_US_BSLH:'Nubs' };
        const MOD_WRAPPER_TO_FULL = { LS: 'LSHFT', RS: 'RSHFT', LC: 'LCTRL', RC: 'RCTRL', LA: 'LALT', RA: 'RALT', LG: 'LGUI', RG: 'RGUI' };
        const FULL_TO_MOD_WRAPPER = Object.fromEntries(Object.entries(MOD_WRAPPER_TO_FULL).map(([k, v]) => [v, k]));

    Object.assign(GlideCore, { RAW_MOD_CODES, ZMK_MAP, MOD_WRAPPER_TO_FULL, FULL_TO_MOD_WRAPPER });
})();
