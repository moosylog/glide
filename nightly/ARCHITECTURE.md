# GLIDE Architecture & Modularization Plan

**Status:** Proposed
**Scope:** Directory layout and module separation strategy for migrating GLIDE from a single-file HTML app to a GitHub-hosted, buildable project — without a big-bang rewrite, and with the roadmap (touchpads, workspace/theme UX, visual combo editor, macro builder, capabilities marketplace) designed in from day one rather than bolted on later.

---

## 1. Why modularize now

GLIDE today is one `<script type="text/babel">` block: ~30 `useState` hooks and every handler live inside a single `App` component, domain logic (ZMK binding parsing/synthesis, layer-index remapping, GC) is interleaved with JSX, and there's no test harness beyond ad-hoc scripts. That's the right way to *start* a single-file tool — it's exactly why iteration has been fast — but it's the wrong shape for:

- Adding five roadmap features without every one of them touching the same 2,000-line `App` function.
- Writing regression tests for the domain logic bugs that keep surfacing in exactly that logic (hold-tap synthesis, layer reindexing, GC eligibility) — these are pure functions today, but they're not *isolated*, so testing them means booting a browser-shaped environment around them.
- Letting the Capabilities Marketplace run third-party `jq` transforms without those transforms having incidental access to the rest of the app.

## 2. Guiding principles

1. **Domain logic has zero UI dependencies.** Everything that knows what a `&kp` binding, a hold-tap, or a layer index *is* lives in `core/` and `schemas/`, and never imports from `ui/` or React. This is the single most important rule — it's what makes the domain logic unit-testable in milliseconds instead of requiring a rendered component tree, and it's what stops UI experiments from accidentally changing correctness-critical behavior.
2. **State is not UI.** Component tree shape can change (and will, five times over, for the roadmap) without touching how the layout config is stored, undone, or garbage-collected.
3. **Schemas are the shared contract.** The MoErgo JSON layout format is the thing every other module ultimately agrees on. It's defined once, typed once, and every boundary (file load, export, capability injection) validates against it.
4. **Extensions are a guest, not a member of the family.** Marketplace capabilities run through a narrow, sandboxed API — they get a JSON snapshot in and a JSON snapshot out, never a reference into live app state.
5. **Dependencies point one way:** `ui → state → core/schemas`. `io` and `extensions` depend on `core/schemas` but not on `ui` or `state` directly (they're called *by* state, or by top-level orchestration). Nothing in `core/` or `schemas/` imports anything above it. A lint rule (see §6) enforces this so it doesn't erode over time.

## 3. Directory layout

```
glide/
├── README.md
├── ARCHITECTURE.md                  ← this document
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .github/workflows/
│   ├── ci.yml                       # lint + typecheck + unit tests + build, on every PR
│   └── deploy.yml                   # build → GitHub Pages, on merge to main
├── public/
├── src/
│   ├── main.tsx                     # mounts <App/>, nothing else
│   ├── app/
│   │   └── App.tsx                  # top-level shell/layout ONLY — composes ui/, owns no logic
│   │
│   ├── core/                        # pure domain logic — zero React/DOM imports, fully unit-testable
│   │   ├── zmk/
│   │   │   ├── holdTap.ts               # makeHoldTap, parseHoldTap
│   │   │   ├── modMorph.ts              # makeModMorph, parseModMorph
│   │   │   ├── tapDance.ts              # tap-dance synth/parse (today inline in buildBindingAndConfig)
│   │   │   ├── macro.ts                 # NEW — &macro parse/build (see §5, Macro Builder)
│   │   │   ├── combo.ts                 # combo binding/keyPositions helpers
│   │   │   └── naming.ts                # GLIDE_HT_/MM_/TD_ PREFIX, isGlideXName, ownership description
│   │   ├── slots.ts                     # parseSlots, buildBindingAndConfig — the tap/hold/shiftTap/doubleTap engine
│   │   ├── gc.ts                        # runGC
│   │   ├── layerShift.ts                # shiftLayerPointers + recursive nested-behavior remap
│   │   ├── describe.ts                  # describeBinding, formatKeycode, formatParam
│   │   ├── usage.ts                     # countBehaviorUsage, isGlideNativeBindingValue, detach eligibility
│   │   ├── geometry/
│   │   │   ├── glove80.ts               # GLOVE80_GEO_RAW, GLOVE80_NAMES
│   │   │   ├── go60.ts                  # GO60_GEO_RAW, GO60_NAMES
│   │   │   ├── touchpad.ts              # NEW — pointer-region geometry (see §5, Touchpad)
│   │   │   └── convertGeo.ts            # shared geometry→pixel conversion, computeGeoBounds
│   │   └── keycodes/
│   │       ├── zmkMap.ts                # ZMK_MAP, MOD_WRAPPER_TO_FULL, RAW_MOD_CODES
│   │       └── modChain.ts              # unwrapModChain, composeKeycodeParam
│   │
│   ├── schemas/                     # data SHAPES — types + validators, the contract every boundary checks against
│   │   ├── layout.schema.ts             # BindingObject, Layer, Combo, HoldTap, ModMorph, TapDance, LayoutConfig
│   │   ├── touchpad.schema.ts           # NEW roadmap
│   │   ├── capability.schema.ts         # NEW roadmap — marketplace bundle manifest shape
│   │   └── validate.ts                  # parse/validate entry points used by io/ and extensions/
│   │
│   ├── io/                          # boundary between the outside world and core/schemas
│   │   ├── layoutLoader.ts              # loadLayoutData, file-upload handling, template fetching
│   │   ├── layoutExporter.ts            # export orchestration
│   │   └── firmware/                    # isolated "generation backend" boundary
│   │       ├── moergoJson.ts            # today's actual output target
│   │       └── zmkDevicetree.ts         # FUTURE — direct .keymap/.dtsi export, kept out of core/ so it can't entangle it
│   │
│   ├── extensions/                  # NEW — pluggable capability / jq-flow engine (Marketplace roadmap)
│   │   ├── engine/
│   │   │   ├── jqRunner.ts              # sandboxed jq-wasm execution, JSON in → JSON out, no DOM access
│   │   │   ├── flowManifest.ts          # parses a bundle's .flows/manifest metadata
│   │   │   └── capabilityRegistry.ts    # installed capabilities; applies a transform then re-validates + re-GCs
│   │   └── marketplace/
│   │       ├── MarketplaceModal.tsx     # browse/install UI (depends on ui/, never the reverse)
│   │       └── registryApi.ts           # fetch available bundles from an index
│   │
│   ├── state/                       # application state, decoupled from rendering
│   │   ├── layoutStore.ts               # config + undo/redo — today's App-level useState soup, extracted
│   │   ├── selectionStore.ts            # selectedKey, activeLayer, editingComboIdx, isZenMode
│   │   ├── uiPreferencesStore.ts        # theme, layoutMode, osSetting, panelSize (localStorage-backed)
│   │   └── workspaceStore.ts            # NEW roadmap — open files, dirty/unsaved tracking (see §5)
│   │
│   ├── ui/                          # presentation only — reads state/, calls core/ via state actions
│   │   ├── canvas/
│   │   │   ├── KeyboardCanvas.tsx       # today's KeyboardContainer
│   │   │   ├── Key.tsx                  # today's KeyComponent
│   │   │   ├── MiniKeyboardMap.tsx      # generic mini keyboard visual — reused by Combo Editor (see §5)
│   │   │   └── keyLabel.tsx             # label sizing/markup; text itself comes from core/describe.ts
│   │   ├── inspector/                   # right-hand panel
│   │   │   ├── SlotEditor.tsx
│   │   │   ├── behaviorSettings/
│   │   │   │   ├── HoldTapSettings.tsx
│   │   │   │   ├── TapDanceSettings.tsx
│   │   │   │   └── ModMorphSettings.tsx
│   │   │   ├── DetachCustomize.tsx
│   │   │   ├── comboEditor/             # NEW roadmap — Visual Combo Editor (see §5)
│   │   │   ├── macroEditor/             # NEW roadmap — Macro Builder (see §5)
│   │   │   └── touchpadPanel/           # NEW roadmap — gesture-zone geometry, if ever needed
│   │   │                                #   (a lighter input-processor settings slice already
│   │   │                                #   shipped in glide.html — see §5, Touchpad Configuration)
│   │   ├── palette/
│   │   │   ├── Palette.tsx
│   │   │   ├── AdvancedBehaviors.tsx
│   │   │   └── paletteData.ts
│   │   ├── layout/                      # left nav: layers/combos list, resizers, top bar
│   │   │   ├── LayerList.tsx
│   │   │   ├── ComboList.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ResizablePane.tsx
│   │   ├── modals/
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── StartScreen.tsx
│   │   │   └── UnsavedChangesModal.tsx  # NEW roadmap
│   │   └── theme/                       # NEW roadmap — light/dark/custom (see §5)
│   │       ├── ThemeProvider.tsx
│   │       └── themes.ts
│   │
│   └── utils/                       # generic helpers with no ZMK/domain knowledge (escapeHtml, etc.)
│
├── tests/
│   ├── core/                        # unit tests mirroring src/core — where this session's bug fixes get regression tests
│   ├── fixtures/                    # the real sample layout JSONs, used as golden files
│   └── e2e/                        # Playwright: load → select → assign → export
│
└── docs/
    ├── layout-format.md              # the MoErgo JSON schema GLIDE reads/writes
    ├── naming-convention.md          # the GLIDE_ht_/mm_/td_ ownership scheme
    └── extension-authoring.md        # NEW roadmap — how to author a Marketplace capability bundle
```

## 4. Module responsibilities at a glance

| Module | Owns | Never touches |
|---|---|---|
| `core/` | What a binding *is*, how it decomposes/recomposes, GC, layer remapping | React, DOM, `fetch`, `localStorage` |
| `schemas/` | What a layout JSON *looks like*, validation | Any behavior/logic |
| `io/` | Getting bytes in and out (files, gists, future firmware targets) | UI rendering |
| `extensions/` | Running third-party transforms safely | Direct mutation of `state/` — it hands back JSON, `state/` decides what to do with it |
| `state/` | *When* things change, undo/redo, persistence | How things look |
| `ui/` | How things look and how the user's hands map to `state/` actions | ZMK semantics — a component should never need to know what `&ht_auto_` collapse rules are |

## 5. Roadmap fit

The point of this layout is that none of the five roadmap items require restructuring — each has an obvious, already-provisioned home.

**Touchpad Configuration — a first, lighter slice landed early; the full item described here is still ahead.** This section originally scoped touchpads as a geometry problem: pointer *regions* rather than key indices, needing their own `core/geometry/touchpad.ts` and a `KeyboardCanvas.tsx` rendering branch for gesture zones. That's still real future work if GLIDE ever needs to model an actual touch-sensing surface (drawing zones, gesture mapping). But the immediately actionable, immediately requested need turned out to be smaller and didn't need any of that: Go60's two Cirque trackpads already exist as ordinary (if inert) key positions in the current geometry model (60/61, the round keys), and what MoErgo's own config UI actually edits for them isn't geometry at all — it's a ZMK *input-processor chain* (sensitivity scaling, axis flip/swap, movement-vs-scroll mode, per-layer overrides), pure firmware config with no rendering surface of its own. `core/zmk/inputProcessors.js` (parse/build over `config.inputListeners`, same shape as `core/behaviors/compile.js`) plus a `TouchpadSettingsModal` opened from the existing touchpad key positions covers that need entirely, without touching geometry, `schemas/`, or `KeyboardCanvas.tsx` at all — see the "Touchpad Settings" note in `README.md` for the full design, including why the JSON encoding for this corner of the format needed verifying against a real export rather than assuming it matched an ordinary key binding.

**UI & Workspace Enhancements.** This is what `state/workspaceStore.ts` and `ui/theme/` are for. Full multi-file workflows (several layouts open at once, each in its own tab) are still a workspace-level concern sitting above `layoutStore` — a workspace holds N layouts, each with its own dirty flag and undo stack; today's single-`config` model becomes one entry in that collection. But the *single*-layout slice of "unsaved changes" has landed early, out of real necessity rather than the full roadmap item: `glide.html`'s `isDirty` state, set on every edit and cleared by an Export or a fresh load, plus a `beforeunload` warning and a `guardUnsavedChanges` confirmation before any action that would discard it (see the "File handling" note below §5's Flows Automations one). That's the same *concept* the eventual `workspaceStore` needs per-layout, just not yet generalized to N simultaneous layouts — moving it there later is extending its scope, not redesigning it. Theme support replaces the current three hardcoded CSS classes (`oled`/`dark`/light) with a token system in `ui/theme/themes.ts`, with "custom theme" being a user-authored token set stored in `uiPreferencesStore`.

**Visual Combo Editor.** Mostly UI composition over logic that already exists: `core/zmk/combo.ts` already owns combo binding/keyPositions logic, and — nice existing asset — `MiniKeyboardMap.tsx` was already built generically enough (it's currently used for hold-trigger-key picking) to be reused as the combo mini-preview with zero changes. "Layer awareness" is just the combo editor reading the layer list out of `layoutStore` the same way `LayerList.tsx` does. The new surface area is entirely in `ui/inspector/comboEditor/` — an editor experience, not new domain logic.

**Macro Builder & Editor.** This is the one roadmap item that needs genuinely new *core* logic, not just new UI: GLIDE today recognizes macros only well enough to list them in the Advanced tab — it doesn't parse or synthesize `&macro` behaviors (bindings arrays with `&macro_tap`/`&macro_wait_time`/timing params). That logic belongs in `core/zmk/macro.ts`, symmetric with `holdTap.ts`/`modMorph.ts`. The visual builder (`ui/inspector/macroEditor/`) is drag-and-drop reordering over that model; the existing homegrown drag logic used for layer reordering (`onDragStart`/`onDragOver`/`onDrop` on layer rows) is a reasonable pattern to extend here rather than reaching for a new dependency, though a small library (e.g. `@dnd-kit`) is a fine alternative if the interaction gets more complex (multi-column drop targets, etc.).

**Flows Automations (formerly "Capabilities Marketplace") — landed early, in a deliberately smaller shape than originally envisioned here, then corrected twice after real use.** `core/capabilities/{paramBinding,catalogSchema,jqRunner,applyFlow,builtinCatalog}.js` (plain JS, same pattern as `core/io/`) is the actual v1: browse a catalog and *apply* an automation directly — no `capabilityRegistry.ts`, no `extensions/` top-level folder, no install/uninstall lifecycle or persisted state beyond the last run's result. That's a deliberate scope cut (confirmed with the project owner): an automation (internally, a "Flow") is a one-shot jq mutation, not something with a lifecycle to manage, matching how Flows4JSON's own app already treats them. `applyFlow.js` runs an automation's jq transform (`jqRunner.js`, against a plain JSON snapshot of the config — no live references) and hands the result to the *existing* `loadLayoutObject` (this repo's `schemas/validate.ts` equivalent) before it's allowed anywhere near React state; a passing result then goes through the *same* `runGC` every other edit does. The "bundles can be literal `.flows` artifacts" synergy this section hoped for turned out to be exactly true, confirmed by reading the real `moosylog/flows4json` repo: `buildScriptWithParams` replicates that app's own `getScriptWithParams` param-binding algorithm byte-for-byte. A second, less obvious replication turned out to matter just as much: Flows4JSON's own app runs every uploaded file through a "normalizer prologue" before any flow ever executes, synthesizing a `.layout.keys` positional structure real MoErgo exports never have (some real automations — the Home-Row Mods family — read it directly). `applyFlow.js` now runs that exact prologue too, discovered only after a real user hit jq's own unhelpful "Cannot iterate over null (null)" — a reminder that "copy the param-binding algorithm" wasn't the whole portability contract; the input-normalization step was just as load-bearing and much easier to miss by reading the *scripts* rather than the app's upload handler.

The catalog itself was the second correction: v1 fetched `catalog.json` live from `moosylog.github.io` at runtime. Feedback was that these should be "part of GLIDE," not pointing at an external site — so `builtinCatalog.js` now bundles the catalog directly in the repo, each entry run for real against a real layout before being added, with a regression test (`tests/core/capabilities.test.js`'s `builtinCatalog` suite) that re-runs all of them on every test pass, and that also pins the exact set of uids expected so a silent addition or regression doesn't slip by unnoticed. First pass bundled 6 of upstream's real automations (one per category that existed then, individually verified rather than nominally porting everything); a second pass, believing the *live site's* `catalog.json` (12 entries) was the full upstream catalog, added the remaining 4 to bring the bundled set to 10. That assumption was wrong, and a real user caught it: the live site lags the **repo's own** `catalog.json` (`github.com/moosylog/flows4json`), which actually lists 38 entries. The third pass re-sourced from the repo directly and bundled every real mutator in it — 32, once six are excluded for cause, not for scope: five launcher cards (`colors_launch_kiilix`, `l_cleaner`, `l_hrm_tuner`, `l_oryx_swap`, `l_qwerty_swap` — no script, just an `appUrl`) and `hrm_bil_dynamic`, which upstream's own `catalog.json` files under a `category` of `"Test"` with a `script` that's verifiably truncated mid-expression — it fails to even compile, which reads as an unfinished publish upstream, not something to patch around here. That pass also caught a real upstream data bug (two entries both literally uid'd `se_symbol`, one Windows/Linux, one macOS — disambiguated here as `se_symbol_mac`) and a second instance of the same Go60-geometry conflict already found in `colors_createRGBscheme` (`mirror_keyboard_halves` hard-codes the identical exact-60-keys check), both scoped to `glove80`-only rather than shipped silently broken on Go60. Bundling still trades a live-fetched catalog's free upstream-tracking for GLIDE-side work validating each addition by hand — judged non-negotiable once the alternative is shipping unverified scripts, especially given how easy it turned out to be to under-count upstream's own catalog by relying on its deployed mirror instead of its source. The format gained one field with no upstream equivalent, `successMessage` — hand-written per entry, shown only on an actually-successful apply.

**UI placement and browsing, corrected three times after real use.** The automations browser first shipped as a third tab beside Layers/Combos in the left nav. That was a mistake worth recording: Layers and Combos are editing *modes* — surfaces you keep flipping between for the length of an editing session — while an automation is a one-shot, occasional action, closer in kind to Export than to Combos. It now opens as a modal from a toolbar button, matching `ui/inspector/` in spirit for the eventual `ui/` decomposition: an automation's browse/detail/apply UI is an *overlay* over the editing surface, not a fourth thing living inside it. The second correction was to browsing itself: a flat, scrolling list of every automation got harder to navigate as the catalog grew, so the modal's home screen is now an app-store-style grid of category tiles — icon, a small preview strip of that category's own automation icons, name, count — drilling into a category's own list and then an automation's detail view; a search box skips both levels and matches across all categories. Every list row and detail view also shows a short hardware badge (`flowHardwareLabel` in `glide.html`: "Go60 · Glove80", "Go60 only", "Glove80 only") so compatibility is visible while scanning. And after a run, what used to be a shared "Recent Activity" log is now a small result box scoped to that one automation's own detail view — success plus its custom `successMessage`, or the real jq error — since the ask was specifically for a result *of that run*, not a feed of every run.

The third correction, once the catalog grew to 32 entries across nine categories: showing an incompatible automation at all — dimmed, with a disabled Apply button and a "Not compatible with this keyboard" banner — stopped being the right call. A real request was explicit about it: a Go60 owner should only ever see Go60-compatible automations, a Glove80 owner only Glove80-compatible ones, full stop, not a browsable dead end. `glide.html` now filters the bundled catalog down to the current keyboard's compatible subset (`isFlowCompatible`, once per config change, before it's ever handed to `CapabilitiesModal`) rather than filtering inside the modal's render — which let the modal's own dimming/disabling logic be deleted outright instead of maintained alongside a second filtering mechanism. A category with zero automations for the loaded keyboard simply doesn't appear in the grid; search only ever surfaces automations that would actually work. External-app "launcher" catalog cards (empty `script`, an `appUrl` instead) are still dropped entirely at the `catalogSchema.js` parse boundary — GLIDE never opens a URL on the user's behalf as part of this feature, by design, not just by omission in the UI; not moot now that the full upstream catalog is bundled, since five real entries are exactly this case.

**Startup performance and file handling — both landed early, out of direct user feedback rather than the roadmap order above.** Neither needed new domain logic (unlike Macro Builder, say), so both were straightforward to do now rather than wait for a Vite-based Phase 0.

*Startup* used to load, for every visitor, with zero loading feedback while React/ReactDOM's development builds, Babel Standalone, the Tailwind CDN's in-browser JIT compiler, and jq-web's wasm engine all downloaded and (for Tailwind) recompiled at runtime, several blocking network round-trips deep, before anything painted. Fixed without a bundler: a plain-HTML/CSS splash screen in `glide.html`'s `<body>` (no React/Babel dependency, since it has to render before either has necessarily finished loading) now shows immediately and removes itself once the real UI has mounted; the three head `<script>` tags for React/ReactDOM/Babel are `defer`red so the browser can reach and paint that splash instead of blocking on those three round-trips first; React/ReactDOM point at their production builds instead of development ones; and — the largest single cut — the Tailwind CDN's runtime compiler is replaced by a static, pre-generated stylesheet (`core/styles/tailwind.generated.css`, built by `npm run build:css` from a real `tailwindcss@3` CLI + the same theme-extension object that used to be handed to the CDN's `tailwind.config = {...}`; see `core/styles/README.md`), and jq-web's wasm binary is no longer loaded upfront for everyone — `ensureJqEngineLoaded` in `glide.html` injects that one `<script src>` itself, lazily, the first time Flows Automations is actually opened. None of this needed Vite: a static-CSS build step and `defer`/lazy-`<script>` are within what a build-step-free single HTML file can already do: the Vite migration in §7 is still real, but for a much smaller, more targeted win than "startup is slow."

*File handling* was a real, reported gap, not a nice-to-have: once a layout was loaded, the "Load File"/template buttons that exist on the empty start screen simply had no equivalent afterward — the only path back to them was an unlabeled click on the sidebar's "GLIDE" logo, itself firing a native `window.confirm(...)` with no way to save first, and since there was no autosave, "unsaved changes" in that popup's text was *always* true. First fixed with a File menu hidden behind one icon button in a floating toolbar pill, the `isDirty`/`beforeunload`/`guardUnsavedChanges` mechanism described above §5's UI & Workspace Enhancements note, and one new small component, `ConfirmDialog`, replacing all four of the app's native `window.confirm()` call sites (detach-shared-behavior, delete-layer, clear-all-actions, and the discard-guard) with an in-app dialog that can offer a real third option — "Export First" — not just discard-or-cancel. `ConfirmDialog` and the underlying `isDirty` mechanism weren't touched again below; what needed a second pass was purely *where* file-level UI lived.

**Top bar and panel placement — corrected once, from direct UX feedback, right after the file-handling pass above shipped.** The floating icon-only File menu, plus an unsaved-changes dot living inside the Layers/Combos sidebar's own header, drew real criticism: file-level chrome was competing visually and structurally with the content panel it sat on top of, and a single icon hiding New/Import/Export was exactly the kind of undiscoverable menu Nielsen Norman Group's menu-design guidance warns against. Two decisions were made deliberately, not by default: (1) a persistent, full-width `<header>` now carries file identity (GLIDE mark, layout name, unsaved dot) on the left and labeled New/Import/Export plus Undo/Redo/Settings/Flows-Automations on the right — this is the *only* place any of that lives now, so the Layers/Combos sidebar's own header is gone and that `<aside>` is purely a content-editing surface; (2) rather than building true freeform dockable panels (the VS Code/Blender/Figma pattern — real flexibility, real learning curve, the wrong trade for a tool aimed at non-technical keyboard owners first), GLIDE gained one more **curated layout preset** alongside the existing `layoutMode` (bottom/right key inspector): `sidebarSide` (left/right for the Layers/Combos panel itself), same `localStorage`-persisted shape, exposed the same way in Settings. Both toggles are a CSS `order` swap on sibling flex children, not a rewrite — `sidebarSide` additionally mirrors the resize-handle side and drag-direction sign so resizing still feels correct with the panel on either side. The canvas-contextual floating pills (Zen-Mode/clipboard/hint top-center, zoom bottom-right) were deliberately left where they are: they describe the canvas itself, not file state, so the header redesign didn't touch them.

## 6. Tooling recommendations

- **Vite** for the dev server/bundler — fast, minimal config, and the plugin ecosystem matters once `jq-wasm` needs lazy-loading for the marketplace.
- **TypeScript, adopted incrementally, `schemas/` and `core/` first.** These are exactly the modules where this session's real bugs lived (an ambiguous `null` vs. object shape, a stale-state batching mistake) — the modules with the highest payoff from static typing. `ui/` can stay `.jsx` for longer if that's a smoother transition; `tsconfig.json` with `allowJs: true` supports mixing both during migration.
- **Vitest** for `core/`/`schemas/` unit tests — no DOM needed, matching principle #1.
- **Playwright** for `tests/e2e/`, replacing the ad-hoc jsdom harnesses used to find and confirm this session's fixes with a permanent, repeatable suite — the two real sample layouts become committed fixtures, and every bug found from here on gets a fixture-based regression test before it's marked fixed.
- **GitHub Actions**: `ci.yml` runs lint + typecheck + `vitest` + `playwright` + build on every PR; `deploy.yml` builds and publishes to GitHub Pages on merge, so "run this from GitHub" means both "clone and `npm run dev`" and "there's always a live deployed build at a Pages URL."
- **ESLint import-boundary rule** (e.g. `eslint-plugin-boundaries` or a custom rule): enforce that `core/` and `schemas/` cannot import from `ui/`, `state/`, or `extensions/`. This is the one guardrail worth automating rather than relying on code review, since it's exactly the kind of rule that erodes silently under deadline pressure otherwise.

## 7. Migration strategy (incremental, not big-bang)

The app works and is actively being tested against real files — the migration should never leave it in a broken state between phases.

1. **Phase 0 — scaffold.** Stand up the Vite + TS repo skeleton alongside the existing `glide.html`, wired to build to a single output bundle so deployment behavior doesn't change yet.
2. **Phase 1 — extract `core/`.** Pure functions, zero JSX, easiest to move and highest immediate value: write Vitest tests *first* using this session's known bug scenarios (empty-key Layer-Tap, Clear-All-Actions, the layer-reindexing fix, the naming convention) as the initial regression suite, then move the functions in behind those tests.
3. **Phase 2 — extract `schemas/` and `io/`.** Type the layout format, route file load/export through validation. Two self-contained slices of this have landed early, ahead of the rest of Phase 2:
   - `core/behaviors/{schemas,registry,compile}.js` — hold-tap/tap-dance settings became schema-driven (a `DynamicBehaviorForm` component renders any behavior's whole settings panel from a declarative property list, no per-property JSX), because it was the part of the UI accumulating the most one-off logic already.
   - `core/io/{layoutSchema,loadLayout,exportLayout}.js` — the top-level layout shape now has a real (permissive, not a strict allowlist — see the file header) validator, and `handleFileUpload`/`fetchTemplate`/`handleExport` in `glide.html` are thin DOM/network adapters over pure `parseLayoutJson`/`loadLayoutObject`/`serializeLayout` functions. This is what makes "plug into an API instead of a file picker" (see the roadmap items above) a matter of writing a new adapter later, not touching validation or serialization logic.

   Both are deliberately plain JS objects/functions rather than TOML or a TS+Zod-style schema — a format needing its own parser or a bundler would either add a dependency for no real benefit pre-Vite, or smuggle a toolchain migration in under a feature that didn't ask for one; plain JS loads like every other `core/*.js` module and stays Vitest-testable today.

   A third slice has also landed early, out of Phase 5's roadmap rather than Phase 2's, since it was the next feature requested: `core/capabilities/{paramBinding,catalogSchema,jqRunner,applyFlow,builtinCatalog}.js` — a v1 Flows Automations engine (browse/apply a GLIDE-bundled, individually-verified catalog; see §5's "Flows Automations" for the full design note, what was deliberately cut from it, and the two UI-placement corrections). It reuses `core/io/loadLayout.js`'s `loadLayoutObject` as its result validator and loads the real `jq-web` engine the same way Flows4JSON's own app does — tested against real `.flows` files with the real jq-web engine (not mocked), which is how a CRLF-mistokenization quirk, an error-message-stripping quirk, a missing `.layout.keys` normalizer step, and a Go60 key-count mismatch in one bundled entry were all actually found rather than assumed.
4. **Phase 3 — decompose `ui/`** component by component (start with the least-coupled: `MiniKeyboardMap`, then `Key`/`KeyboardCanvas`, then the inspector panels), keeping `App.tsx` as a thinning shell throughout rather than deleting it in one step.
5. **Phase 4 — introduce `state/`** properly, replacing the `useState` soup with the store modules, one store at a time (`layoutStore` first, since it's the one everything else reads).
6. **Phase 5 — build `extensions/`** for the Marketplace, once `core/`+`schemas/` are stable enough to be a trustworthy target for third-party transforms to validate against.

Each phase should leave `main` deployable. Roadmap features can start landing as soon as their home directory exists — they don't need to wait for the full migration to finish.
