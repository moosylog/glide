# core/styles/

`tailwind.generated.css` is what `glide.html` actually loads (a `<link rel="stylesheet">`, right
where the Tailwind CDN `<script>` used to sit). It replaces the Tailwind CDN's Play build, which
downloaded the whole compiler and re-ran it in-browser on every page load — one of the real
contributors to GLIDE's slow startup (see ARCHITECTURE.md's "Startup performance" note).

It's a **generated file** — never hand-edit it. If you add, rename, or remove a Tailwind utility
class anywhere in `glide.html` (or a `core/**/*.js` UI helper), regenerate it:

```sh
npm run build:css
```

That runs the real Tailwind CLI (`tailwindcss@3`, a devDependency — see `package.json`) against
`tailwind.input.css` and `tailwind.config.js` (the same theme extension — app color tokens,
fonts, easing — that used to be handed to `tailwind.config = {...}` for the CDN build) and
scans `glide.html` for every class actually used, so nothing here is hand-picked. Commit the
regenerated file along with whatever UI change needed the new class(es) — CI doesn't rebuild it
for you, and a missing class silently renders unstyled rather than failing loudly.
