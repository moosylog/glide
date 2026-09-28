# GLIDE

Graphical Layout & Intent Definition Editor — a visual ZMK keymap editor for MoErgo Glove80/Go60.

## Running it

No build step yet — open `glide.html` directly in a browser, or serve the directory with any static file server (needed for the `core/*.js` `<script src>` tags to load over `file://`-restricted browsers):

```bash
npx serve .
# or
python3 -m http.server
```

## Status: mid-modularization

This repo is partway through the migration described in [`ARCHITECTURE.md`](./ARCHITECTURE.md). **Phase 1 is done**: every pure ZMK domain function (binding parse/synthesis, garbage collection, layer-index reindexing, keycode formatting, geometry) has been extracted out of the single inline script into `core/`, as plain classic scripts that attach their exports to `window.GlideCore`. `glide.html` still contains the React UI (components, state, event handlers) and pulls everything it needs from `core/` via one destructuring line near the top of its script block.

This was a pure extraction, not a rewrite — behavior was verified identical to the pre-extraction monolith across both real sample layouts before and after, covering every interaction in `tests/` (see below).

```
glide.html              # UI: React components, state, handlers — everything NOT in core/
core/
  zmk/
    naming.js           # GLIDE_ht_/mm_/td_ naming convention + ownership description
    layerPointers.js    # LAYER_POINTER_BEHAVIORS
  keycodes/
    zmkMap.js           # keycode -> display symbol tables
    modChain.js         # modifier-wrapped keycode compose/decompose
  geometry/
    convertGeo.js        # shared geometry math
    glove80.js / go60.js # per-board raw geometry + key-position names
  gc.js                  # runGC — behavior garbage collection
  usage.js                # countBehaviorUsage, isGlideNativeBindingValue
  slots.js                # the tap/hold/shiftTap/doubleTap <-> binding engine
  describe.js             # human-readable binding/keycode formatting
  layerShift.js           # layer-index reindexing on insert/delete/move
```

Why classic scripts instead of real ES module `import`/`export`: `glide.html`'s UI script still runs through Babel Standalone's in-browser JSX transform (`<script type="text/babel">`), which evaluates as a classic script, not a module — mixing that with real `import` statements would need an import map or a bundler, which is exactly what Phase 4 (Vite) introduces. For now, `core/*.js` files are loaded as ordinary `<script src>` tags (in dependency order) before the babel script, each wrapped in an IIFE that reads its dependencies off `window.GlideCore` and adds its own exports to it — the same shape real ES modules will take once a build step exists, just without the syntax yet.

## Testing

Two layers of tests, both run by the same `npm test` / CI job:

**`tests/core/*.test.js`** (43 tests, Node environment, no DOM) — every `core/*.js` module, anchored on this session's real bugs rather than starting from generic coverage. `tests/core/slots.test.js` and `layerShift.test.js` are the two worth reading first: each documents the exact broken contract, the fix, and (for the layer-index bug) verifies against the real Engrammer fixture's 7 affected keys with a false-positive check across the whole file.

**`tests/ui/*.test.js`** (3 tests, jsdom environment via a `// @vitest-environment jsdom` pragma) — the UI/state-layer bugs `core/` unit tests structurally can't reach, since they never lived in `core/` to begin with:
- `clearAllActions.test.js` — the React state-batching bug where the trash-icon button only cleared the custom label, leaving the real binding untouched.
- `layerTap.test.js` — the empty-key Layer-Tap bug, end to end through real clicks.
- `detachCustomize.test.js` — Detach & Customize cloning a shared behavior without mutating the other key(s) that reference it.
- `comboSearch.test.js` — the Combos list's name/key search and layer filter, verified against the real Engrammer fixture's 21 combos (including the classic React-in-jsdom pitfall of setting an `<input>`'s value directly vs. through the native setter React actually tracks).
- `comboLifecycle.test.js` — the full create → pick keys (Zen mode) → rename → find-by-search → delete flow, against tynstar's fixture.

These compile `glide.html`'s script block with the exact same Babel settings its own `<script type="text/babel">` tag uses in-browser (`tests/ui/testAppHarness.js`), then mount it with real React 18 in jsdom — the same approach used to find and prove these three bugs interactively earlier in this project's history, now permanent. (Playwright, per `ARCHITECTURE.md`, is still the plan once Phase 3 introduces a real dev/build environment with browser binaries available; this jsdom approach is the version provable in the meantime, and ports over with minimal changes when that happens.)

`tests/fixtures/` holds the two real sample layouts (tynstar's and Glorious Engrammer v52b) used as golden files throughout both layers.

```bash
npm install
npm test        # single run — everything in tests/
npm run test:watch
```

CI (`.github/workflows/ci.yml`) runs this on every push and PR.

## Next (see ARCHITECTURE.md §7)

- Phase 2: extract `schemas/` (the layout JSON shape) and `io/` (file load/export).
- Phase 3+: introduce Vite, decompose the UI, add `state/` stores, and migrate `tests/ui/` to Playwright once real browser binaries are available in the dev environment.
