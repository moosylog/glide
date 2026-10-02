// Real end-to-end tests for core/capabilities/* — the Flows-packages engine. These run the
// ACTUAL jq-web engine (not a mock) against two real .flows files copied verbatim from
// github.com/moosylog/flows4json (tests/fixtures/flows/), so a pass here means real
// Flows4JSON packages actually apply correctly through GLIDE's pipeline, not just that our
// plumbing compiles.
//
// jq-web's wasm/mem build (the one glide.html loads via <script src=".../jq.wasm.js"> in a
// real browser) exposes `jq.json(input, script)` returning a Promise — that's the contract
// jqRunner.js is written against. In this Node test environment we can't load the actual wasm
// build (see ARCHITECTURE.md's jq-web note), so window.jq is wired to jq-web's Node-compatible
// asm entry via its .promised.json API instead — same jq engine, same script semantics, just a
// different Emscripten build target. That's a faithful stand-in for proving the SCRIPT and
// WRAPPER logic; the wasm-loading path itself is unverified here, same caveat class as this
// repo's deferred Playwright tests.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GlideCore } from '../helpers/loadCore.js';

const { renderParamLiteral, buildScriptWithParams, parseCatalog, isFlowCompatible, runJqScript, applyFlow } = GlideCore;

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'flows');
const loadFlowFile = (name) => readFileSync(path.join(fixturesDir, name), 'utf8');

// The real, generated flows/index.json -- built by `npm run build:flows` (scripts/
// buildFlowsIndex.mjs) from the individual flows/<shared|glove80|go60>/*.flows files. Loaded
// fresh here (not through a fetch mock) since these are core-layer tests, same spirit as the
// rest of this file running the real jq-web engine rather than a mock.
const BUILTIN_FLOWS_CATALOG = JSON.parse(readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'flows', 'index.json'), 'utf8'
));

// A minimal stand-in for build-catalog.js's regex parsing — just enough to pull `script` and
// `[[param]]` blocks out of a real .flows file for these tests, mirroring the real parser's
// approach rather than inventing a different one.
const parseFlowFixture = (text) => {
    const script = text.match(/script\s*=\s*"""([\s\S]*?)"""/)[1].trim();
    const paramBlocks = text.match(/\[\[param\]\]([\s\S]*?)(?=\n\[|$)/g) || [];
    const param = paramBlocks.map((block) => {
        const p = {};
        block.split('\n').forEach((line) => {
            const m = line.match(/^\s*([a-zA-Z0-9_-]+)\s*=\s*"?([^"\n]*)"?\s*$/);
            if (m && m[1] !== '[[param]]') p[m[1]] = m[2];
        });
        return p;
    }).filter(p => p.id);
    return { script, param };
};

beforeAll(async () => {
    // jq-web's asm bundle branches on `typeof window` to decide whether it's running in a
    // browser, and this repo's Node test setup aliases `window` to `globalThis` (see
    // tests/setup.js) so core/*.js's classic-script `window.GlideCore` attachment works — which
    // fools jq-web into taking its browser code path here, where there's no real `document`.
    // Load it with `window` briefly hidden so it takes its plain-Node path, then restore.
    const savedWindow = globalThis.window;
    delete globalThis.window;
    const jqWeb = (await import('jq-web')).default;
    globalThis.window = savedWindow;

    // Wire the real jq-web engine behind the exact interface jqRunner.js expects from the
    // browser build: a global `jq.json(input, script)` that returns a Promise.
    window.jq = { json: (input, script) => jqWeb.promised.json(input, script) };
});

describe('capabilities/paramBinding', () => {
    it('renders boolean/number/text params using the real getScriptWithParams rules', () => {
        expect(renderParamLiteral({ type: 'boolean' }, true)).toBe('true');
        expect(renderParamLiteral({ type: 'boolean' }, false)).toBe('false');
        expect(renderParamLiteral({ type: 'number' }, 42)).toBe('42');
        expect(renderParamLiteral({ type: 'text' }, '#d4dde1ff')).toBe('"#d4dde1ff"');
    });

    it('prepends one "<value> as $<id> |" line per param, in order, before the raw script', () => {
        const out = buildScriptWithParams(
            [{ id: 'background', type: 'text' }, { id: 'enabled', type: 'boolean' }],
            { background: '#fff', enabled: true },
            '.foo = $background',
        );
        expect(out).toBe('"#fff" as $background | \ntrue as $enabled | \n.foo = $background');
    });

    it('falls back to each param\'s own default when no value is supplied', () => {
        const out = buildScriptWithParams([{ id: 'n', type: 'number', default: 7 }], {}, '.x = $n');
        expect(out).toBe('7 as $n | \n.x = $n');
    });
});

describe('capabilities/catalogSchema', () => {
    const rawCatalog = [
        { uid: 'a', title: 'A', script: '. ', manifest: {}, config: {}, param: [] },
        { uid: 'b', title: 'B', script: '', appUrl: 'https://example.com', manifest: {}, config: {} },
        { title: 'no uid', script: '.' },
        { uid: 'c', title: 'neither', script: '', appUrl: null },
    ];

    it('keeps entries with a runnable script, drops no-uid entries and external-app launcher cards (script-less, appUrl-only)', () => {
        const { entries, errors } = parseCatalog(rawCatalog);
        expect(entries.map(e => e.uid)).toEqual(['a']);
        expect(entries[0].appUrl).toBeUndefined();
        expect(errors).toHaveLength(3);
    });

    it('rejects a non-array catalog', () => {
        expect(parseCatalog({ not: 'an array' }).entries).toEqual([]);
    });

    it('gates compatibility on manifest.keyboards vs config.keyboard, defaulting open when unset', () => {
        const restricted = { manifest: { keyboards: ['go60'] } };
        const unrestricted = { manifest: { keyboards: null } };
        expect(isFlowCompatible(restricted, { keyboard: 'go60' })).toBe(true);
        expect(isFlowCompatible(restricted, { keyboard: 'glove80' })).toBe(false);
        expect(isFlowCompatible(restricted, {})).toBe(false);
        expect(isFlowCompatible(unrestricted, { keyboard: 'glove80' })).toBe(true);
    });
});

describe('capabilities/jqRunner + applyFlow — real jq-web execution against real .flows files', () => {
    it('runs a real script with no params (Fn_combos) and returns the mutated config', async () => {
        const { script, param } = parseFlowFixture(loadFlowFile('Fn_combos.flows'));
        const config = { keyboard: 'go60', layers: [[]] };
        const { output, error } = await runJqScript(config, buildScriptWithParams(param, {}, script));
        expect(error).toBeNull();
        expect(output.combos).toHaveLength(12);
        expect(output.combos[0]).toMatchObject({ name: 'F1_vertical_combo', keyPositions: [1, 13], layers: [-1] });
    });

    it('applyFlow end-to-end: binds params, runs jq, and validates the result (colors_magic)', async () => {
        const { script, param } = parseFlowFixture(loadFlowFile('colors_magic.flows'));
        const flowEntry = { title: 'Magic Key Stylizer', script, param, manifest: { keyboards: null } };
        const config = { layers: [[{ value: '&magic', params: [] }, { value: '&kp', params: [{ value: 'A' }] }]] };

        const { config: result, errors } = await applyFlow(config, flowEntry, { background: '#111111', color: '#eeeeee' });
        expect(errors).toEqual([]);
        expect(result.layers[0][0].decoration).toEqual({ icon: 'moergo-long', background: '#111111', color: '#eeeeee' });
        expect(result.layers[0][1].decoration).toBeUndefined();
    });

    it('applyFlow clears decorations when the background param is left blank, per the flow\'s own docs', async () => {
        const { script, param } = parseFlowFixture(loadFlowFile('colors_magic.flows'));
        const flowEntry = { title: 'Magic Key Stylizer', script, param, manifest: { keyboards: null } };
        const config = { layers: [[{ value: '&magic', decoration: { icon: 'moergo-long', background: '#111', color: '#eee' } }]] };

        const { config: result } = await applyFlow(config, flowEntry, { background: '', color: '#eeeeee' });
        expect(result.layers[0][0].decoration).toBeUndefined();
    });

    it('applyFlow surfaces a real jq error(...) message instead of throwing', async () => {
        // Verified quirk of this jq-web build: it strips everything through the first
        // "WORD: " it finds in the error text (meant to strip jq's own "jq: error (at
        // <stdin>:0): " position prefix, but it eats one extra "LABEL: " along with it). Flow
        // authors who self-guard with `error("ABORTED: ...")` (the exact pattern used by real
        // flows like hrm_bil.flows) will have "ABORTED: " silently dropped from what the user
        // sees — worth knowing, not a bug in GLIDE's own wrapper.
        const flowEntry = { title: 'Broken', script: 'error("ABORTED: already applied")', param: [], manifest: { keyboards: null } };
        const { config, errors } = await applyFlow({ layers: [[]] }, flowEntry, {});
        expect(config).toBeNull();
        expect(errors).toEqual(['already applied']);
    });

    it('normalizes CRLF line endings before running a script (real .flows files are Windows-editable text)', async () => {
        const crlfScript = '# a leading comment\r\n.foo = 1\r\n';
        const { output, error } = await runJqScript({}, crlfScript);
        expect(error).toBeNull();
        expect(output).toEqual({ foo: 1 });
    });

    it('applyFlow blocks incompatible hardware before ever touching jq', async () => {
        const flowEntry = { title: 'Go60 only', script: '.', param: [], manifest: { keyboards: ['go60'] } };
        const { config, errors } = await applyFlow({ keyboard: 'glove80', layers: [[]] }, flowEntry, {});
        expect(config).toBeNull();
        expect(errors[0]).toMatch(/doesn't support this keyboard/);
    });

    it('applyFlow rejects a result that fails layout validation, without corrupting the caller\'s config', async () => {
        const flowEntry = { title: 'Bad flow', script: 'del(.layers)', param: [], manifest: { keyboards: null } };
        const { config, errors } = await applyFlow({ layers: [[]] }, flowEntry, {});
        expect(config).toBeNull();
        expect(errors[0]).toMatch(/Missing required "layers"/);
    });

    it('applies the real Home-Row Mods flow (hrm_add), which needs the .layout.keys normalizer to avoid "Cannot iterate over null"', async () => {
        const { script, param } = parseFlowFixture(loadFlowFile('hrm_add.flows'));
        const flowEntry = { title: 'Home-Row Mods', script, param, manifest: { keyboards: null } };
        const config = { keyboard: 'go60', layers: [Array.from({ length: 62 }, () => ({ value: '&none' }))] };

        const { config: result, errors } = await applyFlow(config, flowEntry, {
            target_version: '2', mod_preset: 'GACS', set_decorators: true,
        });
        expect(errors).toEqual([]);
        expect(result.holdTaps.length).toBeGreaterThan(0);
        // The prologue's synthetic .layout scratch space must never leak into what GLIDE keeps —
        // the original config had none, so the result shouldn't gain one either.
        expect(result.layout).toBeUndefined();
    });

    it('runs hrm_add twice in a row without the synthetic .layout accumulating across applies', async () => {
        const { script, param } = parseFlowFixture(loadFlowFile('hrm_add.flows'));
        const flowEntry = { title: 'Home-Row Mods', script, param, manifest: { keyboards: null } };
        const config = { keyboard: 'go60', layers: [Array.from({ length: 62 }, () => ({ value: '&none' }))] };
        const values = { target_version: '2', mod_preset: 'GACS', set_decorators: true };

        const first = await applyFlow(config, flowEntry, values);
        expect(first.errors).toEqual([]);
        const second = await applyFlow(first.config, flowEntry, values);
        expect(second.errors).toEqual([]);
        expect(second.config.layout).toBeUndefined();
    });
});

describe('capabilities/builtinCatalog — every Flows Automation shipped WITH GLIDE, actually run', () => {
    // Sensible param values for the entries that declare params — exercises the real form
    // inputs a user would fill in, not just each param's bare default.
    const paramValuesByUid = {
        colors_magic: { background: '#112233', color: '#eeeeee' },
        hrm_add: { target_version: '2', mod_preset: 'GACS', set_decorators: true },
        alt_layout: { layout_name: 'colemak-dh' },
        auto_decorate: { mode: 'colors_labels', os: 'win', theme: 'tailorkey' },
    };

    const go60Config = { keyboard: 'go60', layer_names: ['Base'], layers: [Array.from({ length: 62 }, () => ({ value: '&kp', params: [{ value: 'A', params: [] }] }))] };
    const glove80Fixture = JSON.parse(readFileSync(path.join(fixturesDir, '..', 'tynstar.json'), 'utf8'));

    it('parses with zero errors — every bundled entry is well-formed', () => {
        const { entries, errors } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        expect(errors).toEqual([]);
        expect(entries).toHaveLength(BUILTIN_FLOWS_CATALOG.length);
    });

    it('every entry declares a successMessage — the whole point of bundling these locally', () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        entries.forEach((e) => expect(e.successMessage, `${e.uid} has no successMessage`).not.toBe(''));
    });

    // de_symbol, fr_symbol, gb_symbol, mac_gb_symbol, se_symbol, and se_symbol_mac are real,
    // upstream-documented "Symbols 2 <language>" translations that only make sense once a layer
    // literally named "Symbol" already exists -- that's what add_symbl_lyr creates (each of
    // their own `description` fields says as much: "⚠️ Required: Symbol Layer must be included
    // in your layout"). Verified directly: running one of them against a config with no such
    // layer fails with the real jq error "The layer named 'Symbol' does not exist.", and running
    // add_symbl_lyr first, then any of them against ITS output, succeeds cleanly. So this suite
    // respects that real ordering dependency rather than treating it as a bug to work around.
    const SYMBOL_LAYER_FAMILY = ['symbols2_de', 'symbols2_fr', 'symbols2_gb', 'symbols2_gb_mac', 'symbols2_se', 'symbols2_se_mac'];

    it('every entry actually runs against a real, compatible layout and returns that successMessage', async () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const addSymbolLayer = entries.find((e) => e.uid === 'add_symbol_layer');
        // Pre-run add_symbl_lyr once per hardware fixture, so the Symbol-layer family below has
        // a real "Symbol" layer to translate, exactly as a user would experience it in order.
        const go60WithSymbolLayer = (await applyFlow(go60Config, addSymbolLayer, paramValuesByUid.add_symbl_lyr || {})).config;
        const glove80WithSymbolLayer = (await applyFlow(glove80Fixture, addSymbolLayer, paramValuesByUid.add_symbl_lyr || {})).config;

        for (const entry of entries) {
            const isGlove80Only = entry.manifest.keyboards && !entry.manifest.keyboards.includes('go60');
            let config = isGlove80Only ? glove80Fixture : go60Config;
            if (SYMBOL_LAYER_FAMILY.includes(entry.uid)) {
                config = isGlove80Only ? glove80WithSymbolLayer : go60WithSymbolLayer;
            }
            const { config: result, errors, successMessage } = await applyFlow(config, entry, paramValuesByUid[entry.uid] || {});
            expect(errors, `${entry.uid} failed: ${errors[0]}`).toEqual([]);
            expect(result).toBeTruthy();
            expect(successMessage).toBe(entry.successMessage);
        }
    }, 20000);

    // Real bug found auditing this script: it built the new Gaming layer with a literal
    // range(60), two shorter than every other layer in a real 62-position GLIDE Go60 layout —
    // silently inconsistent layer lengths that glove80_gaming's equivalent script (range(80),
    // matching Glove80's real 80) never had. Fixed by sizing off the real .layers[0] length
    // instead of a literal 60.
    it('gaming_go60 adds a Gaming layer the same length as every other layer on a real 62-key go60 layout', async () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const entry = entries.find((e) => e.uid === 'gaming_go60');
        const config = { keyboard: 'go60', layer_names: ['Base'], layers: [Array.from({ length: 62 }, () => ({ value: '&kp', params: [{ value: 'A', params: [] }] }))] };
        const { config: result, errors } = await applyFlow(config, entry, {});
        expect(errors).toEqual([]);
        expect(result.layers).toHaveLength(2);
        expect(result.layers[1]).toHaveLength(62);
        expect(result.layers[1][0]).toEqual({ value: '&kp', params: [{ value: 'ESC', params: [] }] });
    });

    // Same class of bug as gaming60 above, found in the same audit: the go60 branch of this
    // script's hardware-config object hardcoded key_count: 60 for the new Mouse/MouseSlow/
    // MouseFast/MouseWarp layers it builds, two short of a real 62-position Go60 layout. Unlike
    // mirror_keyboard_halves/colors_createRGBscheme this one is NOT scoped away from go60 (its
    // manifest already lists it), so this was a live bug affecting every real Go60 apply, not
    // just a theoretical one. Fixed by reading the real .layers[0] length instead.
    it('mouse_emulation builds its new layers the same length as the rest, on a real 62-key go60 layout', async () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const entry = entries.find((e) => e.uid === 'mouse_emulation');
        const config = { keyboard: 'go60', layer_names: ['Base'], layers: [Array.from({ length: 62 }, () => ({ value: '&kp', params: [{ value: 'A', params: [] }] }))] };
        const { config: result, errors } = await applyFlow(config, entry, {});
        expect(errors).toEqual([]);
        expect(result.layer_names).toEqual(['Base', 'Mouse', 'MouseSlow', 'MouseFast', 'MouseWarp']);
        result.layers.forEach((l) => expect(l).toHaveLength(62));
    });

    it('colors_create_rgb_scheme is scoped to glove80 only, since its real script assumes exactly 60 keys on go60', () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const entry = entries.find((e) => e.uid === 'colors_create_rgb_scheme');
        expect(entry.manifest.keyboards).toEqual(['glove80']);
        expect(isFlowCompatible(entry, { keyboard: 'go60' })).toBe(false);
    });

    it('carries every real upstream automation except the launcher cards and the broken/incomplete entry', () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const uids = entries.map((e) => e.uid).sort();
        expect(uids).toEqual([
            'ai_control', 'fn_combos', 'add_symbol_layer', 'alt_layout', 'app_switcher_key',
            'app_switcher_macro', 'autoshift', 'colors_magic', 'colors_create_rgb_scheme', 'symbols2_de',
            'emoji_macros', 'symbols2_fr', 'gaming_go60', 'symbols2_gb', 'gaming_glove80', 'hrm_add',
            // hrm_bil60 is GLIDE's own port of hrm_bil80 (Sunaku's Bilateral HRM) to the Go60 --
            // not sourced from upstream flows4json, unlike every other entry in this list. See
            // its own dedicated tests below for what the port had to adapt.
            'hrm_bil60', 'hrm_bil80', 'hrm_remove', 'symbols2_gb_mac', 'macro_wizard',
            'mirror_keyboard_halves',
            'mouse_emulation', 'os_remap', 'punct_swap', 'auto_decorate', 'symbols2_se',
            'symbols2_se_mac', 'oneshot_modifier', 'mouse_swap_trackpads',
            'sym_numrow_v2', 'top_15_zmk_behaviors',
        ].sort());
        expect(uids).not.toContain('colors_launch_kiilix'); // launcher-only, no script
        expect(uids).not.toContain('l_cleaner'); // launcher-only, no script
        expect(uids).not.toContain('l_hrm_tuner'); // launcher-only, no script
        expect(uids).not.toContain('l_oryx_swap'); // launcher-only, no script
        expect(uids).not.toContain('l_qwerty_swap'); // launcher-only, no script
        expect(uids).not.toContain('hrm_bil_dynamic'); // upstream's own script is truncated
    });

    // mirror_keyboard_halves had the identical exact-60-keys assumption colors_create_rgb_scheme
    // still has, but unlike that one it's a pure position swap with no physical-layout string to
    // guess at, so it's fixed and re-enabled for go60 here (see flows/shared/
    // mirror_keyboard_halves.flows' own header) -- the general "every entry actually runs" test
    // above already exercises it against the real
    // 62-key go60Config; this proves the two trackpad-listener slots specifically survive
    // untouched rather than getting silently dropped or corrupted by the mirror.
    it('mirror_keyboard_halves works on a real 62-key go60 layout, leaving the two touchpad slots untouched', async () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const entry = entries.find((e) => e.uid === 'mirror_keyboard_halves');
        expect(entry.manifest.keyboards).toEqual(['glove80', 'go60']);
        expect(isFlowCompatible(entry, { keyboard: 'go60' })).toBe(true);

        const config = {
            keyboard: 'go60',
            layers: [Array.from({ length: 62 }, (_, i) => ({ value: '&kp', params: [{ value: `K${i}`, params: [] }] }))],
        };
        const before5 = JSON.stringify(config.layers[0][5]);
        const before6 = JSON.stringify(config.layers[0][6]);
        const before60 = JSON.stringify(config.layers[0][60]);
        const before61 = JSON.stringify(config.layers[0][61]);

        const { config: result, errors } = await applyFlow(config, entry, { layer_idx: '0', mirror_style: 'symmetric', exclude_thumbs: 'no' });
        expect(errors).toEqual([]);
        expect(result.layers[0]).toHaveLength(62);
        expect(JSON.stringify(result.layers[0][5])).toBe(before6); // key 5 <-> key 6 under the symmetric mapping
        expect(JSON.stringify(result.layers[0][6])).toBe(before5);
        expect(JSON.stringify(result.layers[0][60])).toBe(before60); // touchpad slot, left alone
        expect(JSON.stringify(result.layers[0][61])).toBe(before61); // touchpad slot, left alone
    });
});

// hrm_bil60 is GLIDE's own port of hrm_bil80 (Sunaku's Bilateral HRM) to the Go60. The upstream
// script hardcodes a full literal snapshot of a stock 80-key Glove80 QWERTY layout position by
// position -- Go60 physically has no F-row and ~20 fewer keys, so there's no safe way to
// transplant that literal array without guessing at a "default Go60 QWERTY" layout. This port
// instead replicates the exact same algorithm (own-hand keys wrapped with a per-finger tap
// macro; a finger's own home position -> &none; its other 3 same-hand home siblings -> a
// cross-finger bigram hold-tap; the opposite hand's home row -> a plain passthrough copy;
// everything else -> &trans) on top of a freshly-built, clearly-documented stock Go60 QWERTY
// base layer, using the already-proven Go60 home-row/trigger positions from hrm_add.flows
// (home row = 25/26/27/28 left, 31/32/33/34 right; l_trigs/r_trigs are its bilateral trigger
// sets) rather than re-deriving them.
//
// The hardcoded new-layer arrays originally had 62 entries each (this suite used to assert
// that), carried over from hrm_bil80's per-hand thumb-cluster block without trimming it for
// Go60. A real MoErgo Go60 export has exactly 60 bindings per `.layers[]` entry -- confirmed
// against a real user export, every one of whose five untouched factory layers (Base, Keypad,
// SymbolNav, Magic, Factory) is 60 long -- so a new layer coming out at 62 doesn't match the
// rest of the same file and MoErgo's Layout Editor rejects the whole import. (GLIDE's own
// geometry model counts 62 *positions* for Go60 -- core/geometry/go60.js, the last two being
// the Cirque trackpad click-mapping slots used by core/zmk/inputProcessors.js -- but those two
// are handled through `inputProcessors` config, not `.layers[]` key bindings, so they don't
// belong in this count.) This suite now pins the real 60.
describe('capabilities/builtinCatalog — hrm_bil60 (Go60 port of Sunaku\'s Bilateral HRM)', () => {
    it('builds a full 10-layer bilateral HRM system on a real 60-key go60 layout', async () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const entry = entries.find((e) => e.uid === 'hrm_bil60');
        expect(entry.manifest.keyboards).toEqual(['go60']);
        expect(isFlowCompatible(entry, { keyboard: 'go60' })).toBe(true);
        expect(isFlowCompatible(entry, { keyboard: 'glove80' })).toBe(false);

        const config = {
            keyboard: 'go60',
            layer_names: ['Base'],
            layers: [Array.from({ length: 60 }, () => ({ value: '&kp', params: [{ value: 'A' }] }))],
        };
        const { config: result, errors } = await applyFlow(config, entry, { mod_preset: 'GACS' });
        expect(errors).toEqual([]);

        expect(result.layer_names).toEqual([
            'Base', 'HRM_Bil', 'LeftPinky', 'LeftRingy', 'LeftMiddy', 'LeftIndex',
            'RightIndex', 'RightMiddy', 'RightRingy', 'RightPinky',
        ]);
        expect(result.layers).toHaveLength(10);
        for (let i = 1; i < 10; i++) {
            expect(result.layers[i]).toHaveLength(60);
        }
        expect(result.holdTaps).toHaveLength(32);
        expect(result.macros).toHaveLength(16);

        // Every hold-tap's bilateral trigger set matches hrm_add.flows' already-tested Go60
        // arrays, uniformly per hand (not per finger).
        const lTrig = [6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35, 42, 43, 44, 45, 46, 47, 51, 52, 53, 54, 55, 56, 57, 58, 59];
        const rTrig = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 24, 25, 26, 27, 28, 29, 36, 37, 38, 39, 40, 41, 48, 49, 50, 54, 55, 56, 57, 58, 59];
        for (const ht of result.holdTaps) {
            const expected = ht.name.includes('_left_') ? lTrig : rTrig;
            expect(ht.holdTriggerKeyPositions.slice().sort((a, b) => a - b)).toEqual(expected);
        }

        // HRM_Bil base layer: home-row hold-taps installed with the GACS preset resolved.
        const hrmIdx = result.layer_names.indexOf('HRM_Bil');
        expect(result.layers[hrmIdx][25].value).toBe('&HRM_left_pinky_v1B_TKZ');
        expect(result.layers[hrmIdx][25].params[0].value).toBe('LGUI'); // GACS -> L1
        expect(result.layers[hrmIdx][28].params[0].value).toBe('LSHFT'); // index is OS-independent
        expect(result.layers[hrmIdx][29].value).toBe('&kp'); // G, the non-mod home letter

        // LeftPinky finger layer: own position -> &none, sibling homes -> cross hold-taps,
        // opposite hand's home row -> plain passthrough, and the layer stops at the real
        // 60-key boundary (no leftover padding past the last physical key).
        const lpIdx = result.layer_names.indexOf('LeftPinky');
        expect(result.layers[lpIdx][25].value).toBe('&none');
        expect(result.layers[lpIdx][26].value).toBe('&HRM_left_pinky_ring_v1B_TKZ');
        expect(result.layers[lpIdx][27].value).toBe('&HRM_left_pinky_middy_v1B_TKZ');
        expect(result.layers[lpIdx][28].value).toBe('&HRM_left_pinky_index_v1B_TKZ');
        expect(result.layers[lpIdx][31]).toEqual({ value: '&kp', params: [{ value: 'J' }] });
        expect(result.layers[lpIdx][34]).toEqual({ value: '&kp', params: [{ value: 'SEMI' }] });
        expect(result.layers[lpIdx]).toHaveLength(60);

        // Running it twice is safe: the layer-name lookup reuses existing indices instead of
        // adding duplicate layers (same "guarantee layers exist" pattern as hrm_bil80).
        const second = await applyFlow(result, entry, { mod_preset: 'GACS' });
        expect(second.errors).toEqual([]);
        expect(second.config.layer_names).toEqual(result.layer_names);
        expect(second.config.layers).toHaveLength(10);
    });

    it('resolves the CAGS (macOS) mod preset the same way hrm_bil80 does', async () => {
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const entry = entries.find((e) => e.uid === 'hrm_bil60');
        const config = {
            keyboard: 'go60',
            layer_names: ['Base'],
            layers: [Array.from({ length: 60 }, () => ({ value: '&kp', params: [{ value: 'A' }] }))],
        };
        const { config: result, errors } = await applyFlow(config, entry, { mod_preset: 'CAGS' });
        expect(errors).toEqual([]);
        const hrmIdx = result.layer_names.indexOf('HRM_Bil');
        expect(result.layers[hrmIdx][25].params[0].value).toBe('LCTRL'); // CAGS -> L1
        expect(result.layers[hrmIdx][27].params[0].value).toBe('LGUI'); // CAGS -> L2
    });

    it('produces layers matching a real MoErgo Go60 export exactly (regression: was 62, not 60)', async () => {
        // Runs the real fix against the actual user-reported file: every pre-existing factory
        // layer in a genuine MoErgo Go60 export is 60 long, so every layer hrm_bil60 adds must
        // be 60 long too, or MoErgo's Layout Editor rejects the whole file on import.
        const { entries } = parseCatalog(BUILTIN_FLOWS_CATALOG);
        const entry = entries.find((e) => e.uid === 'hrm_bil60');
        const fixture = JSON.parse(readFileSync(
            path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'go60.json'), 'utf8'
        ));
        // This checked-in fixture predates the fix and is itself 62-wide; trim it to the real
        // 60 so this test exercises hrm_bil60 against the actual shape MoErgo exports, not the
        // same wrong assumption the bug came from.
        const config = {
            ...fixture,
            layers: fixture.layers.map((l) => l.slice(0, 60)),
        };
        const { config: result, errors } = await applyFlow(config, entry, { mod_preset: 'GACS' });
        expect(errors).toEqual([]);
        for (const name of ['HRM_Bil', 'LeftPinky', 'LeftRingy', 'LeftMiddy', 'LeftIndex', 'RightIndex', 'RightMiddy', 'RightRingy', 'RightPinky']) {
            const idx = result.layer_names.indexOf(name);
            expect(result.layers[idx]).toHaveLength(60);
        }
    });
});
