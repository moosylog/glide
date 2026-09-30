# GLIDE

**G**raphical **L**ayout & **I**ntent **D**efinition **E**ditor — a visual keymap editor for
MoErgo's ZMK-based keyboards ([Glove80](https://www.moergo.com/) and Go60), built as a single
self-contained HTML file.

Load your keymap JSON (exported from [MoErgo's Layout Editor](https://my.glove80.com)), edit it
visually — keys, layers, combos, macros, hold-taps — and export a file that drops straight back
into MoErgo's importer. No install, no account, no server: open `index.html` in a browser and
you're editing.

## Quick start

Grab [`index.html`](./index.html) and open it in any modern browser — that's the whole app, one
file, nothing to install. Or clone the repo and open it locally:

```bash
git clone https://github.com/moosylog/glide.git
cd glide
open index.html   # or just double-click it
```

## Features

- **Visual keymap editing** — click a key, pick an action; drag a key onto another to swap
  bindings; drag layers to reorder them.
- **Full layer management** — add, clone, rename, delete, and reorder layers, with automatic
  layer-index bookkeeping (nothing else silently breaks when you insert or remove a layer).
- **Advanced ZMK behaviors** built in their own editors, not raw JSON: macros, hold-taps,
  sticky keys, mod-morphs, tap-dances, and combos (with live conflict detection).
- **Flows Automations** — a built-in library of one-click layout transforms (33 automations
  across categories like Home-Row Mods, Autoshift, Gaming, macOS remapping, Decorations & RGB,
  Mouse Controls, and international Symbol layouts), each scoped to the board it's compatible
  with.
- **Go60 trackpad support** — configure and swap the Cirque trackpads' click/scroll behavior.
- **Undo/redo and garbage collection** — deleted bindings clean up their own now-unused custom
  behaviors instead of leaving orphaned definitions behind.
- **Works entirely offline, client-side** — your layout never leaves your browser.

## Project structure

```
index.html          # the shippable app — a single self-contained file, zero dependencies
glide.html           # the source template: React UI + <script src="..."> tags into core/ and ui/
core/                # framework-free domain logic (ZMK bindings, geometry, schemas, capabilities/Flows engine)
ui/                  # React components (sidebar, canvas, inspector, modals, top bar)
tests/               # vitest suite — core/ unit tests (Node) + ui/ integration tests (jsdom)
scripts/             # build tooling (bundleSingleFile.mjs assembles glide.html + core/ + ui/ -> index.html)
ARCHITECTURE.md       # the modularization plan and module responsibilities
DEVLOG.md             # a running log of notable fixes and design decisions, oldest first
```

## Development

```bash
npm install
npm test               # runs the full vitest suite (core/ + ui/)
npm run build:bundle    # rebuilds index.html from glide.html + core/ + ui/
npm run build:css       # regenerates core/styles/tailwind.generated.css
```

`glide.html` is the file to edit — it pulls in `core/*.js` and `ui/*.js` via ordinary
`<script src>` tags (no bundler at dev time). `npm run build:bundle` inlines all of that into
the single `index.html` file that actually ships. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for
why it's structured this way, and [`DEVLOG.md`](./DEVLOG.md) for the history of how it got here.

## Status

Actively developed. [`ARCHITECTURE.md`](./ARCHITECTURE.md) tracks the migration plan and what's
done vs. planned; [`DEVLOG.md`](./DEVLOG.md) is the full history of fixes and design decisions.

## Author

Built by [Moosy](https://github.com/moosylog).
