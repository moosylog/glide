// core/capabilities/jqRunner.js — thin async adapter over the global `jq` object, which
// production glide.html loads via <script src=".../jq-web@0.5.1/jq.wasm.js">, exactly like
// Flows4JSON's own live app does. That global exposes `jq.json(input, script)` returning a
// Promise (per jq-web's wasm/mem-loading build — it can't resolve synchronously because the
// wasm binary itself loads asynchronously).
//
// This wrapper never throws: like core/io's functions, it always resolves to a plain
// {output, error} object, so callers (the Flows UI, or applyFlow.js) don't need try/catch —
// a flow's own jq `error(...)` call surfaces here as a readable `error` string instead of a
// rejected promise bubbling into React event handlers.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // input: any JSON-serializable value (typically the current layout config object).
    // script: a jq program as text (already fully assembled, e.g. via buildScriptWithParams).
    const runJqScript = async (input, script) => {
        if (typeof window.jq === 'undefined' || typeof window.jq.json !== 'function') {
            return { output: null, error: 'The jq engine is not loaded yet — try again in a moment.' };
        }
        try {
            // Real .flows files are plain text pulled off GitHub, so a Windows checkout or a
            // Windows-authored file can hand this CRLF line endings. This jq-web build's
            // comment-lexing silently mis-tokenizes CRLF (verified: identical scripts differing
            // only in \r\n vs \n either compile or fail with a bare "1 compile error"), so every
            // script is normalized to \n here, once, at the one place all script text funnels
            // through — not left to whoever assembles the raw script text upstream.
            const normalizedScript = script.replace(/\r\n/g, '\n');
            const output = await window.jq.json(input, normalizedScript);
            return { output, error: null };
        } catch (e) {
            const message = (e && e.message) ? e.message : String(e);
            return { output: null, error: message };
        }
    };

    Object.assign(GlideCore, { runJqScript });
})();
