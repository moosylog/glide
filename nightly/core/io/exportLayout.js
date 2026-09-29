// core/io/exportLayout.js — the abstracted "export" half of file IO. Pure functions: given a
// config object, produce the bytes and a suggested filename, never touching the DOM or
// triggering a download directly. glide.html's handleExport becomes a thin adapter that takes
// this output and does the anchor-click download dance; a future "export to API" path would
// take the exact same output and POST it instead — the serialization logic doesn't change
// either way.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // Pretty-printed JSON, matching what GLIDE has always written out — kept as its own named
    // function rather than an inline JSON.stringify call so a future export format change (e.g.
    // minified for an API body vs. pretty for a file download) is one function, not a search.
    const serializeLayout = (config) => JSON.stringify(config, null, 2);

    const getExportFilename = (config) => `layout_${config?.keyboard || 'custom'}.json`;

    Object.assign(GlideCore, { serializeLayout, getExportFilename });
})();
