// core/keycodes/zmkMap.js — Raw ZMK keycode -> display-symbol tables and modifier-wrapper lookups.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
        const RAW_MOD_CODES = new Set(['LSHFT', 'RSHFT', 'LCTRL', 'RCTRL', 'LALT', 'RALT', 'LGUI', 'RGUI', 'MOD_LSFT', 'MOD_RSFT']);
        const ZMK_MAP = { BSPC:'⌫', RET:'↵', PG_DN:'PgDn', PG_UP:'PgUp', UP:'↑', DOWN:'↓', LEFT:'←', RIGHT:'→', ESC:'Esc', TAB:'Tab', MINUS:'-', EQUAL:'=', GRAVE:'`', BSLH:'\\', SEMI:';', SQT:"'", FSLH:'/', LBKT:'[', RBKT:']', COMMA:',', DOT:'.', SPACE:'␣', C_VOL_DN:'Vol -', C_VOL_UP:'Vol +', C_MUTE:'Mute', C_PP:'Play', C_NEXT:'Next', C_PREV:'Prev',
            // Keypad (numpad) cluster — a real MoErgo export can use either the canonical ZMK
            // name or its documented alias for the same physical key (e.g. KP_DIVIDE and
            // KP_SLASH both mean the "/" key; see https://zmk.dev/docs/keymaps/list-of-keycodes),
            // so both forms map to the same consumer-recognizable label. Kept to the plain glyph
            // actually printed on a real numpad key ("/", "*") rather than the math-class symbols
            // ("÷", "×") this table used before — display-only, doesn't change what's read/written
            // to a layout file.
            KP_EQUAL:'=', KP_EQUAL_AS400:'=', KP_COMMA:',', KP_DIVIDE:'/', KP_SLASH:'/', KP_MULTIPLY:'*', KP_ASTERISK:'*', KP_MINUS:'-', KP_SUBTRACT:'-', KP_PLUS:'+', KP_DOT:'.',
            KP_LPAR:'(', KP_LEFT_PARENTHESIS:'(', KP_RPAR:')', KP_RIGHT_PARENTHESIS:')',
            KP_NUM:'Num Lock', KP_NUMLOCK:'Num Lock', KP_NLCK:'Num Lock', KP_CLEAR:'Clear', CLEAR2:'Clear',
            NON_US_HASH:'Nuhs', NON_US_BSLH:'Nubs' };

        // Keypad digits (KP_N1.../KP_NUMBER_1... both name the same "1" key, etc.) — generated
        // rather than hand-listed since it's 10 keys x 2 names each.
        for (let d = 0; d <= 9; d++) {
            ZMK_MAP[`KP_N${d}`] = String(d);
            ZMK_MAP[`KP_NUMBER_${d}`] = String(d);
        }

        // International (Japanese-layout) and Language (Korean-layout) keys — ZMK's own docs
        // label these in the host OS's native script (e.g. INT5 is "無変換", LANG2 is "한자"),
        // which isn't something most people typing on a Glove80/Go60 would recognize. Shown here
        // as "Intl N"/"Lang N" (abbreviated to fit a canvas key; the full "International N"/
        // "Language N" wording is used in the key-picker instead — see ui/shared.js) — purely a
        // display label, the underlying INTn/LANGn code is untouched.
        for (let n = 1; n <= 9; n++) {
            ZMK_MAP[`INT${n}`] = `Intl ${n}`;
            ZMK_MAP[`INTERNATIONAL_${n}`] = `Intl ${n}`;
            ZMK_MAP[`LANG${n}`] = `Lang ${n}`;
            ZMK_MAP[`LANGUAGE_${n}`] = `Lang ${n}`;
        }

        const MOD_WRAPPER_TO_FULL = { LS: 'LSHFT', RS: 'RSHFT', LC: 'LCTRL', RC: 'RCTRL', LA: 'LALT', RA: 'RALT', LG: 'LGUI', RG: 'RGUI' };
        const FULL_TO_MOD_WRAPPER = Object.fromEntries(Object.entries(MOD_WRAPPER_TO_FULL).map(([k, v]) => [v, k]));

    Object.assign(GlideCore, { RAW_MOD_CODES, ZMK_MAP, MOD_WRAPPER_TO_FULL, FULL_TO_MOD_WRAPPER });
})();
