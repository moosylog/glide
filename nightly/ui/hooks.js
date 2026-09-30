// GLIDE UI — custom hooks (Stage 2 modularization — see ARCHITECTURE.md §7 and README.md's
// "Status" section)
//
// Small, self-contained slices of App's state lifted into their own functions — the same "pure
// extraction, not a rewrite" move Stage 1 applied to components, applied here to state instead.
// Every name a hook below returns is used inside App's own body exactly as the raw
// useState/useCallback declaration it replaces was (same variable names, same setter behavior,
// same effect timing) — this only changes WHERE the declarations live, never what they do or how
// anything calls them. Plain JS, no JSX, so this loads as an ordinary classic script like
// core/*.js and ui/shared.js.
(function () {
    // NOTE: intentionally not destructured here. This file is a plain, non-`defer`red, non-Babel
    // <script> (see the file banner above), so it runs synchronously as soon as the parser reaches
    // it — which is BEFORE the `defer`red React/ReactDOM/Babel <script> tags in <head> have run
    // (deferred scripts always execute after parsing finishes, regardless of where their tag sits
    // in the document; see glide.html's own comment on those three tags). `React` is therefore
    // still undefined at this point in real page loads, even though every jsdom-based test in
    // tests/ui/ sets `window.React` up front and never catches this ordering. Each hook below reads
    // off `React` itself instead, since by the time a hook actually RUNS (React rendering App),
    // React has long since finished loading.
    const { runGC } = window.GlideCore;

    // A localStorage-backed useState, for every small GLIDE setting that just needs to survive a
    // reload (theme, layout mode, sidebar side, OS override, the Layers/Combos panel's saved
    // width) — replaces five near-identical "lazy-init from localStorage, write-effect on
    // change" pairs that used to be spelled out individually in App. `parse` converts the raw
    // stored string back to the setting's real type (defaults to identity, i.e. plain strings);
    // `onChange` covers a setting with a side effect beyond persistence itself, like theme also
    // setting `document.documentElement.className`.
    function usePersistedState(storageKey, defaultValue, options = {}) {
        const { useState, useEffect } = React;
        const { parse = (raw) => raw, onChange } = options;
        const [value, setValue] = useState(() => {
            const raw = localStorage.getItem(storageKey);
            return raw === null ? defaultValue : parse(raw);
        });
        useEffect(() => {
            localStorage.setItem(storageKey, String(value));
            if (onChange) onChange(value);
        }, [value]);
        return [value, setValue];
    }

    // The whole undo/redo + dirty-tracking engine around `config`, GLIDE's one piece of real
    // layout state. Every call site elsewhere in App (loading a file, every edit handler that
    // ends in pushHistory(newConfig), the Undo/Redo buttons, the beforeunload warning, the
    // browser tab's "• " title prefix) keeps working completely unchanged, since it's still just
    // reading `config`/`isDirty` or calling `pushHistory`/`undo`/`redo`/`setConfig` — the same
    // names, now sourced from this hook's return value instead of top-level useState calls
    // scattered roughly 250 lines apart in the pre-Stage-2 file.
    function useUndoHistory() {
        const { useState, useEffect, useCallback } = React;
        const [config, setConfig] = useState(null);
        const [undoStack, setUndoStack] = useState([]);
        const [redoStack, setRedoStack] = useState([]);

        // True from the first edit after a load/import until the next Export (or the next load,
        // which starts fresh) — the single source of truth for "would closing this tab or
        // switching files lose something."
        const [isDirty, setIsDirty] = useState(false);
        useEffect(() => {
            const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
            window.addEventListener('beforeunload', handler);
            return () => window.removeEventListener('beforeunload', handler);
        }, [isDirty]);
        useEffect(() => {
            document.title = (isDirty ? '• ' : '') + 'GLIDE — Graphical Layout & Intent Definition Editor';
        }, [isDirty]);

        const pushHistory = useCallback((newConfig) => {
            const cleanedConfig = runGC(newConfig);
            setUndoStack(prev => [...prev.slice(-99), structuredClone(config)]);
            setRedoStack([]);
            setConfig(cleanedConfig);
            setIsDirty(true);
        }, [config]);

        const undo = () => {
            if (undoStack.length === 0) return;
            const prevConfig = undoStack[undoStack.length - 1];
            setRedoStack(prev => [...prev, structuredClone(config)]);
            setUndoStack(prev => prev.slice(0, -1));
            setConfig(prevConfig);
            setIsDirty(true);
        };
        const redo = () => {
            if (redoStack.length === 0) return;
            const nextConfig = redoStack[redoStack.length - 1];
            setUndoStack(prev => [...prev, structuredClone(config)]);
            setRedoStack(prev => prev.slice(0, -1));
            setConfig(nextConfig);
            setIsDirty(true);
        };

        return {
            config, setConfig,
            undoStack, setUndoStack,
            redoStack, setRedoStack,
            isDirty, setIsDirty,
            pushHistory, undo, redo,
        };
    }

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { usePersistedState, useUndoHistory });
})();
