// core/capabilities/catalogSchema.js — a defensive parser for a fetched Flows4JSON catalog.json.
// Mirrors core/io/layoutSchema.js's philosophy: validate only the fields GLIDE's own UI/logic
// actually branches on, and pass every other field through untouched. A catalog entry we don't
// fully understand should still render (title/subtitle/category at minimum) rather than vanish,
// since the catalog is third-party content GLIDE doesn't control the shape of over time.
//
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});

    // GLIDE only ever runs a Flow's own jq script against the loaded config — it never opens
    // an external URL on the user's behalf. Some real catalog entries are "launcher" cards
    // (empty `script`, an `appUrl` instead — e.g. colors_launch_kiilix.flows, which just points
    // at a third-party website) rather than mutations; those are filtered out entirely, at this
    // one boundary, so nothing downstream (the catalog list, the detail view) ever has to know
    // launchers exist. A card with neither a usable script nor (the now-irrelevant) appUrl is
    // dropped for the same reason it always was: there'd be nothing GLIDE could do with it.
    const hasUsableScript = (entry) => typeof entry.script === 'string' && entry.script.trim().length > 0;

    // Normalizes one raw catalog entry into the shape GLIDE's Capabilities panel renders,
    // tolerating missing optional fields. Returns null when the entry is missing what makes it
    // identifiable (no uid) or usable (no script to run — see hasUsableScript above).
    const normalizeFlowEntry = (raw) => {
        if (!raw || typeof raw !== 'object' || typeof raw.uid !== 'string' || !raw.uid) return null;
        const manifest = (raw.manifest && typeof raw.manifest === 'object') ? raw.manifest : {};
        const config = (raw.config && typeof raw.config === 'object') ? raw.config : {};
        const param = Array.isArray(raw.param) ? raw.param.filter(p => p && typeof p.id === 'string' && p.id) : [];
        const entry = {
            uid: raw.uid,
            title: typeof raw.title === 'string' && raw.title ? raw.title : 'Untitled',
            subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : '',
            description: typeof raw.description === 'string' ? raw.description : '',
            script: typeof raw.script === 'string' ? raw.script : '',
            category: typeof raw.category === 'string' && raw.category ? raw.category : 'Utilities',
            manifest: {
                author: typeof manifest.author === 'string' ? manifest.author : '',
                keyboards: Array.isArray(manifest.keyboards) ? manifest.keyboards : null,
                icon: typeof manifest.icon === 'string' ? manifest.icon : '🧩',
                theme: typeof manifest.theme === 'string' ? manifest.theme : null,
            },
            config: { category: typeof config.category === 'string' ? config.category : '', num: typeof config.num === 'number' ? config.num : null },
            param,
            mediaUrl: typeof raw.mediaUrl === 'string' ? raw.mediaUrl : null,
            // Not part of the upstream .flows format — see builtinCatalog.js's header. Shown in
            // the result box after a successful Apply, as author-provided "what now" guidance.
            successMessage: typeof raw.successMessage === 'string' ? raw.successMessage : '',
        };
        if (!hasUsableScript(entry)) return null;
        return entry;
    };

    // rawJson: the parsed (already JSON.parse'd) body of catalog.json — an array of raw entries.
    // Returns { entries, errors } — entries is always an array (possibly empty); malformed
    // individual entries (and launcher/appUrl-only cards) are dropped and reported in errors
    // rather than failing the whole catalog.
    const parseCatalog = (rawJson) => {
        if (!Array.isArray(rawJson)) return { entries: [], errors: ['Catalog is not a list of flows.'] };
        const entries = [];
        const errors = [];
        rawJson.forEach((raw, i) => {
            const normalized = normalizeFlowEntry(raw);
            if (normalized) entries.push(normalized);
            else errors.push(`Skipped catalog entry #${i}: no uid, or no runnable script (external-app launcher cards are not supported).`);
        });
        return { entries, errors };
    };

    // A flow is usable against `config` when it declares no keyboard restriction at all, or when
    // the layout's own .keyboard is in its manifest.keyboards list — matches the live app's own
    // "safely turns off the Apply button" gating.
    const isFlowCompatible = (entry, config) => {
        if (!entry.manifest.keyboards) return true;
        const kb = config && typeof config.keyboard === 'string' ? config.keyboard : null;
        return !!kb && entry.manifest.keyboards.includes(kb);
    };

    Object.assign(GlideCore, { normalizeFlowEntry, parseCatalog, isFlowCompatible });
})();
