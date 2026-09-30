// tailwind.config.js -- drives the static build (`npm run build:css`) that replaces the
// Tailwind CDN's in-browser JIT compiler at runtime. This config is the exact object that used
// to be handed to `tailwind.config = {...}` inside glide.html's <head> for the CDN ("Play")
// build -- kept byte-for-byte equivalent so the generated stylesheet matches what the CDN
// compiler would have produced, class for class.
//
// `content` points at glide.html itself (and any future core/**/*.js UI helpers that might grow
// className strings) so every utility class actually used gets generated; nothing here is
// hand-picked. See core/styles/README.md for when and how to regenerate the output file.
module.exports = {
    content: ['./glide.html', './core/**/*.js'],
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
