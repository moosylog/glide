// core/capabilities/applyFlow.js — the whole "safe apply" pipeline for one Flows package,
// bundled into a single call so glide.html's UI code stays a thin adapter (call this, then
// pushHistory + toast), the same way parseLayoutJson bundles parse+validate for file loads.
//
// Pipeline: bind params into the flow's jq script -> run it against the current config ->
// validate the result exactly as any loaded file would be validated (so a buggy or malicious
// flow can't hand back a corrupted config) -> hand back { config, errors }. It's deliberately
// symmetrical with core/io/loadLayout.js's loadLayoutObject.
//
// This never mutates the current config or GC's/history's itself — that stays glide.html's job
// (it already owns pushHistory/runGC), so applyFlow.js has zero React/DOM dependencies and can
// be unit-tested with a real jq engine, same as every other core/ module.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { buildScriptWithParams, runJqScript, loadLayoutObject, isFlowCompatible } = GlideCore;

    // Some real flows (verified: hrm_add.flows, hrm_bil.flows, hrm_bil80.flows — the Home-Row
    // Mods family) read `.layout.keys`, an intermediate positional-index structure that MoErgo's
    // real export JSON never has and GLIDE never produces. Flows4JSON's own live app papers over
    // this with a "normalizer prologue" it runs on every uploaded file (see its index.html,
    // where the FileReader.onload handler builds `processedAST` before any flow ever runs):
    // reuse `.layout`/`.keymap.layout` if the file happens to already have one, otherwise
    // synthesize a placeholder — 60 sequential positions labeled by rough left/right half. That
    // placeholder's `.i` values are all a flow like hrm_add.flows actually needs (it only ever
    // looks up specific home-row physical indices in it; the "L_C"/"R_C" labels go unused), so
    // reproducing it verbatim here — rather than trying to build a "real" one — is both correct
    // and exactly as portable as every other part of this pipeline. Without this, any flow that
    // touches `.layout.keys` fails in GLIDE with jq's own unhelpful "Cannot iterate over null
    // (null)", even though the identical flow works in the real app.
    const LAYOUT_NORMALIZER_PROLOGUE = '(.keymap // .) |= (.layout = (if .layout != null and .layout.keys != null and (.layout.keys | length) > 0 then .layout elif .keymap != null and .keymap.layout != null and (.keymap.layout.keys | length) > 0 then .keymap.layout else {"keys": [ range(0; 60) as $i | { "i": $i, "label": (if $i < 30 then "L_C" else "R_C" end) } ]} end))';

    // config: the current layout object. flowEntry: a normalized catalog entry (from
    // parseCatalog/normalizeFlowEntry) with a non-empty `script` — callers should route
    // launcher-kind entries (script === '') to "Open App" instead of calling this at all.
    // paramValues: { [paramId]: rawValue } straight off the Flows panel's param form.
    const applyFlow = async (config, flowEntry, paramValues) => {
        if (!flowEntry || typeof flowEntry.script !== 'string' || !flowEntry.script) {
            return { config: null, errors: ['This flow has no script to apply.'], successMessage: '' };
        }
        if (!isFlowCompatible(flowEntry, config)) {
            return { config: null, errors: [`"${flowEntry.title}" doesn't support this keyboard.`], successMessage: '' };
        }
        const fullScript = `${LAYOUT_NORMALIZER_PROLOGUE} | ${buildScriptWithParams(flowEntry.param, paramValues || {}, flowEntry.script)}`;
        const { output, error } = await runJqScript(config, fullScript);
        if (error) return { config: null, errors: [error], successMessage: '' };

        // Only a real `.layout` (present before we ran anything) should survive into what
        // GLIDE keeps and eventually re-exports — the synthetic placeholder above is scratch
        // space for this one run, not something a MoErgo export should end up carrying forever.
        if (!config || config.layout === undefined) delete output?.layout;

        const result = loadLayoutObject(output);
        // The result box shows this only on an actually-successful apply — an author's "what
        // now" text would be misleading attached to a validation failure.
        return { ...result, successMessage: result.errors.length === 0 ? (flowEntry.successMessage || '') : '' };
    };

    Object.assign(GlideCore, { applyFlow });
})();
