# GLIDE

**G**raphical **L**ayout & **I**ntent **D**efinition **E**ditor — a visual keymap editor for
MoErgo's ZMK-based keyboards ([Glove80](https://www.moergo.com/) and Go60).

Load your keymap JSON (exported from [MoErgo's Layout Editor](https://my.glove80.com)), edit it
visually — keys, layers, combos, macros, hold-taps — and export a file that drops straight back
into MoErgo's importer. No install, no account, nothing to build.

## Quick start

Just use it: **[moosylog.github.io/glide](https://moosylog.github.io/glide/)** — that's the live
app, served straight from this repo's source, no build step in between.

To run it yourself, clone the repo and serve it with any static file server (a plain
`file://` double-click won't load `core/*.js`/`ui/*.js` — browsers block that over `file://`,
but not over `http(s)`, which is exactly how GitHub Pages serves it):

```bash
git clone https://github.com/moosylog/glide.git
cd glide
npx serve .
# or: python3 -m http.server
```

Want one portable `.html` file you can download and open offline with no server at all? Run
`npm run build:bundle` (see [Development](#development)) — it inlines everything into a single
file for exactly that case.

## Features

- **Visual keymap editing** — click a key, pick an action; drag a key onto another to swap
  bindings; drag layers to reorder them.
- **Full layer management** — add, clone, rename, delete, and reorder layers, with automatic
  layer-index bookkeeping (nothing else silently breaks when you insert or remove a layer).
- **Advanced ZMK behaviors** built in their own editors, not raw JSON: macros, hold-taps,
  sticky keys, mod-morphs, tap-dances, and combos (with live conflict detection).
- **Flows Automations** — a built-in library of one-click layout transforms (33 automations
  across categories like Smart Modifiers, Typing Layouts, Operating System, Productivity Macros,
  Gaming, Decorations & RGB, Mouse Controls, and international Symbol layouts), each scoped to
  the board it's compatible with.
- **Go60 trackpad support** — configure and swap the Cirque trackpads' click/scroll behavior.
- **Undo/redo and garbage collection** — deleted bindings clean up their own now-unused custom
  behaviors instead of leaving orphaned definitions behind.
- **Works entirely offline, client-side** — your layout never leaves your browser.

## Project structure

```
glide.html           # the real source: React UI + <script src="..."> tags into core/ and ui/
index.html           # an exact copy of glide.html, kept in sync automatically (see below) —
                      # this is the name GitHub Pages requires at the repo root to serve it
core/                # framework-free domain logic (ZMK bindings, geometry, schemas, capabilities/Flows engine)
ui/                  # React components (sidebar, canvas, inspector, modals, top bar)
flows/               # Flows Automations, one .flows file each, under shared/glove80/go60/ + generated index.json
tests/               # vitest suite — core/ unit tests (Node) + ui/ integration tests (jsdom)
scripts/             # build tooling (bundleSingleFile.mjs inlines everything into one portable file, on demand)
.github/workflows/    # auto-syncs index.html from glide.html, and flows/index.json from flows/**, on every push
ARCHITECTURE.md       # the modularization plan and module responsibilities
DEVLOG.md             # a running log of notable fixes and design decisions, oldest first
```

`glide.html` and `index.html` are the same app — edit `glide.html`; a GitHub Actions workflow
(`.github/workflows/sync-pages.yml`) copies it to `index.html` and commits that automatically on
every push to `main`, so the live Pages site always matches the source with no manual step and
no build in between.

## Development

```bash
npm install
npm test               # runs the full vitest suite (core/ + ui/)
npm run build:bundle    # produces a single portable dist/glide.html for offline/no-server use
npm run build:css       # regenerates core/styles/tailwind.generated.css
npm run build:flows     # regenerates flows/index.json from flows/**/*.flows
```

`glide.html` is the file to edit — it pulls in `core/*.js` and `ui/*.js` via ordinary
`<script src>` tags, which is all GitHub Pages (or any static server) needs; no build step is
part of deploying it. `npm run build:bundle` is only for producing a standalone, single-file
copy for offline use — it's not used by the live site. See [`ARCHITECTURE.md`](./ARCHITECTURE.md)
for why the source is structured this way, and [`DEVLOG.md`](./DEVLOG.md) for the history of how
it got here.

**Adding or changing a Flows Automation never touches app code.** Each one is a standalone
`.flows` file (the same TOML-ish format [flows4json](https://github.com/moosylog/flows4json)
itself uses — `uid`/`title`/`description`/`script`/`[manifest]`/`[[param]]` — plus a GLIDE-only
`successMessage` field shown after a successful Apply) under `flows/shared/` (works on both
keyboards), `flows/glove80/`, or `flows/go60/`. Add, edit, or delete a `.flows` file, then run
`npm run build:flows` to regenerate `flows/index.json` — the compiled catalog `glide.html` fetches
at startup. A GitHub Actions workflow (`sync-flows-index.yml`) does this automatically and commits
the result on every push touching `flows/**`, so a forgotten manual rebuild never ships stale.

## Status

Actively developed. [`ARCHITECTURE.md`](./ARCHITECTURE.md) tracks the migration plan and what's
done vs. planned; [`DEVLOG.md`](./DEVLOG.md) is the full history of fixes and design decisions.

## Author

Built by [Moosy](https://github.com/moosylog).
