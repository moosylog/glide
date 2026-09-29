// core/zmk/macro.js — parsing/building ZMK &macro_* behavior definitions (config.macros) and the
// CRUD/reference-safety helpers the Macro Builder UI needs on top of them.
//
// GLIDE's file-IO layer already carries `config.macros` through load/export completely untouched
// (see core/io/layoutSchema.js — `macros` is a plain passthrough `array` field) — this module
// doesn't change that contract. It adds a friendly, structured *view* onto one macro's `bindings`
// array (and a way to write a structured view back into it), the same "parse into a model a
// settings UI can bind to, build back into the exact JSON" shape as core/zmk/inputProcessors.js
// and core/behaviors/compile.js.
//
// Grounded against two real MoErgo exports with real macros already in them
// (tests/fixtures/tynstar.json — 62 real macros, mostly &macro_tap unicode-input sequences plus
// one &macro_pause_for_release press/release toggle; tests/fixtures/engrammer.json — 29 real
// macros using &macro_press/&macro_release/&macro_param_1to1/&macro_param_2to1, including macros
// that invoke *other* custom behaviors and macros as steps) and against ZMK's own docs
// (zmk.dev/docs/keymaps/behaviors/macros) for the two control behaviors neither fixture happens to
// use (&macro_wait_time, &macro_tap_time). tests/core/macro.test.js proves round-tripping both
// real files' entire `macros` arrays is lossless.
//
// IMPORTANT, unlike inputProcessors.js: a macro's `bindings` array uses the SAME shape as an
// ordinary key binding elsewhere in the file (`{ value: "&kp", params: [{ value: "A" }] }`), not
// the `{ code, params: [plain values] }` shape input-processor chains use. Confirmed against both
// real fixtures above — no format-guessing needed here.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // -- One macro "step" (one entry in a macro's `bindings` array) --
    //
    // Recognized control behaviors (ZMK docs: zmk.dev/docs/keymaps/behaviors/macros):
    //   &macro_tap / &macro_press / &macro_release   — sets the ambient mode for every behavior
    //                                                   step that follows, until changed again
    //   &macro_pause_for_release                      — splits the sequence: everything before
    //                                                   runs on press, everything after on release
    //   &macro_wait_time <ms> / &macro_tap_time <ms>  — changes wait-ms/tap-ms partway through
    //   &macro_param_1to1 / _1to2 / _2to1 / _2to2      — forwards this macro's own invocation
    //                                                   parameter into the very next step's param
    //
    // Anything else — &kp, &mo, another macro's name, any custom behavior — is a real action step
    // and is kept as the exact, untouched binding object it already is (`kind: 'behavior'`)
    // rather than re-decomposed: GLIDE already has a generic way to describe/render any binding
    // (describeBinding), so this module doesn't need a second one, and passing the object through
    // completely opaque is what guarantees a step this UI doesn't specifically recognize (a custom
    // mod-wrapper chain, a not-yet-seen control behavior) round-trips losslessly regardless.
    const MACRO_MODE_CODES = { '&macro_tap': 'tap', '&macro_press': 'press', '&macro_release': 'release' };
    const MODE_TO_CODE = { tap: '&macro_tap', press: '&macro_press', release: '&macro_release' };
    const PARAM_FORWARD_CODES = { '&macro_param_1to1': [1, 1], '&macro_param_1to2': [1, 2], '&macro_param_2to1': [2, 1], '&macro_param_2to2': [2, 2] };
    const PARAM_FORWARD_TO_CODE = { '1,1': '&macro_param_1to1', '1,2': '&macro_param_1to2', '2,1': '&macro_param_2to1', '2,2': '&macro_param_2to2' };

    function parseMacroStep(binding) {
        const value = binding && binding.value;
        if (Object.prototype.hasOwnProperty.call(MACRO_MODE_CODES, value)) {
            return { kind: 'mode', mode: MACRO_MODE_CODES[value] };
        }
        if (value === '&macro_pause_for_release') return { kind: 'pauseForRelease' };
        if (value === '&macro_wait_time') return { kind: 'waitTime', ms: Number(binding.params?.[0]?.value ?? 0) };
        if (value === '&macro_tap_time') return { kind: 'tapTime', ms: Number(binding.params?.[0]?.value ?? 0) };
        if (Object.prototype.hasOwnProperty.call(PARAM_FORWARD_CODES, value)) {
            const [from, to] = PARAM_FORWARD_CODES[value];
            return { kind: 'paramForward', from, to };
        }
        return { kind: 'behavior', binding: structuredClone(binding) };
    }

    function buildMacroStep(step) {
        switch (step.kind) {
            case 'mode': return { value: MODE_TO_CODE[step.mode] || '&macro_tap' };
            case 'pauseForRelease': return { value: '&macro_pause_for_release' };
            case 'waitTime': return { value: '&macro_wait_time', params: [{ value: Math.max(0, Number(step.ms) || 0) }] };
            case 'tapTime': return { value: '&macro_tap_time', params: [{ value: Math.max(0, Number(step.ms) || 0) }] };
            case 'paramForward': return { value: PARAM_FORWARD_TO_CODE[`${step.from},${step.to}`] || '&macro_param_1to1' };
            case 'behavior': default: return structuredClone(step.binding);
        }
    }

    const parseMacroSteps = (bindings) => (bindings || []).map(parseMacroStep);
    const buildMacroSteps = (steps) => (steps || []).map(buildMacroStep);

    // -- One whole macro definition --
    //
    // tapMs/waitMs are left `undefined` (never a fallback like 0) when the real macro object has
    // no such key at all — a real, common case (tests/fixtures/tynstar.json's `&msteams_ptt` has
    // neither field) meaning "use the device's compiled-in default," which is NOT the same thing
    // as an explicit `0`ms (also real — most of that same file's macros have `waitMs: 0`
    // explicitly). Collapsing that distinction would silently change what ships to firmware.
    function parseMacro(macro) {
        return {
            name: macro.name,
            description: macro.description || '',
            tapMs: typeof macro.tapMs === 'number' ? macro.tapMs : undefined,
            waitMs: typeof macro.waitMs === 'number' ? macro.waitMs : undefined,
            steps: parseMacroSteps(macro.bindings),
        };
    }

    function buildMacro(parsed) {
        const out = { name: parsed.name, description: parsed.description || '' };
        if (typeof parsed.tapMs === 'number') out.tapMs = parsed.tapMs;
        if (typeof parsed.waitMs === 'number') out.waitMs = parsed.waitMs;
        out.bindings = buildMacroSteps(parsed.steps);
        return out;
    }

    // Not stored anywhere in the real JSON format (no `paramCount`/`bindingCells` field on a
    // macro object in either real fixture) — inferred, display-only, from whether the macro's own
    // steps forward a 1st and/or 2nd invocation parameter. A macro using `&macro_param_2to*`
    // necessarily takes 2 params (ZMK requires declaring enough #binding-cells to satisfy the
    // highest param index actually forwarded); using only `_1to*` means 1; using neither means 0
    // (an ordinary no-parameter macro, the overwhelmingly common case in real files — 90 of the 91
    // macros across both real fixtures here take zero parameters).
    function inferMacroParamCount(parsed) {
        let max = 0;
        for (const step of parsed.steps) if (step.kind === 'paramForward') max = Math.max(max, step.from);
        return max;
    }

    // -- CRUD over config.macros, plus reference safety (rename/delete must not silently orphan
    // or break something else that names this macro) --

    const macroNames = (config) => (config?.macros || []).map((m) => m.name);

    // A macro's name can be referenced from: an ordinary key/combo binding value; a hold-tap's or
    // tap-dance's own `bindings` list (plain behavior-name strings there, not binding objects —
    // confirmed against the real fixtures' holdTaps); or another macro's own steps (this macro
    // invoked as a step of a different one — real in tests/fixtures/engrammer.json, where
    // `&mod_tab_v1_TKZ` is itself invoked as a step inside a different macro). countBehaviorUsage
    // (core/usage.js) only walks layers+combos, which is why this is its own function rather than
    // a call to it — renaming/deleting a macro needs the fuller picture or it can silently break
    // a hold-tap or another macro that names it.
    function findMacroReferences(config, name) {
        if (!config || !name) return [];
        const hits = [];
        const scanBindingTree = (node, where) => { if (node && typeof node === 'object') { if (node.value === name) hits.push(where); if (Array.isArray(node.params)) node.params.forEach((p) => scanBindingTree(p, where)); } };
        const scanNameList = (list, where) => (list || []).forEach((entry) => { if (entry === name || (entry && entry.value === name)) hits.push(where); });

        (config.layers || []).forEach((layer, li) => (layer || []).forEach((b) => scanBindingTree(b, `layer ${li}`)));
        (config.combos || []).forEach((combo, ci) => scanBindingTree(combo.binding, `combo ${ci}`));
        (config.holdTaps || []).forEach((ht) => scanNameList(ht.bindings, `hold-tap ${ht.name}`));
        (config.tapDances || []).forEach((td) => scanNameList(td.bindings, `tap-dance ${td.name}`));
        (config.macros || []).forEach((m) => { if (m.name !== name) (m.bindings || []).forEach((b) => scanBindingTree(b, `macro ${m.name}`)); });
        return hits;
    }

    function uniqueMacroName(config, desired) {
        let base = String(desired || 'my_macro').trim().replace(/^&/, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'my_macro';
        const taken = new Set([
            ...macroNames(config), ...(config?.holdTaps || []).map((b) => b.name),
            ...(config?.tapDances || []).map((b) => b.name), ...(config?.modMorphs || []).map((b) => b.name),
        ]);
        let candidate = `&${base}`, n = 2;
        while (taken.has(candidate)) candidate = `&${base}_${n++}`;
        return candidate;
    }

    // Never mutates the passed-in config — same convention as every other config-transforming
    // function in core/ (runGC, applyFlow, setTouchpadConfig, …).
    function createMacro(config, desiredName) {
        const next = structuredClone(config || { macros: [] });
        if (!Array.isArray(next.macros)) next.macros = [];
        const name = uniqueMacroName(next, desiredName || 'my_macro');
        next.macros.push({ name, description: '', bindings: [{ value: '&macro_tap' }] });
        return { config: next, name };
    }

    function updateMacro(config, name, parsed) {
        const next = structuredClone(config);
        const idx = (next.macros || []).findIndex((m) => m.name === name);
        const built = buildMacro({ ...parsed, name });
        if (idx >= 0) next.macros[idx] = built; else { if (!next.macros) next.macros = []; next.macros.push(built); }
        return next;
    }

    // Renames a macro AND every place that names it (see findMacroReferences) in one atomic
    // config transform, so a rename can never silently leave a hold-tap or another macro pointing
    // at a name that no longer exists.
    function renameMacro(config, oldName, newName) {
        if (oldName === newName) return config;
        const next = structuredClone(config);
        const rewriteBindingTree = (node) => { if (node && typeof node === 'object') { if (node.value === oldName) node.value = newName; if (Array.isArray(node.params)) node.params.forEach(rewriteBindingTree); } };
        const rewriteNameList = (list) => { if (!Array.isArray(list)) return; for (let i = 0; i < list.length; i++) { if (list[i] === oldName) list[i] = newName; else if (list[i] && list[i].value === oldName) list[i].value = newName; } };

        (next.layers || []).forEach((layer) => (layer || []).forEach(rewriteBindingTree));
        (next.combos || []).forEach((combo) => rewriteBindingTree(combo.binding));
        (next.holdTaps || []).forEach((ht) => rewriteNameList(ht.bindings));
        (next.tapDances || []).forEach((td) => rewriteNameList(td.bindings));
        (next.macros || []).forEach((m) => { if (m.name === oldName) m.name = newName; else (m.bindings || []).forEach(rewriteBindingTree); });
        return next;
    }

    function deleteMacro(config, name) {
        const next = structuredClone(config);
        next.macros = (next.macros || []).filter((m) => m.name !== name);
        return next;
    }

    function cloneMacro(config, name) {
        const next = structuredClone(config);
        const src = (next.macros || []).find((m) => m.name === name);
        if (!src) return { config, name: null };
        const newName = uniqueMacroName(next, name.replace(/^&/, '') + '_copy');
        next.macros.push({ ...structuredClone(src), name: newName });
        return { config: next, name: newName };
    }

    Object.assign(GlideCore, {
        parseMacroStep, buildMacroStep, parseMacroSteps, buildMacroSteps,
        parseMacro, buildMacro, inferMacroParamCount,
        macroNames, findMacroReferences, uniqueMacroName,
        createMacro, updateMacro, renameMacro, deleteMacro, cloneMacro,
    });
})();
