// core/zmk/naming.js — GLIDE's behavior-naming convention and ownership description.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
        const GLIDE_HT_PREFIX = '&GLIDE_ht_';
        const GLIDE_MM_PREFIX = '&GLIDE_mm_';
        const GLIDE_TD_PREFIX = '&GLIDE_td_';
        const GLIDE_BEHAVIOR_DESCRIPTION = 'GLIDE-generated and controlled. Renaming or removing this behavior will break its GLIDE correlation.';

        const isGlideHtName = (v) => typeof v === 'string' && v.startsWith(GLIDE_HT_PREFIX);
        const isGlideMmName = (v) => typeof v === 'string' && v.startsWith(GLIDE_MM_PREFIX);
        // Tap-dance recognition stays intentionally broad — any &td_* name is treated as a decomposable
        // tap-dance whether GLIDE made it or not (pre-existing behavior, unrelated to GLIDE's own naming);
        // the addition here just also catches GLIDE's &GLIDE_td_ prefix, which doesn't start with &td_.
        const isRecognizedTdName = (v) => typeof v === 'string' && (v.startsWith('&td_') || v.startsWith(GLIDE_TD_PREFIX));
        const stripGlideHtPrefix = (v) => v.slice(GLIDE_HT_PREFIX.length);
        const stripGlideMmPrefix = (v) => v.slice(GLIDE_MM_PREFIX.length);
        const stripTdPrefix = (v) => v.startsWith(GLIDE_TD_PREFIX) ? v.slice(GLIDE_TD_PREFIX.length) : v.replace('&td_', '').replace('auto_', '');

    Object.assign(GlideCore, { GLIDE_HT_PREFIX, GLIDE_MM_PREFIX, GLIDE_TD_PREFIX, GLIDE_BEHAVIOR_DESCRIPTION, isGlideHtName, isGlideMmName, isRecognizedTdName, stripGlideHtPrefix, stripGlideMmPrefix, stripTdPrefix });
})();
