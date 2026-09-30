// core/behaviors/schemas.js — declarative behavior-property schemas.
//
// This is the schema-driven behavior engine: instead of hardcoding each behavior's settings
// UI in glide.html's JSX (one bespoke block per behavior type), a behavior's editable
// properties are described once, here, as plain data. A generic renderer (DynamicBehaviorForm)
// and a generic compiler (core/behaviors/compile.js) both read from this same schema, so adding
// or tuning a property is a data change, not a UI change.
//
// Deliberately plain JS objects, not TOML/JSON-on-disk: GLIDE has no build step (glide.html
// still runs through Babel Standalone's in-browser JSX transform), so a schema format needing
// its own parser or a bundler to load would either need fetching+parsing at runtime for no real
// benefit here, or force a toolchain migration bundled invisibly into this feature. Plain JS
// objects load exactly like every other core/*.js module and stay testable with Vitest under
// the node environment, no DOM or build step required.
//
// Scope note: only hold_tap and tap_dance are given a flat `properties` list here, because their
// real shape (see core/slots.js's makeHoldTap/makeTapDance) IS flat key-value settings. mod_morph
// is registered for consistency (so getAllBehaviorSchemas() lists it, and future tooling like a
// capability marketplace can enumerate all three), but its actual editable surface is a list of
// per-mod-combination "cases" with their own bindings — not representable as flat properties
// without a richer schema shape (properties-with-array-of-objects) this version doesn't define.
// Its settings panel in glide.html stays hand-built until that shape exists; the schema's empty
// `properties: []` is intentional, not a stub bug.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // Defaults below match makeHoldTap/makeTapDance in core/slots.js exactly — this schema
    // describes the real objects GLIDE already creates, not a separate idealized shape.
    const BehaviorSchemas = {
        hold_tap: {
            schema_version: 1,
            id: 'hold_tap',
            name: 'Hold-Tap',
            zmk_behavior: 'zmk,behavior-hold-tap',
            description: 'Triggers one action on tap, and another action on hold.',
            ui: { category: 'Advanced', icon: 'layers-hold' },
            properties: [
                {
                    key: 'flavor', label: 'Flavor Strategy', type: 'enum', default: 'tap-preferred', widget: 'select',
                    description: 'Determines how hold vs tap decisions are resolved.',
                    options: [
                        { value: 'tap-preferred', label: 'Tap Preferred' },
                        { value: 'hold-preferred', label: 'Hold Preferred' },
                        { value: 'balanced', label: 'Balanced' },
                        { value: 'tap-unless-interrupted', label: 'Tap Unless Interrupted' },
                    ],
                },
                {
                    key: 'tappingTermMs', label: 'Tapping Term', type: 'number', default: 200, widget: 'number_input',
                    min: 0, max: 1000, step: 10, unit: 'ms',
                    description: 'Time window to evaluate tap vs hold.',
                },
                {
                    key: 'quickTapMs', label: 'Quick Tap', type: 'number', default: -1, widget: 'number_input',
                    min: -1, max: 1000, step: 10, unit: 'ms',
                    description: 'Repeat the tap behavior if double-tapped within this timeframe (-1 to disable).',
                },
                {
                    key: 'requirePriorIdleMs', label: 'Require Prior Idle', type: 'number', default: 0, widget: 'number_input',
                    min: -1, max: 1000, step: 10, unit: 'ms', advanced: true,
                    description: 'Only trigger hold if no other key was pressed within this timeframe (-1 to disable).',
                },
                {
                    key: 'retroTap', label: 'Retro Tap', type: 'boolean', default: false, widget: 'toggle',
                    description: 'If the hold action never activated, send the tap action on release instead.',
                },
                {
                    key: 'holdTriggerOnRelease', label: 'Trigger on Release', type: 'boolean', default: false, widget: 'toggle',
                    description: 'Evaluate the hold decision when the key is released rather than while held.',
                },
                {
                    key: 'holdWhileUndecided', label: 'Hold While Undecided', type: 'boolean', default: false, widget: 'toggle', advanced: true,
                    description: 'Activate the hold action while the decision is pending.',
                },
                {
                    key: 'holdWhileUndecidedLinger', label: 'Hold While Undecided (Linger)', type: 'boolean', default: false, widget: 'toggle', advanced: true,
                    description: 'Keep the hold action active until the tap action ends.',
                },
                {
                    // Not `advanced` — this was always visible in the original hand-built panel
                    // (a key part of tuning shared hold-taps), so hiding it behind the Advanced
                    // accordion now would be a real UX regression, not just a cosmetic reshuffle.
                    key: 'holdTriggerKeyPositions', label: 'Hold Trigger Keys', type: 'array', default: [], widget: 'keyboard_picker',
                    description: 'Click the keys below that should trigger the HOLD action when rolled over.',
                },
            ],
        },

        tap_dance: {
            schema_version: 1,
            id: 'tap_dance',
            name: 'Tap-Dance',
            zmk_behavior: 'zmk,behavior-tap-dance',
            description: 'Cycles through a sequence of bindings on repeated taps within a timing window.',
            ui: { category: 'Advanced', icon: 'tap-dance' },
            properties: [
                {
                    key: 'tappingTermMs', label: 'Tapping Term', type: 'number', default: 200, widget: 'number_input',
                    min: 0, max: 1000, step: 10, unit: 'ms',
                    description: 'Time window to register the next tap in the sequence.',
                },
            ],
        },

        mod_morph: {
            schema_version: 1,
            id: 'mod_morph',
            name: 'Mod-Morph',
            zmk_behavior: 'zmk,behavior-mod-morph',
            description: 'Switches its output binding based on which mod keys are held.',
            ui: { category: 'Advanced', icon: 'mod-morph' },
            // See file header — cases (each with its own mods + binding) aren't flat properties.
            properties: [],
        },
    };

    Object.assign(GlideCore, { BehaviorSchemas });
})();
