// GLIDE UI — Behavior Library builders
//
// The five "create/edit a custom behavior" modals (Macro, Sticky Key, Mod-Morph, Hold-Tap,
// Tap-Dance) plus their small shared helpers, including BindingPicker (reused by the Macro,
// Mod-Morph, and Tap-Dance builders). Depends on ui/shared.js's palette helpers
// (describeBindingStep/searchAcrossAllPalette/ALL_PALETTE_SECTIONS/bindingFromPaletteItem/
// computeCustomBehaviors), so that script tag must come first; independent of ui/canvas.js and
// ui/sharedForms.js. Extracted
// from glide.html's single inline script (Stage 1 modularization, see ARCHITECTURE.md) —
// behavior is unchanged, only the file it lives in.
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
    const { describeBindingStep, searchAcrossAllPalette, ALL_PALETTE_SECTIONS, bindingFromPaletteItem, computeCustomBehaviors, MiniKeyboardMap } = window.GlideUI;

        const MACRO_MODE_LABELS = { tap: 'Tap', press: 'Press', release: 'Release' };

        const MACRO_STEP_KIND_OPTIONS = [
            { value: 'behavior', label: 'Key / Behavior' },
            { value: 'mode:tap', label: 'Mode: Tap' },
            { value: 'mode:press', label: 'Mode: Press' },
            { value: 'mode:release', label: 'Mode: Release' },
            { value: 'pauseForRelease', label: 'Pause For Release' },
            { value: 'waitTime', label: 'Wait Time (ms)' },
            { value: 'tapTime', label: 'Tap Time (ms)' },
            { value: 'paramForward:1:1', label: 'Forward Param 1→1' },
            { value: 'paramForward:1:2', label: 'Forward Param 1→2' },
            { value: 'paramForward:2:1', label: 'Forward Param 2→1' },
            { value: 'paramForward:2:2', label: 'Forward Param 2→2' },
        ];

        function defaultMacroStepForKind(kind) {
            if (kind === 'behavior') return { kind: 'behavior', binding: { value: '&kp', params: [{ value: 'A', params: [] }] } };
            if (kind.startsWith('mode:')) return { kind: 'mode', mode: kind.split(':')[1] };
            if (kind === 'pauseForRelease') return { kind: 'pauseForRelease' };
            if (kind === 'waitTime') return { kind: 'waitTime', ms: 0 };
            if (kind === 'tapTime') return { kind: 'tapTime', ms: 0 };
            if (kind.startsWith('paramForward:')) { const [, from, to] = kind.split(':'); return { kind: 'paramForward', from: Number(from), to: Number(to) }; }
            return { kind: 'behavior', binding: { value: '&kp', params: [{ value: 'A', params: [] }] } };
        }

        const MacroBuilderModal = ({ name, config, layerNames, onClose, onSave }) => {
            const macro = (config.macros || []).find((m) => m.name === name);
            const [parsed, setParsed] = useState(() => parseMacro(macro));
            const [nameField, setNameField] = useState(() => (macro?.name || '').replace(/^&/, ''));
            // Tracks only which step's BindingPicker should start open (newly-added behavior
            // steps) — BindingPicker owns its own open/search state now, so this no longer
            // needs to hold a search string too.
            const [stepPickerIdx, setStepPickerIdx] = useState(null);

            if (!macro) return null;

            const updateSteps = (mutator) => setParsed((prev) => {
                const next = structuredClone(prev);
                mutator(next.steps);
                return next;
            });
            const addStep = (step) => { updateSteps((steps) => { steps.push(step); }); if (step.kind === 'behavior') setStepPickerIdx(parsed.steps.length); };
            const removeStep = (i) => { updateSteps((steps) => { steps.splice(i, 1); }); if (stepPickerIdx === i) setStepPickerIdx(null); };
            const moveStep = (i, dir) => updateSteps((steps) => {
                const j = i + dir;
                if (j < 0 || j >= steps.length) return;
                const tmp = steps[i]; steps[i] = steps[j]; steps[j] = tmp;
            });
            const updateStep = (i, patch) => updateSteps((steps) => { steps[i] = { ...steps[i], ...patch }; });

            const handleApply = () => {
                const trimmed = nameField.trim();
                let finalName = macro.name;
                if (trimmed && trimmed.replace(/^&/, '') !== macro.name.replace(/^&/, '')) {
                    const configWithout = { ...config, macros: (config.macros || []).filter((m) => m.name !== macro.name) };
                    finalName = uniqueMacroName(configWithout, trimmed);
                }
                onSave(macro.name, { ...parsed, name: finalName });
            };

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
                    <div data-testid="macro-modal" className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-app-borderHighlight shrink-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className="w-5 h-5 text-app-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                <span className="text-app-textMuted font-mono text-sm shrink-0">&amp;</span>
                                <input value={nameField} onChange={(e) => setNameField(e.target.value)} className="flex-1 min-w-0 bg-transparent text-sm font-bold font-mono text-app-text outline-none border-b border-transparent focus:border-app-accent py-0.5" />
                            </div>
                            <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl leading-none shrink-0 ml-3">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Description</label>
                                <input type="text" value={parsed.description} onChange={(e) => setParsed((p) => ({ ...p, description: e.target.value }))} placeholder="What does this macro do?" className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Tap Time (ms)</label>
                                    <input type="number" min="0" placeholder="Device default" value={parsed.tapMs ?? ''} onChange={(e) => setParsed((p) => ({ ...p, tapMs: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) }))} className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                                </div>
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Wait Time (ms)</label>
                                    <input type="number" min="0" placeholder="Device default" value={parsed.waitMs ?? ''} onChange={(e) => setParsed((p) => ({ ...p, waitMs: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) }))} className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                                </div>
                            </div>
                            <p className="text-[11px] text-app-textMuted italic -mt-3">Leave blank to use the device's compiled-in default instead of an explicit value.</p>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Steps</label>
                                    <select value="" onChange={(e) => { if (e.target.value) addStep(defaultMacroStepForKind(e.target.value)); }} className="bg-app-card border border-dashed border-app-borderHighlight text-app-textMuted text-[11px] font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:text-app-text hover:border-app-textMuted transition-colors">
                                        <option value="" disabled>+ Add Step…</option>
                                        {MACRO_STEP_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {parsed.steps.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No steps yet — add one above.</div>}

                                <div className="flex flex-col gap-2">
                                    {parsed.steps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-app-borderHighlight bg-app-card">
                                            <div className="flex flex-col shrink-0">
                                                <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="w-5 h-5 flex items-center justify-center text-app-textMuted hover:text-app-text disabled:opacity-20 text-[10px]">▲</button>
                                                <button onClick={() => moveStep(i, 1)} disabled={i === parsed.steps.length - 1} className="w-5 h-5 flex items-center justify-center text-app-textMuted hover:text-app-text disabled:opacity-20 text-[10px]">▼</button>
                                            </div>
                                            <span className="text-[9px] font-mono text-app-textMuted shrink-0 pt-2 w-4 text-right">{i + 1}</span>

                                            {step.kind === 'behavior' && (
                                                <div className="flex-1 min-w-0">
                                                    <BindingPicker binding={step.binding} layerNames={layerNames} config={config} defaultOpen={stepPickerIdx === i} onChange={(b) => updateStep(i, { binding: b })} />
                                                </div>
                                            )}

                                            {step.kind === 'mode' && (
                                                <div className="flex gap-2 flex-1 pt-0.5">
                                                    {['tap', 'press', 'release'].map((m) => (
                                                        <button key={m} onClick={() => updateStep(i, { mode: m })} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${step.mode === m ? 'bg-app-accent text-white border-app-accent shadow-sm' : 'border-app-borderHighlight text-app-textMuted hover:text-app-text bg-app-surface'}`}>{MACRO_MODE_LABELS[m]}</button>
                                                    ))}
                                                </div>
                                            )}

                                            {step.kind === 'pauseForRelease' && (
                                                <span className="flex-1 text-[11px] text-app-textMuted italic py-1.5">Everything above runs on press; everything below runs on release.</span>
                                            )}

                                            {(step.kind === 'waitTime' || step.kind === 'tapTime') && (
                                                <div className="flex items-center gap-2 flex-1 pt-0.5">
                                                    <span className="text-xs font-bold text-app-textMuted shrink-0">{step.kind === 'waitTime' ? 'Wait' : 'Tap'}</span>
                                                    <input type="number" min="0" value={step.ms} onChange={(e) => updateStep(i, { ms: Math.max(0, Number(e.target.value) || 0) })} className="w-20 bg-app-surface border border-app-borderHighlight rounded px-2 py-1 text-xs font-mono text-app-text outline-none" />
                                                    <span className="text-xs text-app-textMuted">ms</span>
                                                </div>
                                            )}

                                            {step.kind === 'paramForward' && (
                                                <div className="flex items-center gap-2 flex-1 pt-0.5 text-xs font-bold text-app-textMuted">
                                                    Forward param
                                                    <select value={step.from} onChange={(e) => updateStep(i, { from: Number(e.target.value) })} className="bg-app-surface border border-app-borderHighlight rounded px-1.5 py-1 outline-none">
                                                        <option value={1}>1</option><option value={2}>2</option>
                                                    </select>
                                                    →
                                                    <select value={step.to} onChange={(e) => updateStep(i, { to: Number(e.target.value) })} className="bg-app-surface border border-app-borderHighlight rounded px-1.5 py-1 outline-none">
                                                        <option value={1}>1</option><option value={2}>2</option>
                                                    </select>
                                                </div>
                                            )}

                                            <button onClick={() => removeStep(i)} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-red-400 hover:bg-red-900/30 rounded transition-colors shrink-0" title="Remove step">🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-app-borderHighlight shrink-0">
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-all">Cancel</button>
                            <button onClick={handleApply} className="px-5 py-2.5 rounded-xl text-xs font-bold btn-active shadow-lg border-none hover:-translate-y-px transition-all">Apply</button>
                        </div>
                    </div>
                </div>
            );
        };

        // -- Sticky Key Builder --
        // Much smaller surface than the Macro Builder above: a sticky key has no ordered step
        // sequence, just four flat properties (ZMK: zmk.dev/docs/keymaps/behaviors/sticky-key).
        const StickyKeyBuilderModal = ({ name, config, onClose, onSave }) => {
            const stickyKey = (config.stickyKeys || []).find((s) => s.name === name);
            const [parsed, setParsed] = useState(() => parseStickyKey(stickyKey));
            const [nameField, setNameField] = useState(() => (stickyKey?.name || '').replace(/^&/, ''));

            if (!stickyKey) return null;

            const handleApply = () => {
                const trimmed = nameField.trim();
                let finalName = stickyKey.name;
                if (trimmed && trimmed.replace(/^&/, '') !== stickyKey.name.replace(/^&/, '')) {
                    const configWithout = { ...config, stickyKeys: (config.stickyKeys || []).filter((s) => s.name !== stickyKey.name) };
                    finalName = uniqueStickyKeyName(configWithout, trimmed);
                }
                onSave(stickyKey.name, { ...parsed, name: finalName });
            };

            const Toggle = ({ label, hint, checked, onChange }) => (
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none py-1">
                    <div>
                        <span className="text-xs font-bold text-app-text">{label}</span>
                        {hint && <p className="text-[11px] text-app-textMuted mt-0.5">{hint}</p>}
                    </div>
                    <span className="relative inline-block w-10 h-5 shrink-0">
                        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
                        <span className="absolute inset-0 rounded-full bg-app-card border border-app-borderHighlight peer-checked:bg-app-accent peer-checked:border-app-accent transition-colors"></span>
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
                    </span>
                </label>
            );

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
                    <div data-testid="stickykey-modal" className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-app-borderHighlight shrink-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-app-accent shrink-0">📌</span>
                                <span className="text-app-textMuted font-mono text-sm shrink-0">&amp;</span>
                                <input value={nameField} onChange={(e) => setNameField(e.target.value)} className="flex-1 min-w-0 bg-transparent text-sm font-bold font-mono text-app-text outline-none border-b border-transparent focus:border-app-accent py-0.5" />
                            </div>
                            <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl leading-none shrink-0 ml-3">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Description</label>
                                <input type="text" value={parsed.description} onChange={(e) => setParsed((p) => ({ ...p, description: e.target.value }))} placeholder="What does this sticky key do?" className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Release After (ms)</label>
                                <input type="number" min="0" placeholder="Device default (1000ms)" value={parsed.releaseAfterMs ?? ''} onChange={(e) => setParsed((p) => ({ ...p, releaseAfterMs: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) }))} className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                                <p className="text-[11px] text-app-textMuted italic">How long the key stays active waiting for another keypress. Leave blank to use the device's compiled-in default.</p>
                            </div>

                            <div className="flex flex-col divide-y divide-app-borderHighlight border-t border-b border-app-borderHighlight px-1">
                                <Toggle label="Quick Release" hint="Deactivate on the next key press rather than its release — prevents accidentally capitalizing more than one letter." checked={parsed.quickRelease ?? false} onChange={(v) => setParsed((p) => ({ ...p, quickRelease: v }))} />
                                <Toggle label="Lazy" hint="Delay activation until just before another key is pressed, rather than immediately — helps avoid unintended menu/hint triggers." checked={parsed.lazy ?? false} onChange={(v) => setParsed((p) => ({ ...p, lazy: v }))} />
                                <Toggle label="Ignore Modifiers" hint="Let another sticky key stack onto this one before it releases, so multiple modifiers can combine (e.g. Ctrl+Shift) from separate taps." checked={parsed.ignoreModifiers ?? true} onChange={(v) => setParsed((p) => ({ ...p, ignoreModifiers: v }))} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Wraps Behavior</label>
                                <input type="text" value={(parsed.bindings || ['&kp'])[0]} onChange={(e) => { const v = e.target.value.trim(); setParsed((p) => ({ ...p, bindings: [v.startsWith('&') ? v : `&${v || 'kp'}`] })); }} className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text outline-none focus:border-app-accent transition-colors" />
                                <p className="text-[11px] text-app-textMuted italic">Almost always <code>&amp;kp</code> — the behavior this sticky key applies to whatever it's assigned before. Only change this if you know you need something else.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-app-borderHighlight shrink-0">
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-all">Cancel</button>
                            <button onClick={handleApply} className="px-5 py-2.5 rounded-xl text-xs font-bold btn-active shadow-lg border-none hover:-translate-y-px transition-all">Apply</button>
                        </div>
                    </div>
                </div>
            );
        };

        // -- Mod-Morph Builder --
        // A user-authored &mod_morph always has exactly two cases (see core/zmk/modMorph.js's
        // header) — a default and a "when these mods are held" alternative — so this doesn't need
        // an add/remove/reorder step list like the Macro Builder; it's two fixed binding pickers
        // (reusing the same palette Change/search UI macro steps use) plus a mods/keepMods toggle
        // grid for the second case.
        const MOD_MORPH_FLAG_OPTIONS = ['MOD_LSFT', 'MOD_RSFT', 'MOD_LCTL', 'MOD_RCTL', 'MOD_LALT', 'MOD_RALT', 'MOD_LGUI', 'MOD_RGUI'];

        // -- BindingPicker --
        // The compact "pick a binding" control used inside the Behavior Library builders —
        // a Mod-Morph case, a Tap-Dance tap slot, a Macro step — wherever a full-size Pick Key
        // tab (ui/inspector.js) would be overkill. Replaces the old ModMorphBindingPicker (and
        // an identical copy that used to live inline in the Macro Builder's step editor below)
        // after a usability audit found three real problems with it:
        //
        //   1. It only offered layers + the bare keycode grid — never the macros/hold-taps/
        //      tap-dances/mod-morphs/sticky-keys a layout actually defines, even though ZMK
        //      allows nesting them (a tap-dance that taps into a macro, a mod-morph case that
        //      triggers a hold-tap, etc). The "Your Behaviors" section below fixes that, using
        //      the exact same list (computeCustomBehaviors) the main Pick Key tab's Advanced
        //      Behaviors view already builds — one source of truth, not a second divergent one.
        //   2. Its "Other:" field took any typed string on blur and saved `{ value: v }` with
        //      no validation and no params — a typo, or a real behavior that needs parameters,
        //      both silently produced a binding that could fail to import back into MoErgo's
        //      Layout Editor (the same class of JSON-shape bug the hrm_bil60 fix addressed).
        //      Removed outright rather than "improved": every binding this picker can produce
        //      now comes from clicking something real — a layer, a keycode, or a behavior this
        //      layout already defines — matching how the main Pick Key tab works (it has no
        //      free-text escape hatch either). A behavior that doesn't exist yet isn't a typing
        //      problem to work around here; it's built once in the Behavior Library, and then
        //      it shows up under "Your Behaviors" like everything else.
        //   3. It looked bolted-on: an unstyled flex-wrap tag cloud in a 32px scroll box, no
        //      categories, no icons. Restyled around the same `.palette-btn` card look (with
        //      the same `!h-auto !py-* !px-*` override pattern ui/inspector.js's own Advanced
        //      Behaviors view already uses for text-labeled buttons) so it reads as the same
        //      picker, not a smaller, rougher one.
        const BindingPicker = ({ label, binding, onChange, layerNames, config, defaultOpen = false }) => {
            const [open, setOpen] = useState(defaultOpen);
            const [search, setSearch] = useState('');

            const customBehaviors = useMemo(() => computeCustomBehaviors(config), [config]);

            const q = search.trim().toLowerCase();
            const matchedLayers = !q ? (layerNames || []) : (layerNames || []).filter((n) => n.toLowerCase().includes(q));
            const matchedBehaviors = !q ? customBehaviors : customBehaviors.filter((b) => b.label.toLowerCase().includes(q) || b.cat.toLowerCase().includes(q));
            const keySections = q ? searchAcrossAllPalette(search) : ALL_PALETTE_SECTIONS;
            const nothingFound = q && matchedLayers.length === 0 && matchedBehaviors.length === 0 && keySections.length === 0;

            const pick = (b) => { onChange(b); setOpen(false); setSearch(''); };
            const btnCls = "palette-btn !h-auto !min-w-0 !py-1.5 !px-2.5 text-[11px]";

            return (
                <div className="flex flex-col gap-1.5">
                    {label && <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">{label}</label>}
                    <div className="flex items-center gap-2">
                        <code className="flex-1 min-w-0 truncate text-[11px] bg-app-card border border-app-borderHighlight rounded px-2 py-1.5 text-app-text">{describeBindingStep(binding)}</code>
                        <button onClick={() => { setOpen(!open); setSearch(''); }} className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-app-borderHighlight text-app-textMuted hover:text-app-text bg-app-card shrink-0 transition-colors">{open ? 'Close' : 'Change'}</button>
                    </div>
                    {open && (
                        <div className="p-3 bg-app-card border border-app-borderHighlight rounded-xl flex flex-col gap-3 shadow-inner">
                            <div className="relative">
                                <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search keys & your behaviors..." className="w-full bg-app-surface border border-app-borderHighlight rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-app-text outline-none focus:border-app-text transition-colors" />
                            </div>

                            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
                                {matchedLayers.length > 0 && (
                                    <div>
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-app-textMuted mb-1.5">Layers</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {matchedLayers.map((n) => {
                                                const li = (layerNames || []).indexOf(n);
                                                return <button key={`mo-${li}`} onClick={() => pick({ value: '&mo', params: [{ value: li, params: [] }] })} className={btnCls}><span className="text-app-textMuted mr-1">&amp;mo</span>{n}</button>;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {matchedBehaviors.length > 0 && (
                                    <div>
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-app-textMuted mb-1.5">Your Behaviors</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {matchedBehaviors.map((b, i) => (
                                                <button key={i} onClick={() => pick({ value: b.type })} title={b.cat} className="palette-btn !h-auto !min-w-0 !py-1.5 !px-3 !flex-col gap-0.5">
                                                    <span className="text-[8px] uppercase tracking-widest text-app-textMuted opacity-70">{b.cat}</span>
                                                    <span className="font-mono text-[11px]">{b.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {keySections.map((section, sIdx) => (
                                    <div key={sIdx}>
                                        <div className="text-[9px] uppercase font-bold tracking-widest text-app-textMuted mb-1.5 flex items-center gap-1.5">
                                            {q && <span className="text-[8px] normal-case font-bold text-white bg-app-accent px-1.5 py-0.5 rounded">{section.tabName}</span>}
                                            {section.category || 'General'}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {section.items.map((item, ii) => (
                                                <button key={ii} onClick={() => pick(bindingFromPaletteItem(item))} className={btnCls}>
                                                    {item.top ? <span className="flex flex-col items-center leading-none"><span className="text-[9px] opacity-60">{item.top}</span><span>{item.bottom}</span></span> : (item.label || item.code || item.type)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {nothingFound && <div className="text-app-textMuted text-[11px] italic py-2 text-center">No keys or behaviors match "{search}".</div>}
                            </div>

                            <p className="text-[10px] text-app-textMuted italic border-t border-app-borderHighlight pt-2 -mb-0.5">Don't see a behavior you made? Build it in the Behavior Library first — it'll show up under "Your Behaviors" here.</p>
                        </div>
                    )}
                </div>
            );
        };

        const ModMorphBuilderModal = ({ name, config, layerNames, onClose, onSave }) => {
            const modMorph = (config.modMorphs || []).find((m) => m.name === name);
            const [parsed, setParsed] = useState(() => ({ description: modMorph?.description || '', cases: normalizeModMorphCases(modMorph?.cases) }));
            const [nameField, setNameField] = useState(() => (modMorph?.name || '').replace(/^&/, ''));

            if (!modMorph) return null;

            const toggleMod = (mod) => setParsed((p) => {
                const next = structuredClone(p);
                const mods = next.cases[1].mods;
                next.cases[1].mods = mods.includes(mod) ? mods.filter((m) => m !== mod) : [...mods, mod];
                // keepMods can only ever keep a mod that's actually in mods — drop it from
                // keepMods too the moment it's toggled off, rather than leaving a stale entry.
                next.cases[1].keepMods = next.cases[1].keepMods.filter((m) => next.cases[1].mods.includes(m));
                return next;
            });
            const toggleKeepMod = (mod) => setParsed((p) => {
                const next = structuredClone(p);
                const keepMods = next.cases[1].keepMods;
                next.cases[1].keepMods = keepMods.includes(mod) ? keepMods.filter((m) => m !== mod) : [...keepMods, mod];
                return next;
            });

            const handleApply = () => {
                const trimmed = nameField.trim();
                let finalName = modMorph.name;
                if (trimmed && trimmed.replace(/^&/, '') !== modMorph.name.replace(/^&/, '')) {
                    const configWithout = { ...config, modMorphs: (config.modMorphs || []).filter((m) => m.name !== modMorph.name) };
                    finalName = uniqueModMorphName(configWithout, trimmed);
                }
                onSave(modMorph.name, { ...parsed, name: finalName });
            };

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
                    <div data-testid="modmorph-modal" className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-app-borderHighlight shrink-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-app-accent shrink-0">⇄</span>
                                <span className="text-app-textMuted font-mono text-sm shrink-0">&amp;</span>
                                <input value={nameField} onChange={(e) => setNameField(e.target.value)} className="flex-1 min-w-0 bg-transparent text-sm font-bold font-mono text-app-text outline-none border-b border-transparent focus:border-app-accent py-0.5" />
                            </div>
                            <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl leading-none shrink-0 ml-3">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Description</label>
                                <input type="text" value={parsed.description} onChange={(e) => setParsed((p) => ({ ...p, description: e.target.value }))} placeholder="What does this mod-morph do?" className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                            </div>

                            <BindingPicker label="Default (no mods held)" binding={parsed.cases[0].binding} layerNames={layerNames} config={config} onChange={(b) => setParsed((p) => { const n = structuredClone(p); n.cases[0].binding = b; return n; })} />

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Triggering Mods</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {MOD_MORPH_FLAG_OPTIONS.map((mod) => {
                                        const active = parsed.cases[1].mods.includes(mod);
                                        return <button key={mod} onClick={() => toggleMod(mod)} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${active ? 'bg-app-accent text-white border-app-accent' : 'bg-app-card text-app-textMuted border-app-borderHighlight hover:text-app-text hover:border-app-textMuted'}`}>{mod.replace('MOD_', '')}</button>;
                                    })}
                                </div>
                                <p className="text-[11px] text-app-textMuted italic">Fires when any one of the checked mods is held (not all of them at once).</p>
                            </div>

                            <BindingPicker label="When triggering mods are held" binding={parsed.cases[1].binding} layerNames={layerNames} config={config} onChange={(b) => setParsed((p) => { const n = structuredClone(p); n.cases[1].binding = b; return n; })} />

                            {parsed.cases[1].mods.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Keep Held</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {parsed.cases[1].mods.map((mod) => {
                                            const active = parsed.cases[1].keepMods.includes(mod);
                                            return <button key={mod} onClick={() => toggleKeepMod(mod)} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${active ? 'bg-app-accent text-white border-app-accent' : 'bg-app-card text-app-textMuted border-app-borderHighlight hover:text-app-text hover:border-app-textMuted'}`}>{mod.replace('MOD_', '')}</button>;
                                        })}
                                    </div>
                                    <p className="text-[11px] text-app-textMuted italic">Checked mods are still sent alongside the morphed key, instead of being consumed by triggering it — off by default.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-app-borderHighlight shrink-0">
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-all">Cancel</button>
                            <button onClick={handleApply} className="px-5 py-2.5 rounded-xl text-xs font-bold btn-active shadow-lg border-none hover:-translate-y-px transition-all">Apply</button>
                        </div>
                    </div>
                </div>
            );
        };

        // -- Hold-Tap Builder --
        // Unlike the Mod-Morph Builder's two full binding pickers, a hold-tap's `bindings` are
        // plain behavior-NAME strings (see core/zmk/holdTap.js's header) — no params to pick, so a
        // simple text field per slot is enough, matching the Sticky Key Builder's "Wraps Behavior"
        // field rather than BindingPicker's full palette search.
        const HoldTapBuilderModal = ({ name, config, keyboardGeo, onClose, onSave }) => {
            const holdTap = (config.holdTaps || []).find((h) => h.name === name);
            const [parsed, setParsed] = useState(() => normalizeHoldTapFields(holdTap));
            const [nameField, setNameField] = useState(() => (holdTap?.name || '').replace(/^&/, ''));
            const [showAdvanced, setShowAdvanced] = useState(false);

            if (!holdTap) return null;

            const handleApply = () => {
                const trimmed = nameField.trim();
                let finalName = holdTap.name;
                if (trimmed && trimmed.replace(/^&/, '') !== holdTap.name.replace(/^&/, '')) {
                    const configWithout = { ...config, holdTaps: (config.holdTaps || []).filter((h) => h.name !== holdTap.name) };
                    finalName = uniqueHoldTapName(configWithout, trimmed);
                }
                onSave(holdTap.name, { ...parsed, name: finalName });
            };

            const Toggle = ({ label, hint, checked, onChange }) => (
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none py-1">
                    <div>
                        <span className="text-xs font-bold text-app-text">{label}</span>
                        {hint && <p className="text-[11px] text-app-textMuted mt-0.5">{hint}</p>}
                    </div>
                    <span className="relative inline-block w-10 h-5 shrink-0">
                        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
                        <span className="absolute inset-0 rounded-full bg-app-card border border-app-borderHighlight peer-checked:bg-app-accent peer-checked:border-app-accent transition-colors"></span>
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></span>
                    </span>
                </label>
            );

            const NumberField = (label, key, hint, placeholder) => (
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">{label}</label>
                    <input type="number" placeholder={placeholder} value={parsed[key] ?? ''} onChange={(e) => setParsed((p) => ({ ...p, [key]: e.target.value === '' ? undefined : Number(e.target.value) || 0 }))} className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                    {hint && <p className="text-[11px] text-app-textMuted italic">{hint}</p>}
                </div>
            );

            const BindingNameField = (label, idx) => (
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">{label}</label>
                    <div className="flex items-center gap-2">
                        <span className="text-app-textMuted font-mono text-xs shrink-0">&amp;</span>
                        <input type="text" value={(parsed.bindings[idx] || '').replace(/^&/, '')} onChange={(e) => { const v = e.target.value.trim(); setParsed((p) => { const bindings = [...p.bindings]; bindings[idx] = v ? `&${v}` : '&none'; return { ...p, bindings }; }); }} className="flex-1 min-w-0 bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text outline-none focus:border-app-accent transition-colors" />
                    </div>
                </div>
            );

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
                    <div data-testid="holdtap-modal" className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-app-borderHighlight shrink-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-app-accent shrink-0">⏱️</span>
                                <span className="text-app-textMuted font-mono text-sm shrink-0">&amp;</span>
                                <input value={nameField} onChange={(e) => setNameField(e.target.value)} className="flex-1 min-w-0 bg-transparent text-sm font-bold font-mono text-app-text outline-none border-b border-transparent focus:border-app-accent py-0.5" />
                            </div>
                            <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl leading-none shrink-0 ml-3">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Description</label>
                                <input type="text" value={parsed.description} onChange={(e) => setParsed((p) => ({ ...p, description: e.target.value }))} placeholder="What does this hold-tap do?" className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {BindingNameField('Hold Behavior', 0)}
                                {BindingNameField('Tap Behavior', 1)}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Flavor</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {HOLD_TAP_FLAVORS.map((f) => (
                                        <button key={f} onClick={() => setParsed((p) => ({ ...p, flavor: f }))} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${parsed.flavor === f ? 'bg-app-accent text-white border-app-accent' : 'bg-app-card text-app-textMuted border-app-borderHighlight hover:text-app-text hover:border-app-textMuted'}`}>{f}</button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-app-textMuted italic">How the firmware decides hold vs. tap when another key is pressed mid-press. "tap-preferred" resolves as a tap unless the key is held past the tapping term; "hold-preferred" resolves as a hold the moment another key is pressed; "balanced" looks at whether the other key is released before this one.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {NumberField('Tapping Term (ms)', 'tappingTermMs', "Device default if blank.", 'Device default')}
                                {NumberField('Quick Tap (ms)', 'quickTapMs', 'A second press within this window always taps, even after a hold. -1 disables.', 'Device default')}
                            </div>
                            {NumberField('Require Prior Idle (ms)', 'requirePriorIdleMs', 'Forces a tap if this key is pressed within this window of the previous keypress.', 'Device default')}

                            <div className="flex flex-col divide-y divide-app-borderHighlight border-t border-b border-app-borderHighlight px-1">
                                <Toggle label="Hold Trigger On Release" hint="Only decide hold vs. tap once this key is released, rather than as soon as another key is pressed." checked={parsed.holdTriggerOnRelease ?? false} onChange={(v) => setParsed((p) => ({ ...p, holdTriggerOnRelease: v }))} />
                                <Toggle label="Retro Tap" hint="If held past the tapping term with nothing else pressed, send a tap on release instead of nothing." checked={parsed.retroTap ?? false} onChange={(v) => setParsed((p) => ({ ...p, retroTap: v }))} />
                            </div>

                            {/* Was missing from this modal entirely — editable only through the
                                per-key inspector's inline hold-tap editor (DynamicBehaviorForm),
                                a real gap between the two editors for the same data. Always
                                visible here (not tucked under Advanced below), matching how it's
                                treated on that other surface. */}
                            {keyboardGeo && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Hold Trigger Keys</label>
                                    <p className="text-[11px] text-app-textMuted italic">Click the keys below that should trigger the HOLD action when rolled over. Leave empty to use every key.</p>
                                    <MiniKeyboardMap geo={keyboardGeo} selectedKeys={parsed.holdTriggerKeyPositions || []} onKeyToggle={(kIdx) => setParsed((p) => { const cur = p.holdTriggerKeyPositions || []; const next = cur.includes(kIdx) ? cur.filter((k) => k !== kIdx) : [...cur, kIdx]; return { ...p, holdTriggerKeyPositions: next }; })} />
                                </div>
                            )}

                            {/* Two more real ZMK hold-tap properties (hold-while-undecided /
                                hold-while-undecided-linger) that had no UI anywhere in GLIDE
                                until this audit — see core/behaviors/schemas.js and
                                core/zmk/holdTap.js's headers. Niche enough to tuck under the same
                                "Advanced" disclosure pattern the schema-driven editor already
                                uses for requirePriorIdleMs, rather than cluttering the always-
                                visible toggles above with settings most hold-taps never touch. */}
                            <div className="pt-1">
                                <button onClick={() => setShowAdvanced((s) => !s)} className="text-[10px] uppercase font-bold text-app-textMuted hover:text-app-text transition-colors flex items-center gap-1">
                                    {showAdvanced ? '▾' : '▸'} Advanced
                                </button>
                                {showAdvanced && (
                                    <div className="flex flex-col divide-y divide-app-borderHighlight border-t border-b border-app-borderHighlight px-1 mt-3">
                                        <Toggle label="Hold While Undecided" hint="Activate the hold action while the decision is pending." checked={parsed.holdWhileUndecided ?? false} onChange={(v) => setParsed((p) => ({ ...p, holdWhileUndecided: v }))} />
                                        <Toggle label="Hold While Undecided (Linger)" hint="Keep the hold action active until the tap action ends." checked={parsed.holdWhileUndecidedLinger ?? false} onChange={(v) => setParsed((p) => ({ ...p, holdWhileUndecidedLinger: v }))} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-app-borderHighlight shrink-0">
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-all">Cancel</button>
                            <button onClick={handleApply} className="px-5 py-2.5 rounded-xl text-xs font-bold btn-active shadow-lg border-none hover:-translate-y-px transition-all">Apply</button>
                        </div>
                    </div>
                </div>
            );
        };

        // -- Tap-Dance Builder --
        // A tap-dance's `bindings` ARE full binding objects (unlike a hold-tap's plain name
        // strings — see core/zmk/tapDance.js's header), so this reuses BindingPicker for each
        // step, with add/remove around a 2-binding minimum (ZMK requires at least 2).
        const TapDanceBuilderModal = ({ name, config, layerNames, onClose, onSave }) => {
            const tapDance = (config.tapDances || []).find((t) => t.name === name);
            const [parsed, setParsed] = useState(() => normalizeTapDanceFields(tapDance));
            const [nameField, setNameField] = useState(() => (tapDance?.name || '').replace(/^&/, ''));

            if (!tapDance) return null;

            const handleApply = () => {
                const trimmed = nameField.trim();
                let finalName = tapDance.name;
                if (trimmed && trimmed.replace(/^&/, '') !== tapDance.name.replace(/^&/, '')) {
                    const configWithout = { ...config, tapDances: (config.tapDances || []).filter((t) => t.name !== tapDance.name) };
                    finalName = uniqueTapDanceName(configWithout, trimmed);
                }
                onSave(tapDance.name, { ...parsed, name: finalName });
            };

            const setBindingAt = (idx, b) => setParsed((p) => { const bindings = [...p.bindings]; bindings[idx] = b; return { ...p, bindings }; });
            const addBinding = () => setParsed((p) => ({ ...p, bindings: [...p.bindings, { value: '&none' }] }));
            const removeBinding = (idx) => setParsed((p) => (p.bindings.length <= 2 ? p : { ...p, bindings: p.bindings.filter((_, i) => i !== idx) }));

            const TAP_ORDINALS = ['1st Tap', '2nd Tap', '3rd Tap', '4th Tap', '5th Tap', '6th Tap'];

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
                    <div data-testid="tapdance-modal" className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-app-borderHighlight shrink-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-app-accent shrink-0">🔀</span>
                                <span className="text-app-textMuted font-mono text-sm shrink-0">&amp;</span>
                                <input value={nameField} onChange={(e) => setNameField(e.target.value)} className="flex-1 min-w-0 bg-transparent text-sm font-bold font-mono text-app-text outline-none border-b border-transparent focus:border-app-accent py-0.5" />
                            </div>
                            <button onClick={onClose} className="text-app-textMuted hover:text-app-text text-xl leading-none shrink-0 ml-3">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Description</label>
                                <input type="text" value={parsed.description} onChange={(e) => setParsed((p) => ({ ...p, description: e.target.value }))} placeholder="What does this tap-dance do?" className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Tapping Term (ms)</label>
                                <input type="number" placeholder="Device default" value={parsed.tappingTermMs ?? ''} onChange={(e) => setParsed((p) => ({ ...p, tappingTermMs: e.target.value === '' ? undefined : Number(e.target.value) || 0 }))} className="w-full bg-app-card border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text placeholder-app-textMuted outline-none focus:border-app-accent transition-colors" />
                                <p className="text-[11px] text-app-textMuted italic">How long to wait for the next tap before firing the current count's binding.</p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-app-textMuted">Taps</label>
                                {parsed.bindings.map((b, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <BindingPicker label={TAP_ORDINALS[idx] || `Tap ${idx + 1}`} binding={b} layerNames={layerNames} config={config} onChange={(nb) => setBindingAt(idx, nb)} />
                                        </div>
                                        {parsed.bindings.length > 2 && (
                                            <button onClick={() => removeBinding(idx)} title="Remove this tap" className="mt-6 text-app-textMuted hover:text-red-400 text-lg leading-none shrink-0">&times;</button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={addBinding} className="self-start px-3 py-1.5 text-[11px] font-bold rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted transition-colors">+ Add Tap</button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-app-borderHighlight shrink-0">
                            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-all">Cancel</button>
                            <button onClick={handleApply} className="px-5 py-2.5 rounded-xl text-xs font-bold btn-active shadow-lg border-none hover:-translate-y-px transition-all">Apply</button>
                        </div>
                    </div>
                </div>
            );
        };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { MacroBuilderModal, StickyKeyBuilderModal, ModMorphBuilderModal, HoldTapBuilderModal, TapDanceBuilderModal });
})();
