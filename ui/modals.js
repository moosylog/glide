// GLIDE UI — settings/browse modals
//
// TouchpadSettingsModal (Go60's per-layer trackpad config) and CapabilitiesModal (browse-and-
// apply UI for Capabilities/Flows), plus CapabilitiesModal's own small helpers
// (FLOW_CATEGORY_ICONS, flowHardwareLabel). CapabilitiesModal needs ui/sharedForms.js's
// FlowParamForm, so that script tag must come first. Extracted from glide.html's single inline
// script (Stage 1 modularization, see ARCHITECTURE.md) — behavior is unchanged, only the file it
// lives in.
(function () {
    const { useState, useEffect, useMemo, useCallback, memo, useRef } = React;
        const {
            GLIDE_HT_PREFIX,
            GLIDE_MM_PREFIX,
            GLIDE_TD_PREFIX,
            GLIDE_BEHAVIOR_DESCRIPTION,
            isGlideHtName,
            isGlideMmName,
            isRecognizedTdName,
            stripGlideHtPrefix,
            stripGlideMmPrefix,
            stripTdPrefix,
            LAYER_POINTER_BEHAVIORS,
            MAX_COMBO_KEYS,
            RAW_MOD_CODES,
            ZMK_MAP,
            MOD_WRAPPER_TO_FULL,
            FULL_TO_MOD_WRAPPER,
            unwrapModChain,
            composeKeycodeParam,
            KEY_UNIT,
            KEY_SIZE,
            GLOVE80_TOTAL_WIDTH,
            GO60_TOTAL_WIDTH,
            GUTTER,
            mirrorSpecialKey,
            convertGeo,
            computeGeoBounds,
            GLOVE80_THUMB_A_LEFT,
            GLOVE80_THUMB_B_LEFT,
            GLOVE80_GEO_RAW,
            GLOVE80_GEO,
            GLOVE80_NAMES,
            GO60_THUMB_LEFT,
            GO60_ROUND_LEFT,
            GO60_GEO_RAW,
            GO60_GEO,
            GO60_NAMES,
            getLogicalName,
            runGC,
            countBehaviorUsage,
            isGlideNativeBindingValue,
            parseModMorph,
            parseHoldTap,
            parseSlots,
            makeModMorph,
            makeHoldTap,
            buildBindingAndConfig,
            formatKeycode,
            formatParam,
            formatParamFull,
            describeBinding,
            shiftLayerPointers,
            BehaviorSchemas,
            getBehaviorSchema,
            getAllBehaviorSchemas,
            getDefaultValues,
            coercePropertyValue,
            compileBehaviorProperty,
            compileBehaviorProperties,
            LAYOUT_SCHEMA_FIELDS,
            validateLayout,
            loadLayoutObject,
            parseLayoutJson,
            serializeLayout,
            getExportFilename,
            buildScriptWithParams,
            parseCatalog,
            isFlowCompatible,
            runJqScript,
            applyFlow,
            BUILTIN_FLOWS_CATALOG,
            isTouchpadIndex,
            TOUCHPAD_LABEL_BY_INDEX,
            getTouchpadConfig,
            setTouchpadConfig,
            parseChain,
            CLICK_MAPPER_CODE_BY_TARGET,
            CLICK_TARGET_LABELS,
            UNVERIFIED_CLICK_TARGETS,
            parseMacro,
            inferMacroParamCount,
            findMacroReferences,
            uniqueMacroName,
            createMacro,
            updateMacro,
            renameMacro,
            deleteMacro,
            cloneMacro,
            parseStickyKey,
            findStickyKeyReferences,
            uniqueStickyKeyName,
            createStickyKey,
            updateStickyKey,
            renameStickyKey,
            deleteStickyKey,
            cloneStickyKey,
            findModMorphReferences,
            uniqueModMorphName,
            normalizeModMorphCases,
            createModMorph,
            updateModMorph,
            renameModMorph,
            deleteModMorph,
            cloneModMorph,
            HOLD_TAP_FLAVORS,
            normalizeHoldTapFields,
            findHoldTapReferences,
            uniqueHoldTapName,
            createHoldTap,
            updateHoldTap,
            renameHoldTap,
            deleteHoldTap,
            cloneHoldTap,
            normalizeTapDanceFields,
            findTapDanceReferences,
            uniqueTapDanceName,
            createTapDance,
            updateTapDance,
            renameTapDance,
            deleteTapDance,
            cloneTapDance
        } = window.GlideCore;
    const { FlowParamForm, detectOs, renderFlowMarkdown } = window.GlideUI;

        // Browse-and-apply UI for Capabilities (GLIDE's user-facing name for what core/
        // capabilities/*.js calls Flows — a one-shot jq mutation, not a persisted install).
        // Deliberately a modal, not a left-nav tab beside Layers/Combos: those two are places
        // you spend the whole editing session flipping between; a Capability is an occasional
        // "run this against my layout" action, over almost as soon as it's opened, so giving it
        // equal, permanent real estate in the same tri-tab misrepresented it as a third editing
        // mode. `runLog` (kept by the caller, across opens) is what makes a jq failure — often a
        // cryptic message like "Cannot iterate over null (null)" — inspectable after the fact,
        // rather than only a 2.2s toast the user has to read in time.
        // Shared by every "search a Flow's text" spot below (CapabilitiesModal's own search, and
        // CommandPaletteModal's) — a plain `.includes()` substring match treats "-" as a real
        // character, so a query like "home row" (how someone would actually type it) never matches
        // catalog text that's consistently hyphenated ("Home-Row Mods", category "Home-Row Mods",
        // description "home-row keys"). Folding hyphens/underscores to spaces on both sides of the
        // comparison (and collapsing the runs of whitespace that then appear) fixes that without
        // pulling in a real fuzzy-search dependency for what's still just a substring match.
        const normalizeForSearch = (s) => (s || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

        // A single app-store-style tile — one per category, shown on the top-level browse
        // screen. Picking an icon per category (rather than trusting each flow's own icon,
        // which is really about the individual automation) keeps the grid glanceable.
        const FLOW_CATEGORY_ICONS = {
            'Home-Row Mods': '⌨️', 'Decorations & RGB': '💡', 'Special keys': '🎹', 'Autoshift': '⇪',
            'Gaming': '🎮', 'macOS': '🍎', 'QWERTY Alternatives': '🔠', 'Mouse Controls': '🖱️',
            'Symbols': '🔣',
        };

        // A short "which keyboard(s)" label — shown on every list row and detail view so
        // compatibility is visible while browsing, not just as a warning after drilling in.
        const flowHardwareLabel = (entry) => {
            const kbs = entry.manifest.keyboards;
            if (!kbs || kbs.length === 0) return 'Go60 · Glove80';
            const names = kbs.map((k) => (k === 'go60' ? 'Go60' : k === 'glove80' ? 'Glove80' : k));
            return kbs.length > 1 ? names.join(' · ') : `${names[0]} only`;
        };

        // Settings for one of Go60's two Cirque trackpads (key positions 60/61 — see
        // core/zmk/inputProcessors.js's header for why this corner of the format is encoded
        // differently from an ordinary key binding). Modeled on the same idea as MoErgo's own
        // touchpad editor — a "Default" config plus a short list of per-layer overrides — but
        // built to match the rest of GLIDE rather than copied pixel-for-pixel: the left rail
        // mirrors the Layers list's own look, and every control here edits a local draft; only
        // Apply writes it back (through pushHistory, so it's a normal undoable edit like any
        // other), and Cancel/backdrop-click/Esc discard the draft with zero side effects.
        const TouchpadSettingsModal = ({ index, config, layerNames, onClose, onSave }) => {
            const [parsed, setParsed] = useState(() => getTouchpadConfig(config, index).parsed);
            const [selected, setSelected] = useState({ type: 'base' });

            const activeChain = selected.type === 'base' ? parsed.base : parsed.overrides[selected.idx]?.chain;

            const updateChain = (mutator) => setParsed((prev) => {
                const next = structuredClone(prev);
                const chain = selected.type === 'base' ? next.base : next.overrides[selected.idx].chain;
                mutator(chain);
                return next;
            });

            const usedLayers = new Set(parsed.overrides.flatMap((o) => o.layers));
            const availableLayers = layerNames.map((_, i) => i).filter((i) => !usedLayers.has(i));

            const addOverride = (layerIdx) => {
                setParsed((prev) => ({ ...prev, overrides: [...prev.overrides, { id: null, layers: [layerIdx], chain: parseChain([]) }] }));
                setSelected({ type: 'override', idx: parsed.overrides.length });
            };
            const removeOverride = (idx) => {
                setParsed((prev) => ({ ...prev, overrides: prev.overrides.filter((_, i) => i !== idx) }));
                if (selected.type === 'override' && selected.idx === idx) setSelected({ type: 'base' });
                else if (selected.type === 'override' && selected.idx > idx) setSelected({ type: 'override', idx: selected.idx - 1 });
            };

            if (!activeChain) return null;
            const advancedCount = (activeChain.extra?.length || 0) + (activeChain.extraFlags?.length || 0);
            const ratio = activeChain.multiplier / activeChain.divisor;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
                    <div data-testid="touchpad-modal" className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-app-borderHighlight shrink-0">
                            <h3 className="text-base font-bold text-app-text flex items-center gap-2">
                                <svg className="w-5 h-5 text-app-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2" strokeWidth="1.8"></rect><path d="M3 15h18" strokeWidth="1.8" strokeLinecap="round"></path></svg>
                                {TOUCHPAD_LABEL_BY_INDEX[index]}
                            </h3>
                            <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl leading-none">&times;</button>
                        </div>

                        <div className="flex flex-1 min-h-0">
                            <div className="w-48 shrink-0 border-r border-app-borderHighlight overflow-y-auto p-3 flex flex-col gap-1">
                                <button onClick={() => setSelected({ type: 'base' })} className={`text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${selected.type === 'base' ? 'bg-app-accent text-white shadow-sm' : 'text-app-text hover:bg-app-card'}`}>
                                    Default
                                    <div className={`text-[10px] font-medium mt-0.5 ${selected.type === 'base' ? 'text-white/70' : 'text-app-textMuted'}`}>All other layers</div>
                                </button>
                                {parsed.overrides.map((ov, i) => (
                                    <div key={i} className={`group flex items-center rounded-lg transition-all ${selected.type === 'override' && selected.idx === i ? 'bg-app-accent text-white shadow-sm' : 'hover:bg-app-card'}`}>
                                        <button onClick={() => setSelected({ type: 'override', idx: i })} className="flex-1 text-left px-3 py-2.5 text-xs font-bold min-w-0 truncate">
                                            {ov.layers.map((l) => layerNames[l] || `Layer ${l}`).join(', ')}
                                        </button>
                                        <button onClick={() => removeOverride(i)} title="Remove this override" className={`w-7 h-7 mr-1 rounded flex items-center justify-center shrink-0 transition-colors ${selected.type === 'override' && selected.idx === i ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-app-textMuted hover:text-red-400 hover:bg-red-900/30'}`}>🗑️</button>
                                    </div>
                                ))}
                                {availableLayers.length > 0 && (
                                    <select value="" onChange={(e) => addOverride(Number(e.target.value))} className="mt-1 w-full bg-app-card border border-dashed border-app-borderHighlight text-app-textMuted text-xs font-semibold rounded-lg px-2.5 py-2 outline-none cursor-pointer hover:text-app-text hover:border-app-textMuted transition-colors">
                                        <option value="" disabled>+ Add layer override…</option>
                                        {availableLayers.map((i) => <option key={i} value={i}>{layerNames[i] || `Layer ${i}`}</option>)}
                                    </select>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Behavior</label>
                                    <div className="flex gap-2 bg-app-card p-1 rounded-xl border border-app-borderHighlight w-fit">
                                        <button onClick={() => updateChain((c) => { c.mode = 'movement'; })} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeChain.mode === 'movement' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Movement</button>
                                        <button onClick={() => updateChain((c) => { c.mode = 'scroll'; })} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeChain.mode === 'scroll' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Scroll</button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Sensitivity</label>
                                        <label className="flex items-center gap-2 text-xs font-semibold text-app-textMuted cursor-pointer select-none">
                                            <input type="checkbox" checked={activeChain.disabled} onChange={(e) => updateChain((c) => { c.disabled = e.target.checked; })} className="accent-app-accent w-3.5 h-3.5" />
                                            Disable
                                        </label>
                                    </div>
                                    <div className={`flex items-center gap-3 ${activeChain.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <input type="range" min="1" max="16" step="1" value={activeChain.multiplier} onChange={(e) => updateChain((c) => { c.multiplier = Number(e.target.value); })} className="flex-1 accent-app-accent" />
                                        <div className="flex items-center gap-1 text-xs font-mono text-app-textMuted shrink-0">
                                            <input type="number" min="1" value={activeChain.multiplier} onChange={(e) => updateChain((c) => { c.multiplier = Math.max(1, Number(e.target.value) || 1); })} className="w-12 bg-app-card border border-app-borderHighlight rounded px-1.5 py-1 text-center outline-none" />
                                            <span>/</span>
                                            <input type="number" min="1" value={activeChain.divisor} onChange={(e) => updateChain((c) => { c.divisor = Math.max(1, Number(e.target.value) || 1); })} className="w-12 bg-app-card border border-app-borderHighlight rounded px-1.5 py-1 text-center outline-none" />
                                        </div>
                                        <span className="text-xs font-bold text-app-accent w-12 text-right shrink-0">×{ratio.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Orientation</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateChain((c) => { c.flipX = !c.flipX; })} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${activeChain.flipX ? 'bg-app-accent text-white border-app-accent shadow-sm' : 'border-app-borderHighlight text-app-textMuted hover:text-app-text bg-app-card'}`}>Flip Horizontal</button>
                                        <button onClick={() => updateChain((c) => { c.flipY = !c.flipY; })} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${activeChain.flipY ? 'bg-app-accent text-white border-app-accent shadow-sm' : 'border-app-borderHighlight text-app-textMuted hover:text-app-text bg-app-card'}`}>Flip Vertical</button>
                                        <button onClick={() => updateChain((c) => { c.swapped = !c.swapped; })} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${activeChain.swapped ? 'bg-app-accent text-white border-app-accent shadow-sm' : 'border-app-borderHighlight text-app-textMuted hover:text-app-text bg-app-card'}`}>Swap X/Y</button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Mouse Click</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(CLICK_TARGET_LABELS).map((target) => (
                                            <button
                                                key={target}
                                                onClick={() => updateChain((c) => { c.clickTarget = target; })}
                                                title={UNVERIFIED_CLICK_TARGETS.includes(target) ? 'Uses MoErgo\'s naming pattern for click remaps — not yet confirmed against a real export. Flag it if your firmware doesn\'t build.' : undefined}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeChain.clickTarget === target ? 'bg-app-accent text-white border-app-accent shadow-sm' : 'border-app-borderHighlight text-app-textMuted hover:text-app-text bg-app-card'}`}
                                            >
                                                {CLICK_TARGET_LABELS[target]}
                                                {UNVERIFIED_CLICK_TARGETS.includes(target) && <span className="ml-1 opacity-60">†</span>}
                                            </button>
                                        ))}
                                    </div>
                                    {UNVERIFIED_CLICK_TARGETS.includes(activeChain.clickTarget) && (
                                        <p className="text-[11px] text-app-textMuted italic">† This target's devicetree name follows MoErgo's confirmed pattern but hasn't been verified against a real export yet — let us know if your firmware fails to build with it selected.</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 pt-2 border-t border-app-borderHighlight">
                                    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                                        <div>
                                            <span className="text-xs font-bold text-app-text">Temporary Layer</span>
                                            <p className="text-[11px] text-app-textMuted mt-0.5">Enable a layer while this trackpad keeps receiving events, then fall back automatically.</p>
                                        </div>
                                        <span className="relative inline-block w-10 h-5 shrink-0">
                                            <input type="checkbox" checked={!!activeChain.tempLayer} onChange={(e) => updateChain((c) => { c.tempLayer = e.target.checked ? { layer: 0, timeoutMs: 1000 } : null; })} className="peer sr-only" />
                                            <span className="absolute inset-0 rounded-full bg-app-card border border-app-borderHighlight peer-checked:bg-app-accent peer-checked:border-app-accent transition-colors"></span>
                                            <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
                                        </span>
                                    </label>
                                    {activeChain.tempLayer && (
                                        <div className="flex items-center gap-3 pl-1">
                                            <select value={activeChain.tempLayer.layer} onChange={(e) => updateChain((c) => { c.tempLayer.layer = Number(e.target.value); })} className="flex-1 bg-app-card border border-app-borderHighlight text-app-text text-xs font-semibold rounded-lg px-2.5 py-2 outline-none cursor-pointer">
                                                {layerNames.map((name, i) => <option key={i} value={i}>{name || `Layer ${i}`}</option>)}
                                            </select>
                                            <div className="flex items-center gap-1.5 text-xs font-mono text-app-textMuted shrink-0">
                                                <input type="number" min="100" step="100" value={activeChain.tempLayer.timeoutMs} onChange={(e) => updateChain((c) => { c.tempLayer.timeoutMs = Math.max(100, Number(e.target.value) || 1000); })} className="w-20 bg-app-card border border-app-borderHighlight rounded px-1.5 py-1.5 text-center outline-none" />
                                                <span>ms timeout</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {advancedCount > 0 && (
                                    <p className="text-[11px] text-app-textMuted italic">This chain also has {advancedCount} advanced setting{advancedCount > 1 ? 's' : ''} not shown here — they'll be kept exactly as they are.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-app-borderHighlight shrink-0">
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-all">Cancel</button>
                            <button onClick={() => onSave(parsed)} className="px-5 py-2.5 rounded-xl text-xs font-bold btn-active shadow-lg border-none hover:-translate-y-px transition-all">Apply</button>
                        </div>
                    </div>
                </div>
            );
        };

        const CapabilitiesModal = ({
            isOpen, onClose, config, catalog,
            selectedCategory, onSelectCategory, selectedUid, onSelectUid,
            paramValues, onParamChange, isApplying, onApply,
            searchText, onSearchTextChange, results,
            engineStatus, onRetryEngine,
        }) => {
            if (!isOpen) return null;
            const selected = catalog.find((f) => f.uid === selectedUid) || null;
            const searching = searchText.trim().length > 0;
            const filtered = catalog.filter((f) => {
                if (!searching) return f.category === selectedCategory;
                const q = normalizeForSearch(searchText);
                // description included deliberately: it's where the actual explanatory text lives
                // (e.g. Home-Row Mods' full paragraph), so someone searching in their own words
                // ("modifiers on my home row") has a real chance of matching, not just the exact
                // title/subtitle/category wording.
                return normalizeForSearch(f.title).includes(q) || normalizeForSearch(f.subtitle).includes(q) || normalizeForSearch(f.category).includes(q) || normalizeForSearch(f.description).includes(q);
            });
            const categories = [...new Set(catalog.map((f) => f.category))];
            const countByCategory = {};
            catalog.forEach((f) => { countByCategory[f.category] = (countByCategory[f.category] || 0) + 1; });

            // Three screens share this one modal: the category grid (the app-store "home"),
            // a category's own list of automations, and one automation's detail + result box.
            let body;
            if (selected) {
                const result = results[selected.uid];
                body = (
                    <div className="flex flex-col gap-4">
                        <button onClick={() => onSelectUid(null)} className="text-[11px] font-bold text-app-textMuted hover:text-app-text transition-colors flex items-center gap-1 self-start">← Back to {selected.category}</button>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl shrink-0">{selected.manifest.icon}</span>
                            <div className="min-w-0">
                                <div className="font-bold text-sm text-app-text">{selected.title}</div>
                                {selected.subtitle && <div className="text-xs text-app-textMuted">{selected.subtitle}</div>}
                                <div className="text-[10px] text-app-textMuted/70 mt-0.5">{flowHardwareLabel(selected)}</div>
                            </div>
                        </div>
                        {selected.description && <div className="text-xs text-app-textMuted leading-relaxed">{renderFlowMarkdown(selected.description)}</div>}
                        <FlowParamForm
                            params={selected.param}
                            values={paramValues[selected.uid]}
                            onChange={(id, val) => onParamChange(selected.uid, id, val)}
                        />
                        {/* The jq-web engine loads lazily, the first time this modal opens
                            (glide.html's ensureJqEngineLoaded) — a real user won't have to wait
                            for it at every startup, only the first time they actually use this
                            feature, and only ever see this once per session. */}
                        {engineStatus === 'error' ? (
                            <div className="text-[11px] rounded-lg px-3 py-2.5 border border-red-600/30 bg-red-950/40 text-red-200 flex items-center justify-between gap-3">
                                <span>Couldn't load the automation engine — check your connection.</span>
                                <button onClick={onRetryEngine} className="shrink-0 font-bold underline hover:no-underline">Retry</button>
                            </div>
                        ) : (
                            <button onClick={() => onApply(selected)} disabled={isApplying || engineStatus !== 'ready'} className="btn-active font-bold py-2.5 rounded-xl text-center transition-all border-none shadow-lg hover:-translate-y-px text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                                {isApplying ? 'Applying…' : engineStatus === 'ready' ? 'Apply to Layout' : 'Loading automation engine…'}
                            </button>
                        )}
                        {/* The result box: what happened the last time this automation ran, kept
                            visible right here rather than in a log elsewhere, since this is where
                            the user is looking when they need to know it worked (or why not). */}
                        {result && (
                            <div className={`text-[11px] rounded-lg px-3 py-2.5 border ${result.ok ? 'border-emerald-600/30 bg-emerald-950/30 text-emerald-200' : 'border-red-600/30 bg-red-950/40 text-red-200'}`}>
                                <div className="font-bold flex items-center gap-1.5">{result.ok ? '✓ Success' : '✕ Error'}</div>
                                {result.message && <div className={`mt-1 leading-snug break-words select-text ${result.ok ? '' : 'font-mono'}`}>{result.message}</div>}
                                {/* On success there's otherwise no obvious way out of this screen
                                    besides the tiny "×" in the modal's corner — put clear, explicit
                                    next steps right next to the result the user is looking at. */}
                                {result.ok && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => onSelectUid(null)} className="flex-1 font-bold py-2 rounded-lg text-center transition-all border border-emerald-600/40 hover:bg-emerald-900/40 text-[11px]">← Back to {selected.category}</button>
                                        <button onClick={onClose} className="flex-1 btn-active font-bold py-2 rounded-lg text-center transition-all border-none shadow text-[11px]">Done</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            } else if (selectedCategory || searching) {
                body = (
                    <div className="flex flex-col gap-1.5">
                        <button onClick={() => onSelectCategory(null)} className="text-[11px] font-bold text-app-textMuted hover:text-app-text transition-colors flex items-center gap-1 self-start mb-1">← All categories</button>
                        {!searching && <div className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold px-1">{selectedCategory}</div>}
                        {filtered.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No Flows Automations match your search.</div>}
                        {filtered.map((f) => (
                            <div key={f.uid} onClick={() => onSelectUid(f.uid)} className="flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all border cursor-pointer border-transparent hover:border-app-borderHighlight hover:bg-app-surface">
                                <span className="text-xl shrink-0">{f.manifest.icon}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-app-text truncate">{f.title}</div>
                                    {f.subtitle && <div className="text-app-textMuted truncate">{f.subtitle}</div>}
                                    {searching && <div className="text-app-textMuted/70 truncate">{f.category}</div>}
                                </div>
                                <span className="text-[9px] text-app-textMuted/70 shrink-0 whitespace-nowrap">{flowHardwareLabel(f)}</span>
                            </div>
                        ))}
                    </div>
                );
            } else {
                // The app-store "home" screen: a grid of category tiles, not a flat list.
                body = (
                    <div className="grid grid-cols-2 gap-3">
                        {categories.map((category) => (
                            <div key={category} onClick={() => onSelectCategory(category)} className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-app-borderHighlight bg-app-card hover:bg-app-surface hover:-translate-y-px cursor-pointer transition-all">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-2xl">{FLOW_CATEGORY_ICONS[category] || '⚙️'}</span>
                                    {/* A little preview of what's inside — the app-store touch that makes a tile feel
                                        browsable rather than just a filing label. */}
                                    <span className="text-sm opacity-60">
                                        {catalog.filter((f) => f.category === category).slice(0, 3).map((f) => f.manifest.icon).join(' ')}
                                    </span>
                                </div>
                                <div className="font-bold text-sm text-app-text leading-tight">{category}</div>
                                <div className="text-[10px] text-app-textMuted">{countByCategory[category]} {countByCategory[category] === 1 ? 'automation' : 'automations'}</div>
                            </div>
                        ))}
                    </div>
                );
            }

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
                    <div className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className="text-xl font-bold text-app-text flex items-center gap-2">
                                <svg className="w-6 h-6 text-app-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                                Flows Automations
                            </h3>
                            <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl">&times;</button>
                        </div>

                        {!selected && (
                            <div className="relative mb-3 shrink-0">
                                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <input type="text" value={searchText} onChange={(e) => onSearchTextChange(e.target.value)} placeholder="Search Flows Automations..." className="w-full bg-app-card border border-app-borderHighlight rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors" />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2">
                            {body}
                        </div>
                    </div>
                </div>
            );
        };

        // A handful of built-in editor capabilities with no catalog entry of their own — they're
        // not "automations" (no jq script, nothing to Apply), just per-key inspector features or
        // canvas gestures a first-time user has no way to discover by browsing Flows. Each is
        // matched against `keywords` (including, deliberately, the exact phrasing GLIDE's own
        // pitch copy uses — "I want to double-tap this key for a symbol", "swap colon and semi
        // colon" — so searching in that language actually finds something) but DISPLAYS `title`,
        // never the raw keyword list.
        const QUICK_TIPS = [
            { id: 'double-tap', keywords: 'double tap doubletap double-tap second action symbol', title: 'Make a key do something different on double-tap', tip: 'Select the key, then set its "Double-Tap Action" in the inspector panel.' },
            { id: 'shift-action', keywords: 'shift action different when shifted', title: 'Make a key send something different when Shift is held', tip: 'Select the key, then set its "Shift Action" in the inspector panel.' },
            { id: 'hold-action', keywords: 'hold modifier when held mod tap', title: 'Make a key act as a modifier when held', tip: 'Select the key, then set its "Hold Action" — or search "home row" above to set this up for your whole home row at once.' },
            { id: 'swap-keys', keywords: 'swap colon semicolon semi colon move rearrange two keys', title: 'Swap two keys', tip: 'Drag one key and drop it onto another — their bindings swap instantly, no need to edit either key by hand.' },
            { id: 'key-label', keywords: 'label text custom name rename key', title: 'Add a custom label to a key', tip: 'Select the key, then set its "Custom Key Text" in the inspector panel.' },
            { id: 'right-click', keywords: 'right click long press context menu copy paste options', title: 'Copy or paste a key\'s action, or see other quick options', tip: 'Right-click any key — or long-press it on a touchscreen — for a context menu.' },
        ];

        const CommandPaletteModal = ({ isOpen, onClose, searchText, onSearchTextChange, flowsCatalog, config, onOpenFlow, onOpenBehavior }) => {
            if (!isOpen) return null;
            const q = normalizeForSearch(searchText);
            const searching = q.length > 0;

            const matchingFlows = !searching ? [] : flowsCatalog.filter((f) =>
                normalizeForSearch(f.title).includes(q) || normalizeForSearch(f.subtitle).includes(q) ||
                normalizeForSearch(f.category).includes(q) || normalizeForSearch(f.description).includes(q)
            ).slice(0, 6);

            // Every custom behavior the layout already has, across all five kinds, each tagged
            // with which builder modal it opens (openBehaviorEditor already knows how to route
            // this — see glide.html's renderSlot, which uses the exact same lookup for its own
            // per-key ✎ "Edit this behavior's own definition" button).
            const BEHAVIOR_KINDS = [
                ['Macro', config?.macros],
                ['StickyKey', config?.stickyKeys],
                ['ModMorph', config?.modMorphs],
                ['HoldTap', config?.holdTaps],
                ['TapDance', config?.tapDances],
            ];
            const matchingBehaviors = !searching ? [] : BEHAVIOR_KINDS.flatMap(([kind, list]) =>
                (list || [])
                    .filter((b) => normalizeForSearch(b.name).includes(q) || normalizeForSearch(b.description).includes(q))
                    .map((b) => ({ kind, name: b.name, description: b.description }))
            ).slice(0, 6);

            // Word-level, not whole-phrase: a query like "swap colon and semi colon" should match
            // the "swap"/"colon"/"semi" tokens in QUICK_TIPS' keywords even though the exact phrase
            // (with "and" in it) never appears verbatim there — unlike the Flows/behavior matches
            // above, whose title/subtitle/description text is long enough that a whole-phrase
            // substring match is usually the right bar.
            const queryWords = q.split(' ').filter((w) => w.length > 2);
            const matchingTips = !searching ? QUICK_TIPS : QUICK_TIPS.filter((t) =>
                t.keywords.includes(q) || normalizeForSearch(t.title).includes(q) || queryWords.some((w) => t.keywords.includes(w))
            );

            const nothingFound = searching && matchingFlows.length === 0 && matchingBehaviors.length === 0 && matchingTips.length === 0;

            return (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/80 backdrop-blur-md" onClick={onClose}>
                    <div className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl p-4 max-w-xl w-full mx-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="relative mb-3 shrink-0">
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input autoFocus type="text" value={searchText} onChange={(e) => onSearchTextChange(e.target.value)} placeholder="What do you want to do? Try &quot;home row mods&quot;, &quot;gaming layer&quot;, &quot;swap keys&quot;…" className="w-full bg-app-card border border-app-borderHighlight rounded-xl pl-9 pr-3 py-2.5 text-sm text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2 flex flex-col gap-3">
                            {!searching && (
                                <p className="text-xs text-app-textMuted italic px-1 py-2">Search across Flows automations, your own macros and behaviors, and built-in editor shortcuts — in your own words, not ZMK's.</p>
                            )}
                            {nothingFound && <div className="text-app-textMuted text-xs italic text-center py-4">Nothing matches "{searchText}" — try the Flows Automations catalog directly, or a different phrase.</div>}

                            {matchingFlows.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <div className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold px-1">Flows Automations</div>
                                    {matchingFlows.map((f) => (
                                        <div key={f.uid} onClick={() => onOpenFlow(f.uid)} className="flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all border cursor-pointer border-transparent hover:border-app-borderHighlight hover:bg-app-card">
                                            <span className="text-xl shrink-0">{f.manifest.icon}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-app-text truncate">{f.title}</div>
                                                {f.subtitle && <div className="text-app-textMuted truncate">{f.subtitle}</div>}
                                            </div>
                                            <span className="text-[9px] text-app-textMuted/70 shrink-0 whitespace-nowrap">{f.category}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {matchingBehaviors.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <div className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold px-1">Your own behaviors</div>
                                    {matchingBehaviors.map((b) => (
                                        <div key={`${b.kind}-${b.name}`} onClick={() => onOpenBehavior(b.kind, b.name)} className="flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all border cursor-pointer border-transparent hover:border-app-borderHighlight hover:bg-app-card">
                                            <span className="w-6 h-6 rounded-full bg-app-panel border border-app-borderHighlight text-app-textMuted flex items-center justify-center text-[9px] font-bold shrink-0">{b.name.replace('&', '').charAt(0).toUpperCase()}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-app-text truncate">{b.name.replace('&', '')}</div>
                                                {b.description && <div className="text-app-textMuted truncate">{b.description}</div>}
                                            </div>
                                            <span className="text-[9px] text-app-textMuted/70 shrink-0 whitespace-nowrap">{b.kind}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {matchingTips.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <div className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold px-1">How do I…</div>
                                    {matchingTips.map((t) => (
                                        <div key={t.id} className="p-2.5 rounded-xl text-xs border border-transparent bg-app-card/50">
                                            <div className="font-bold text-app-text">{t.title}</div>
                                            <div className="text-app-textMuted mt-0.5">{t.tip}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

    // -- Settings Modal --
    // GLIDE's own global preferences (theme, key-editor location, Layers/Combos panel side,
    // target OS for keycap glyphs) — every value here is already `usePersistedState`-backed in
    // App (ui/hooks.js), so this component is purely presentational: it reads/writes whatever
    // value+setter pair App hands it and owns no state of its own. `isOpen`-gated like
    // CapabilitiesModal above, rather than the `{cond && <Modal/>}` wrapping some of the other
    // modals use — App's call site is a one-line swap either way. Extracted from glide.html's
    // single inline script (Stage 3 modularization, JSX splitting — see ARCHITECTURE.md), the
    // first of that stage's planned least-coupled-first sequence: this modal reads/writes only
    // props, with no editing state shared with the canvas, sidebar, or key inspector.
    const SettingsModal = ({ isOpen, onClose, themeClass, setThemeClass, layoutMode, setLayoutMode, sidebarSide, setSidebarSide, osSetting, setOsSetting }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
                <div className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-app-text flex items-center gap-2"><svg className="w-6 h-6 text-app-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Configuration</h3>
                        <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl">&times;</button>
                    </div>
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Color Theme</label>
                            <div className="flex gap-2 bg-app-card p-1 rounded-xl border border-app-borderHighlight">
                                <button onClick={() => setThemeClass('oled')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${themeClass === 'oled' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>OLED Dark</button>
                                <button onClick={() => setThemeClass('dark')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${themeClass === 'dark' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Pro Dark</button>
                                <button onClick={() => setThemeClass('light')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${themeClass === 'light' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Light</button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Key Editor Location</label>
                            <div className="flex gap-2 bg-app-card p-1 rounded-xl border border-app-borderHighlight">
                                <button onClick={() => setLayoutMode('bottom')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${layoutMode === 'bottom' ? 'bg-app-borderHighlight text-app-text shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Bottom Pane</button>
                                <button onClick={() => setLayoutMode('right')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${layoutMode === 'right' ? 'bg-app-borderHighlight text-app-text shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Right Sidebar</button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Layers/Combos Panel Side</label>
                            <div className="flex gap-2 bg-app-card p-1 rounded-xl border border-app-borderHighlight">
                                <button onClick={() => setSidebarSide('left')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${sidebarSide === 'left' ? 'bg-app-borderHighlight text-app-text shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Left</button>
                                <button onClick={() => setSidebarSide('right')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${sidebarSide === 'right' ? 'bg-app-borderHighlight text-app-text shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Right</button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Target OS (Keycaps)</label>
                            <select value={osSetting} onChange={(e) => setOsSetting(e.target.value)} className="bg-app-card border border-app-borderHighlight text-app-text text-sm rounded-lg px-4 py-2.5 outline-none shadow-sm cursor-pointer">
                                <option value="auto">Auto-Detect ({detectOs().toUpperCase()})</option>
                                <option value="mac">macOS (⌘)</option><option value="win">Windows (⊞)</option><option value="linux">Linux (❖)</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={onClose} className="mt-8 w-full btn-active font-bold py-3 rounded-xl transition-all shadow-lg hover:-translate-y-px">Done</button>
                </div>
            </div>
        );
    };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { FLOW_CATEGORY_ICONS, flowHardwareLabel, TouchpadSettingsModal, CapabilitiesModal, CommandPaletteModal, SettingsModal });
})();
