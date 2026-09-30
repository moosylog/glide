// core/io/loadLayout.js — the abstracted "load" half of file IO. Pure functions: given text or
// an already-parsed object, return { config, errors }, never touching the DOM, FileReader, or
// fetch. glide.html's handleFileUpload/fetchTemplate become thin adapters that get bytes from
// wherever (a <input type=file>, a URL, eventually an API response) and hand them to
// loadLayoutObject/parseLayoutJson — which is the whole point: swapping the byte source later
// (a backend API instead of a browser file picker) means writing a new thin adapter, not
// touching this validation/normalization logic at all.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { validateLayout } = GlideCore;

    // Some exports (MoErgo/Oryx-style) wrap the actual layout under a `keymap` key rather than
    // being the layout object itself — unwrap that here, once, so every caller (file upload,
    // template fetch, a future API load) gets the same normalization for free.
    const unwrapKeymap = (raw) => (raw && typeof raw === 'object' && raw.keymap !== undefined ? raw.keymap : raw);

    // Takes an already-parsed JS object/array (e.g. from `fetch(url).then(r => r.json())` or
    // `JSON.parse`) and validates it as a layout. Never throws — validation failures come back
    // as `errors`, with `config: null`.
    const loadLayoutObject = (raw) => {
        const data = unwrapKeymap(raw);
        const { valid, errors } = validateLayout(data);
        if (!valid) return { config: null, errors };
        return { config: data, errors: [] };
    };

    // Takes a raw JSON string (e.g. from FileReader.readAsText or a fetched response body) and
    // does the parse + unwrap + validate in one step. A malformed-JSON string is reported as a
    // single error, same shape as a validation failure — callers don't need to special-case it.
    const parseLayoutJson = (jsonString) => {
        let raw;
        try {
            raw = JSON.parse(jsonString);
        } catch (err) {
            return { config: null, errors: [`Invalid JSON: ${err.message}`] };
        }
        return loadLayoutObject(raw);
    };

    Object.assign(GlideCore, { loadLayoutObject, parseLayoutJson });
})();
