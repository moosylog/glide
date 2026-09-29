// core/behaviors/registry.js — lookup utilities over core/behaviors/schemas.js's BehaviorSchemas.
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { BehaviorSchemas } = GlideCore;

    const getBehaviorSchema = (id) => BehaviorSchemas[id];

    const getAllBehaviorSchemas = () => Object.values(BehaviorSchemas);

    // The defaults a brand-new instance of this behavior should start with — same values
    // core/slots.js's makeHoldTap/makeTapDance already hardcode, sourced from one place now.
    const getDefaultValues = (id) => {
        const schema = BehaviorSchemas[id];
        if (!schema) return undefined;
        const defaults = {};
        schema.properties.forEach((p) => { defaults[p.key] = p.default; });
        return defaults;
    };

    Object.assign(GlideCore, { getBehaviorSchema, getAllBehaviorSchemas, getDefaultValues });
})();
