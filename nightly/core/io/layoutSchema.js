// core/io/layoutSchema.js — declarative shape of a GLIDE/MoErgo layout JSON, and a validator
// over it. This is the top of the "abstract file IO" work: today `loadLayoutData` in glide.html
// only checks `Array.isArray(data.layers)` before handing raw JSON straight to the rest of the
// app; everything downstream (runGC, shiftLayerPointers, countBehaviorUsage, ...) then assumes
// a shape that was never actually verified, so a malformed file fails confusingly deep inside
// app logic instead of with a clear message at the load boundary.
//
// Deliberately permissive, not a strict allowlist: real layout files (see tests/fixtures/) carry
// many fields GLIDE never touches — uuid, custom_devicetree, config_parameters, inputListeners,
// stickyKeys, and more, from MoErgo's own export format. This schema validates the handful of
// fields GLIDE's own logic actually depends on and leaves everything else alone; it must never
// be used to reconstruct the object from a known-fields allowlist, since that would silently
// drop data on every load/export round-trip — exactly the kind of corruption the rest of this
// project has been careful to avoid with hand-authored behaviors.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // Fields GLIDE's own logic reads or writes. `required: true` fields must exist and have the
    // right basic shape for the file to be loadable at all; everything else is optional — its
    // absence is normal (a fresh/foreign layout may simply have no combos yet), but if PRESENT
    // it must be the right JS type or downstream array/object methods will throw.
    const LAYOUT_SCHEMA_FIELDS = [
        { key: 'layers', type: 'array', required: true, itemType: 'array', description: 'one array of key bindings per layer' },
        { key: 'layer_names', type: 'array', itemType: 'string', description: 'display name per layer' },
        { key: 'holdTaps', type: 'array', description: 'GLIDE/hand-authored hold-tap behaviors' },
        { key: 'tapDances', type: 'array', description: 'GLIDE/hand-authored tap-dance behaviors' },
        { key: 'modMorphs', type: 'array', description: 'GLIDE/hand-authored mod-morph behaviors' },
        { key: 'combos', type: 'array', description: 'combo definitions' },
        { key: 'macros', type: 'array', description: 'macro definitions' },
        { key: 'keyboard', type: 'string', description: 'board id, e.g. "glove80" or "go60"' },
    ];

    const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

    // Checks `raw` against LAYOUT_SCHEMA_FIELDS. Returns { valid, errors } — errors is a list of
    // short human-readable strings (never throws). `valid` is true iff there are zero errors from
    // a REQUIRED field; a wrong-typed OPTIONAL field is still reported as an error (it will break
    // something downstream if left in), but see loadLayout.js for how these are actually used —
    // this function only describes the shape, it doesn't decide what to do about violations.
    const validateLayout = (raw) => {
        const errors = [];
        if (typeOf(raw) !== 'object') {
            return { valid: false, errors: [`Expected a JSON object at the top level, got ${typeOf(raw)}`] };
        }

        LAYOUT_SCHEMA_FIELDS.forEach((field) => {
            const present = Object.prototype.hasOwnProperty.call(raw, field.key);
            if (!present) {
                if (field.required) errors.push(`Missing required "${field.key}" (expected ${field.description})`);
                return;
            }
            const val = raw[field.key];
            if (typeOf(val) !== field.type) {
                errors.push(`"${field.key}" should be a${field.type === 'array' ? 'n' : ''} ${field.type}, got ${typeOf(val)}`);
                return;
            }
            if (field.type === 'array' && field.itemType) {
                const badIdx = val.findIndex((item) => typeOf(item) !== field.itemType);
                if (badIdx !== -1) errors.push(`"${field.key}[${badIdx}]" should be a${field.itemType === 'array' ? 'n' : ''} ${field.itemType}, got ${typeOf(val[badIdx])}`);
            }
        });

        return { valid: errors.length === 0, errors };
    };

    Object.assign(GlideCore, { LAYOUT_SCHEMA_FIELDS, validateLayout });
})();
