// core/capabilities/paramBinding.js — turns a flow's declared [[param]] values into the exact
// text-prepend jq gets in Flows4JSON's own app (see moosylog/flows4json's index.html,
// getScriptWithParams): each param becomes a `<value> as $<id> |` line stacked before the
// flow's own script body, so the script can reference `$mod_preset` etc. as bound jq variables.
//
// This is copied byte-for-byte in spirit from the real app, not reinvented, because a flow
// package is meant to be portable between Flows4JSON and GLIDE — a different binding mechanism
// would silently break every existing .flows file that assumes this exact prefix shape.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // Renders one param's current value as a jq literal, matching getScriptWithParams's rules
    // exactly: boolean -> bare true/false, number -> bare numeric text, everything else
    // (text/select) -> a double-quoted JSON string.
    const renderParamLiteral = (paramDef, rawValue) => {
        if (paramDef.type === 'boolean') return rawValue ? 'true' : 'false';
        if (paramDef.type === 'number') return String(rawValue);
        return JSON.stringify(String(rawValue ?? ''));
    };

    // paramDefs: a flow's `param` array (each { id, type, default, ... }, as parsed from its
    // [[param]] blocks). values: { [id]: rawValue } — typically straight off a form widget: a
    // missing id falls back to that param's own `default`. rawScript: the flow's `script` field.
    const buildScriptWithParams = (paramDefs, values, rawScript) => {
        const defs = paramDefs || {};
        let prefix = '';
        (paramDefs || []).forEach((p) => {
            const raw = values && Object.prototype.hasOwnProperty.call(values, p.id) ? values[p.id] : p.default;
            prefix += `${renderParamLiteral(p, raw)} as $${p.id} | \n`;
        });
        return prefix + rawScript;
    };

    Object.assign(GlideCore, { renderParamLiteral, buildScriptWithParams });
})();
