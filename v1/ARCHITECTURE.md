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
│   │   │   └── touchpadPanel/           # NEW roadmap — Touchpad Configuration (see §5)
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

**Touchpad Configuration.** Touchpads aren't a discrete-key matrix, so they get their own geometry type (`core/geometry/touchpad.ts`) rather than being forced into the existing per-key grid — pointer regions, not key indices. A `schemas/touchpad.schema.ts` defines the data shape (likely gesture-zone definitions plus `&mmv`/`&mkp`-style bindings), and `ui/inspector/touchpadPanel/` is a new, isolated panel. `KeyboardCanvas.tsx` gets a rendering branch for pointer regions alongside key regions, but the touchpad *data model* never leaks into `core/zmk/` — a touchpad zone isn't a binding.

**UI & Workspace Enhancements.** This is what `state/workspaceStore.ts` and `ui/theme/` are for. Multi-file workflows (open/close/unsaved changes) are a workspace-level concern sitting above `layoutStore` — a workspace holds N layouts, each with its own dirty flag and undo stack; today's single-`config` model becomes one entry in that collection. Theme support replaces the current three hardcoded CSS classes (`oled`/`dark`/light) with a token system in `ui/theme/themes.ts`, with "custom theme" being a user-authored token set stored in `uiPreferencesStore`.

**Visual Combo Editor.** Mostly UI composition over logic that already exists: `core/zmk/combo.ts` already owns combo binding/keyPositions logic, and — nice existing asset — `MiniKeyboardMap.tsx` was already built generically enough (it's currently used for hold-trigger-key picking) to be reused as the combo mini-preview with zero changes. "Layer awareness" is just the combo editor reading the layer list out of `layoutStore` the same way `LayerList.tsx` does. The new surface area is entirely in `ui/inspector/comboEditor/` — an editor experience, not new domain logic.

**Macro Builder & Editor.** This is the one roadmap item that needs genuinely new *core* logic, not just new UI: GLIDE today recognizes macros only well enough to list them in the Advanced tab — it doesn't parse or synthesize `&macro` behaviors (bindings arrays with `&macro_tap`/`&macro_wait_time`/timing params). That logic belongs in `core/zmk/macro.ts`, symmetric with `holdTap.ts`/`modMorph.ts`. The visual builder (`ui/inspector/macroEditor/`) is drag-and-drop reordering over that model; the existing homegrown drag logic used for layer reordering (`onDragStart`/`onDragOver`/`onDrop` on layer rows) is a reasonable pattern to extend here rather than reaching for a new dependency, though a small library (e.g. `@dnd-kit`) is a fine alternative if the interaction gets more complex (multi-column drop targets, etc.).

**Capabilities Marketplace.** The biggest new subsystem, and the reason `extensions/` exists as a top-level sibling to `core/` rather than a subfolder of it — a marketplace capability is *not* trusted the way `core/` logic is. The flow: `capabilityRegistry.ts` takes a bundle's `.flows`-style `jq` transform, runs it through `jqRunner.ts` against a plain JSON snapshot of the current layout (no live references, no DOM, no app state — just data in), gets JSON back, and hands that to `schemas/validate.ts` before it's allowed anywhere near `layoutStore`. After validation, it goes through the *same* `core/gc.ts` pass every other edit does, so an injected capability can't leave orphaned or inconsistent behaviors behind. The natural synergy worth designing toward: bundles can be literal `.flows` artifacts from the existing JQ Flows Generator / Flows4JSON toolchain — the marketplace doesn't need a second transformation format, it can be a distribution and installation layer over jq flows that already exist.

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
3. **Phase 2 — extract `schemas/` and `io/`.** Type the layout format, route file load/export through validation.
4. **Phase 3 — decompose `ui/`** component by component (start with the least-coupled: `MiniKeyboardMap`, then `Key`/`KeyboardCanvas`, then the inspector panels), keeping `App.tsx` as a thinning shell throughout rather than deleting it in one step.
5. **Phase 4 — introduce `state/`** properly, replacing the `useState` soup with the store modules, one store at a time (`layoutStore` first, since it's the one everything else reads).
6. **Phase 5 — build `extensions/`** for the Marketplace, once `core/`+`schemas/` are stable enough to be a trustworthy target for third-party transforms to validate against.

Each phase should leave `main` deployable. Roadmap features can start landing as soon as their home directory exists — they don't need to wait for the full migration to finish.
