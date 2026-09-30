// tailwind.config.js -- drives the static build (`npm run build:css`) that replaces the
// Tailwind CDN's in-browser JIT compiler at runtime. This config is the exact object that used
// to be handed to `tailwind.config = {...}` inside glide.html's <head> for the CDN ("Play")
// build -- kept byte-for-byte equivalent so the generated stylesheet matches what the CDN
// compiler would have produced, class for class.
//
// `content` points at glide.html itself plus every core/**/*.js and ui/**/*.js file so every
// utility class actually used gets generated; nothing here is hand-picked. This bit GLIDE for
// real once already: the UI was split out of glide.html into ui/*.js (topBar.js, sidebar.js,
// inspector.js, modals.js, ...) in an earlier refactor, but this config's content glob was never
// updated to scan that new directory -- the checked-in tailwind.generated.css still had every
// class it needed (generated before that split, or hand-patched since), so nothing looked
// broken until someone next ran `npm run build:css`, which silently purged every utility class
// that appears ONLY in a ui/*.js file and nowhere else GLIDE scans (glide.html, core/**/*.js).
// The result: those elements render with no layout/positioning classes at all -- panels collapse
// to block-flow and stack/overlap instead of sitting where they should. See
// core/styles/README.md for when and how to regenerate the output file.
module.exports = {
    content: ['./glide.html', './core/**/*.js', './ui/**/*.js'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                app: {
                    base: 'var(--bg-base)', surface: 'var(--bg-surface)', panel: 'var(--bg-panel)', card: 'var(--bg-card)',
                    border: 'var(--border-subtle)', borderHighlight: 'var(--border-highlight)',
                    text: 'var(--text-main)', textMuted: 'var(--text-muted)',
                    accent: 'var(--accent-primary)', accentHover: 'var(--accent-hover)', accentGhost: 'var(--accent-ghost)'
                }
            },
            fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
            transitionTimingFunction: { 'premium': 'cubic-bezier(0.4, 0, 0.2, 1)' }
        }
    },
    plugins: [],
};
