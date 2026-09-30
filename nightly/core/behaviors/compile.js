// core/behaviors/compile.js — coerces/validates raw widget input against a behavior schema
// (core/behaviors/schemas.js) and produces sanitized values safe to write straight onto a
// GLIDE behavior object (holdTaps[i], tapDances[i], ...), the same shape updateBehaviorSetting
// already assigns with `beh[key] = val`. This is the "compiler" half of the schema-driven
// engine: schemas.js says what a property IS, this says how a form value becomes a valid one.
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { getBehaviorSchema } = GlideCore;

    const clamp = (n, min, max) => {
        if (typeof min === 'number') n = Math.max(min, n);
        if (typeof max === 'number') n = Math.min(max, n);
        return n;
    };

    // Coerces one raw value (typically straight off a DOM input/select) to what its
    // PropertyDefinition declares, falling back to the property's own default whenever the
    // raw value can't be made valid — never throws, never returns undefined/NaN.
    const coercePropertyValue = (propDef, rawValue) => {
        if (!propDef) return rawValue;
        switch (propDef.type) {
            case 'number': {
                const n = typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10);
                if (Number.isNaN(n)) return propDef.default;
                return clamp(n, propDef.min, propDef.max);
            }
            case 'boolean':
                return !!rawValue;
            case 'enum': {
                const valid = (propDef.options || []).some((o) => o.value === rawValue);
                return valid ? rawValue : propDef.default;
            }
            case 'string':
                return typeof rawValue === 'string' ? rawValue : String(rawValue ?? propDef.default ?? '');
            default:
                // 'array' (e.g. holdTriggerKeyPositions) and anything else pass through as-is —
                // those widgets (keyboard_picker) manage their own array mutation.
                return rawValue;
        }
    };

    // Coerces a single named property's raw value against a registered schema by id.
    // Returns rawValue unchanged if the schema or property isn't found (never blocks a write).
    const compileBehaviorProperty = (schemaId, key, rawValue) => {
        const schema = getBehaviorSchema(schemaId);
        const propDef = schema?.properties.find((p) => p.key === key);
        return coercePropertyValue(propDef, rawValue);
    };

    // Coerces a whole values object against a schema, filling in any property the object is
    // missing with its default. Used to sanitize a full behavior struct (e.g. on load, or
    // before compiling to output) rather than one field at a time.
    const compileBehaviorProperties = (schemaId, values) => {
        const schema = getBehaviorSchema(schemaId);
        if (!schema) return { ...values };
        const out = {};
        schema.properties.forEach((p) => {
            out[p.key] = Object.prototype.hasOwnProperty.call(values || {}, p.key)
                ? coercePropertyValue(p, values[p.key])
                : p.default;
        });
        return out;
    };

    Object.assign(GlideCore, { coercePropertyValue, compileBehaviorProperty, compileBehaviorProperties });
})();
