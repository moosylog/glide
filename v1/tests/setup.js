// core/*.js files are classic scripts that attach their exports to window.GlideCore
// (they're loaded via <script src> in glide.html, not real ES modules — see README.md).
// There's no browser here, so alias `window` to globalThis before any of them are
// imported for their side effects.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
