#!/usr/bin/env node
// Bundles the modularized glide.html (which loads core/*.js and ui/*.js via <script src="...">)
// back into one truly self-contained HTML file, safe to open directly as file:///... .
//
// Why this exists: Stage 1-3 of the modularization (ARCHITECTURE.md) split GLIDE's single inline
// script into core/*.js (plain classic scripts) and ui/*.js (mostly type="text/babel"). That's
// great for development, but it breaks the "just open the HTML file" workflow two different ways
// when the page is loaded as file:///path/to/glide.html instead of served over http(s):
//   1. Babel Standalone's in-browser transformer fetches every `type="text/babel" src="..."`
//      script via XMLHttpRequest so it can transform the JSX before running it. Browsers refuse
//      that fetch for a file:// document (Access-Control blocks it: "origin 'null'"), so every
//      ui/*.js file silently fails to load and the app never mounts (visible as a swallowed XHR
//      error in the console, then a downstream "Minified React error #130" from ReactDOM trying
//      to render nothing).
//   2. Even the plain classic core/*.js scripts, loaded via native <script src>, are blocked by
//      the same file:// origin restriction in some browsers/configurations.
// Inlining every local script's actual source text directly into the HTML (removing the `src`
// attribute entirely) sidesteps both: there's no fetch left to block, local or XHR-based, since
// the browser already has the bytes.
//
// This script is dev-only tooling — it does not change anything about how `npm test` or the
// `core/`/`ui/` split works, and it never modifies glide.html itself. It reads glide.html, walks
// its <script src="..."> tags in document order, and for every one whose src is a local relative
// path (not an absolute http(s):// CDN URL, which loads fine from file:// since those are normal
// cross-origin GETs, not XHR-fetched-then-transformed) replaces the tag with an inline
// <script[ type="text/babel"]>...file contents...</script>, preserving the original `type`
// attribute and every HTML comment / ordering constraint already encoded in glide.html — this
// script does not re-derive load order, it only inlines what's already there in place.
//
// Usage: npm run build:bundle
// Output: dist/glide.html — a single file with zero same-directory dependencies: every local
// <script src> AND the local stylesheet <link> are inlined, so the result can be copied anywhere
// (a different folder, a USB stick, emailed as an attachment) and still open correctly, not just
// double-clicked in place inside the repo. The three unpkg.com CDN <script defer> tags are left
// untouched — they're absolute https:// URLs, unaffected by the file:// same-directory
// restriction this bundle exists to work around.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const srcPath = join(repoRoot, 'glide.html');
const outDir = join(repoRoot, 'dist');
const outPath = join(outDir, 'glide.html');

const html = readFileSync(srcPath, 'utf8');

// Matches a self-closing external <script ...src="..."></script> tag, capturing any attributes
// before/after src (currently just `type="text/babel"`, but written to survive a reordering) and
// the src value itself. Deliberately does NOT match a script that already has inline content —
// glide.html's own external tags are all `<script ...></script>` with nothing between the tags.
const scriptTagPattern = /<script([^>]*?)\ssrc="([^"]+)"([^>]*)>\s*<\/script>/g;

let inlinedCount = 0;
const bundled = html.replace(scriptTagPattern, (whole, before, src, after) => {
    // Leave CDN scripts (React/ReactDOM/Babel Standalone from unpkg) exactly as-is — they're
    // absolute https:// URLs, unaffected by the file:// same-directory restriction this bundle
    // exists to work around, and inlining ~2MB of minified React would just bloat the output.
    if (/^https?:\/\//.test(src)) return whole;

    const filePath = join(repoRoot, src);
    let contents;
    try {
        contents = readFileSync(filePath, 'utf8');
    } catch (err) {
        throw new Error(`bundleSingleFile: couldn't read "${src}" referenced from glide.html (resolved to ${filePath}): ${err.message}`);
    }

    inlinedCount += 1;
    const attrs = `${before}${after}`.trim();
    const openTag = attrs ? `<script ${attrs}>` : '<script>';
    // A leading/trailing newline keeps the inlined source readable if anyone opens dist/glide.html
    // to debug, rather than jamming it onto the tag's own line.
    return `${openTag}\n${contents}\n</script>`;
});

if (inlinedCount === 0) {
    throw new Error('bundleSingleFile: inlined zero local <script src> tags — glide.html\'s structure may have changed; check scriptTagPattern above still matches it.');
}

// Same idea for the one local stylesheet: <link rel="stylesheet" href="core/styles/....css"> ->
// an inline <style>...</style>, so the bundle has no dependency on core/styles/ sitting next to
// it either. A local <link> tag actually loads fine from file:// on its own (it's not
// XHR-fetched-then-transformed the way Babel's text/babel loader is), so this step is purely for
// portability — letting the output file be copied somewhere else entirely — not for fixing a
// second CORS failure.
const linkTagPattern = /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g;
let inlinedStylesheets = 0;
const bundledWithCss = bundled.replace(linkTagPattern, (whole, href) => {
    if (/^https?:\/\//.test(href)) return whole;
    const filePath = join(repoRoot, href);
    let contents;
    try {
        contents = readFileSync(filePath, 'utf8');
    } catch (err) {
        throw new Error(`bundleSingleFile: couldn't read stylesheet "${href}" referenced from glide.html (resolved to ${filePath}): ${err.message}`);
    }
    inlinedStylesheets += 1;
    return `<style>\n${contents}\n</style>`;
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, bundledWithCss, 'utf8');

console.log(`Bundled ${inlinedCount} local script(s) and ${inlinedStylesheets} local stylesheet(s) into ${outPath} (${(bundledWithCss.length / 1024).toFixed(0)} KB).`);
console.log('This file has zero same-directory dependencies — copy it anywhere and open it directly (file:// included).');
