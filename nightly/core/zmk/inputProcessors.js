// core/zmk/inputProcessors.js — parsing/building the ZMK "input processor" chains that
// configure a pointing device (Go60's two Cirque trackpads: LH at key index 60, RH at 61).
//
// GLIDE's file-IO layer already carries `config.inputListeners` through load/export completely
// untouched (see core/io/layoutSchema.js's header comment) — this module doesn't change that
// contract at all. It just adds a friendly, structured *view* onto one listener's chain (and a
// way to write a structured view back into it), the same shape as core/behaviors/compile.js's
// relationship to a hold-tap's raw bindings: parse into something a settings UI can bind to,
// serialize back into the exact devicetree-ish JSON MoErgo's firmware/config expects.
//
// IMPORTANT: this corner of the layout format is encoded differently from every ordinary key
// binding elsewhere in the file. A binding is `{ value: "&kp", params: [{ value: "A" }] }`, but
// an input-processor/listener entry is `{ code: "&zip_xy_scaler", params: [3, 1] }` — a `code`
// field (not `value`) and *plain* params (bare numbers/strings/arrays, not `{ value }`-wrapped
// objects). Confirmed against a real MoErgo Go60 export (tests/fixtures/go60-touchpads.json) —
// this module follows that shape exactly, not the binding shape used elsewhere.
//
// Grounded against ZMK's own docs (zmk.dev/docs/keymaps/input-processors), not guessed — see
// the processor notes inline below. tests/core/inputProcessors.test.js proves round-tripping the
// real fixture is lossless.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // Go60's two round key positions (see core/geometry/go60.js's GO60_ROUND_LEFT/mirror) are
    // the physical trackpads. Glove80 has no touchpad positions in GLIDE's geometry model, so
    // this map is deliberately Go60-only for now.
    const TOUCHPAD_LISTENER_CODE_BY_INDEX = { 60: '&cirque_lh_listener', 61: '&cirque_rh_listener' };
    const TOUCHPAD_LABEL_BY_INDEX = { 60: 'Left Touchpad', 61: 'Right Touchpad' };

    const isTouchpadIndex = (index) => Object.prototype.hasOwnProperty.call(TOUCHPAD_LISTENER_CODE_BY_INDEX, index);

    // -- One processor chain (a listener's base `inputProcessors`, or one of its `nodes`) --
    //
    // Known processors (ZMK docs: zmk.dev/docs/keymaps/input-processors):
    //   &zip_xy_scaler <mult> <div>        — scales movement by mult/div (Scaler processor)
    //   &zip_xy_transform [[flags]]        — INPUT_TRANSFORM_X_INVERT / _Y_INVERT / _XY_SWAP
    //   &zip_xy_to_scroll_mapper           — remaps X/Y movement events into scroll events
    //   &zip_click_to_<target>_mapper      — remaps a tap/click to a different mouse button
    //                                        (MoErgo board presets built on ZMK's generic Code
    //                                        Mapper processor — see CLICK_MAPPER_CODE_BY_TARGET)
    //   &zip_temp_layer <layer> <ms>       — activates a layer while pointer events keep coming
    //
    // Anything else found in a chain (a per-axis &zip_x_scaler/&zip_y_scaler, a custom mapper,
    // duplicate/unusual entries, …) is kept in `extra` and re-emitted unchanged rather than
    // dropped — an advanced hand-written chain never gets silently mangled by opening this UI.
    //
    // Click-mapper targets: only 'right' (&zip_click_to_right_click_mapper) and 'button4'
    // (&zip_click_to_button_4_click_mapper) are confirmed against real MoErgo Go60 exports (see
    // tests/fixtures/go60-touchpads.json and go60-touchpads-clickmap.json). 'middle' and
    // 'button5' follow the same naming pattern MoErgo uses for the confirmed two, but are NOT
    // independently verified — a chain read back out of a file using one of those two codes is
    // still handled correctly either way (round-trips byte-identical, confirmed by codes as
    // written), it's only *writing* a brand-new 'middle'/'button5' mapping from the UI that rests
    // on the inferred name rather than a confirmed one.
    const CLICK_MAPPER_CODE_BY_TARGET = {
        right: '&zip_click_to_right_click_mapper',
        middle: '&zip_click_to_middle_click_mapper', // inferred from the confirmed naming pattern
        button4: '&zip_click_to_button_4_click_mapper',
        button5: '&zip_click_to_button_5_click_mapper', // inferred from the confirmed naming pattern
    };
    const CLICK_MAPPER_TARGET_BY_CODE = Object.fromEntries(
        Object.entries(CLICK_MAPPER_CODE_BY_TARGET).map(([target, code]) => [code, target])
    );
    const CLICK_TARGET_LABELS = {
        left: 'Left Click',
        right: 'Right Click',
        middle: 'Middle Click',
        button4: 'Button #4 (Backward)',
        button5: 'Button #5 (Forward)',
    };
    // Targets whose devicetree name is inferred rather than confirmed against a real export —
    // the UI uses this to show a small "unverified" hint next to these two options.
    const UNVERIFIED_CLICK_TARGETS = ['middle', 'button5'];

    const DEFAULT_CHAIN = () => ({
        multiplier: 1, divisor: 1, disabled: false,
        flipX: false, flipY: false, swapped: false, extraFlags: [],
        mode: 'movement', clickTarget: 'left', // 'left' means "no click mapper" (device default)
        tempLayer: null, // { layer, timeoutMs } | null
        extra: [],
    });

    function parseChain(inputProcessors) {
        const model = DEFAULT_CHAIN();
        for (const proc of (inputProcessors || [])) {
            const code = proc && proc.code;
            const params = (proc && proc.params) || [];
            if (code === '&zip_xy_scaler') {
                const mult = Number(params[0] ?? 1);
                const div = Number(params[1] ?? 1);
                if (mult === 0) { model.disabled = true; } // 0/x is GLIDE's own "disabled" convention — see buildChain
                else { model.multiplier = mult; model.divisor = div; }
            } else if (code === '&zip_xy_transform') {
                const flags = Array.isArray(params[0]) ? params[0] : (params[0] !== undefined ? [params[0]] : []);
                for (const f of flags) {
                    if (f === 'INPUT_TRANSFORM_X_INVERT') model.flipX = true;
                    else if (f === 'INPUT_TRANSFORM_Y_INVERT') model.flipY = true;
                    else if (f === 'INPUT_TRANSFORM_XY_SWAP') model.swapped = true;
                    else model.extraFlags.push(f);
                }
            } else if (code === '&zip_xy_to_scroll_mapper') {
                model.mode = 'scroll';
            } else if (Object.prototype.hasOwnProperty.call(CLICK_MAPPER_TARGET_BY_CODE, code)) {
                model.clickTarget = CLICK_MAPPER_TARGET_BY_CODE[code];
            } else if (code === '&zip_temp_layer') {
                model.tempLayer = { layer: Number(params[0] ?? 0), timeoutMs: Number(params[1] ?? 1000) };
            } else {
                model.extra.push(proc);
            }
        }
        return model;
    }

    function buildChain(model) {
        const out = [];
        out.push(model.disabled
            ? { code: '&zip_xy_scaler', params: [0, 1] }
            : { code: '&zip_xy_scaler', params: [model.multiplier, model.divisor] });
        const flags = [
            ...(model.flipX ? ['INPUT_TRANSFORM_X_INVERT'] : []),
            ...(model.flipY ? ['INPUT_TRANSFORM_Y_INVERT'] : []),
            ...(model.swapped ? ['INPUT_TRANSFORM_XY_SWAP'] : []),
            ...(model.extraFlags || []),
        ];
        if (flags.length > 0) out.push({ code: '&zip_xy_transform', params: [flags] });
        if (model.mode === 'scroll') out.push({ code: '&zip_xy_to_scroll_mapper' });
        if (model.clickTarget && model.clickTarget !== 'left') {
            out.push({ code: CLICK_MAPPER_CODE_BY_TARGET[model.clickTarget] });
        }
        if (model.tempLayer) out.push({ code: '&zip_temp_layer', params: [model.tempLayer.layer, model.tempLayer.timeoutMs] });
        out.push(...model.extra);
        return out;
    }

    // -- One whole listener (base chain + any per-layer override nodes) --

    function parseListener(listener) {
        if (!listener) return { base: DEFAULT_CHAIN(), overrides: [] };
        const base = parseChain(listener.inputProcessors);
        const overrides = (listener.nodes || []).map((node) => ({
            id: node.code || `layer_${(node.layers || []).join('_')}`,
            layers: node.layers || [],
            chain: parseChain(node.inputProcessors),
        }));
        return { base, overrides };
    }

    function buildListener(code, parsed) {
        const listener = { code, inputProcessors: buildChain(parsed.base) };
        if (parsed.overrides.length > 0) {
            listener.nodes = parsed.overrides.map((ov) => ({
                code: ov.id || `layer_${ov.layers.join('_')}`,
                layers: ov.layers,
                inputProcessors: buildChain(ov.chain),
            }));
        }
        return listener;
    }

    // -- Reading/writing a touchpad's config straight out of a GLIDE layout config object --

    // Returns { code, label, parsed } for the touchpad at this key index, or null if this index
    // isn't a touchpad. `parsed` is DEFAULT_CHAIN()-shaped even when the layout has no
    // inputListeners entry for this code yet (a from-scratch layout, or one that never had a
    // trackpad configured) — the settings UI always has something sensible to show.
    function getTouchpadConfig(config, index) {
        const code = TOUCHPAD_LISTENER_CODE_BY_INDEX[index];
        if (!code) return null;
        const listener = (config?.inputListeners || []).find((l) => l.code === code);
        return { code, label: TOUCHPAD_LABEL_BY_INDEX[index], parsed: parseListener(listener) };
    }

    // Returns a new config with this touchpad's listener replaced by `parsed`'s serialization.
    // Never mutates the passed-in config — same convention as every other config-transforming
    // function in core/ (runGC, applyFlow, …), so callers can pushHistory the result directly.
    function setTouchpadConfig(config, index, parsed) {
        const code = TOUCHPAD_LISTENER_CODE_BY_INDEX[index];
        if (!code) return config;
        const next = structuredClone(config);
        const list = next.inputListeners ? [...next.inputListeners] : [];
        const built = buildListener(code, parsed);
        const existingIdx = list.findIndex((l) => l.code === code);
        if (existingIdx >= 0) list[existingIdx] = built; else list.push(built);
        next.inputListeners = list;
        return next;
    }

    Object.assign(GlideCore, {
        TOUCHPAD_LISTENER_CODE_BY_INDEX, TOUCHPAD_LABEL_BY_INDEX, isTouchpadIndex,
        CLICK_MAPPER_CODE_BY_TARGET, CLICK_TARGET_LABELS, UNVERIFIED_CLICK_TARGETS,
        parseChain, buildChain, parseListener, buildListener,
        getTouchpadConfig, setTouchpadConfig,
    });
})();
