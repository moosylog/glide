// A real regression, caught the hard way: GLIDE's UI was split out of glide.html into ui/*.js
// (topBar.js, sidebar.js, inspector.js, modals.js, ...) in an earlier refactor, but
// tailwind.config.js's `content` glob was never updated to scan that new directory. The
// checked-in core/styles/tailwind.generated.css still had every class it needed (generated
// before that split, or hand-patched since), so nothing looked broken -- until the next time
// someone ran `npm run build:css`, which silently purged every utility class that appears ONLY
// in a ui/*.js file and nowhere else GLIDE scans. The visible result: InspectorPanel's classes
// vanished, so it rendered with no layout/positioning at all and the panel collapsed into a
// block-flow stack overlapping the canvas above it -- a real, user-visible "everything overlaps"
// bug, not a cosmetic one. This test pins both layers: the config's intent, and the actual
// shipped CSS artifact (in case someone regenerates it with a config that still has the bug
// fixed in spirit but broken in practice, or edits the generated file by hand and drifts).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('tailwind.config.js content glob', () => {
    it('scans ui/**/*.js, not just glide.html and core/**/*.js', () => {
        const configText = readFileSync(path.join(repoRoot, 'tailwind.config.js'), 'utf8');
        // Pull the `content: [...]` array out as text rather than requiring the module (it's a
        // CommonJS file and this repo's tests run as ESM) -- a simple substring check is enough
        // to catch the actual regression (the glob silently missing ui/**/*.js).
        const contentMatch = configText.match(/content:\s*\[([^\]]*)\]/);
        expect(contentMatch).toBeTruthy();
        const globs = contentMatch[1];
        expect(globs).toMatch(/['"]\.\/ui\/\*\*\/\*\.js['"]/);
        expect(globs).toMatch(/['"]\.\/core\/\*\*\/\*\.js['"]/);
        expect(globs).toMatch(/['"]\.\/glide\.html['"]/);
    });

    it('the checked-in generated CSS actually contains a class used ONLY in a ui/*.js file', () => {
        // ui/inspector.js's amber "select a key first" warning box uses bg-amber-500/10 --
        // audited as not appearing in glide.html or anywhere under core/**/*.js, so its
        // presence here proves ui/*.js is really being scanned, not just named in the config.
        const css = readFileSync(path.join(repoRoot, 'core', 'styles', 'tailwind.generated.css'), 'utf8');
        expect(css).toMatch(/amber-500\\?\/10\{background-color:rgba\(245,158,11,\.1\)/);
    });
});
