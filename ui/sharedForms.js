// GLIDE UI — small shared form pieces
//
// DynamicBehaviorForm (renders a behavior's settings panel straight from its BehaviorSchemas
// entry), FlowParamForm (renders a Capability's [[param]] declarations), and ConfirmDialog (the
// in-app stand-in for window.confirm()). DynamicBehaviorForm needs ui/canvas.js's
// MiniKeyboardMap, so that script tag must come first. Extracted from glide.html's single inline
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
    const { MiniKeyboardMap } = window.GlideUI;

        // DynamicBehaviorForm — renders a behavior's settings panel entirely from its
        // core/behaviors/schemas.js entry, so a new/tuned property (a .toml-plan-equivalent
        // change, just plain JS data instead) never needs a JSX change here. Values are read
        // straight off the real behavior object (values) and written back through onChange
        // exactly like updateBehaviorSetting always has — this form doesn't introduce a new
        // write path, just a generic render path over the existing one.
        const DynamicBehaviorForm = ({ behaviorId, values, onChange, keyboardGeo }) => {
            const schema = getBehaviorSchema(behaviorId);
            if (!schema) return null;

            const renderWidget = (prop) => {
                const raw = values?.[prop.key];
                const current = raw === undefined ? prop.default : raw;
                const commit = (nextRaw) => onChange(prop.key, compileBehaviorProperty(behaviorId, prop.key, nextRaw));

                switch (prop.widget) {
                    case 'select':
                        return (
                            <select className="w-full bg-app-surface border border-app-borderHighlight p-2 rounded-lg text-xs text-app-text outline-none" value={current} onChange={(e) => commit(e.target.value)}>
                                {(prop.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        );
                    case 'slider':
                        return (
                            <div className="flex items-center gap-3">
                                <input type="range" min={prop.min} max={prop.max} step={prop.step || 1} value={current} onChange={(e) => commit(e.target.value)} className="w-full accent-app-accent" />
                                <span className="text-xs font-mono text-app-textMuted w-14 text-right shrink-0">{current}{prop.unit || ''}</span>
                            </div>
                        );
                    case 'number_input':
                        return (
                            <div className="flex bg-app-surface border border-app-borderHighlight rounded-lg overflow-hidden">
                                <input type="number" min={prop.min} max={prop.max} step={prop.step || 1} className="w-full bg-transparent p-2 text-xs font-mono text-app-text outline-none" value={current} onChange={(e) => commit(e.target.value)} />
                                {prop.unit && <span className="p-2 text-xs text-app-textMuted font-mono">{prop.unit}</span>}
                            </div>
                        );
                    case 'toggle':
                        return (
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={!!current} onChange={(e) => commit(e.target.checked)} className="accent-app-accent" />
                                <span className="text-xs text-app-textMuted group-hover:text-app-text transition-colors">{prop.label}</span>
                            </label>
                        );
                    case 'keyboard_picker':
                        return (
                            <MiniKeyboardMap geo={keyboardGeo} selectedKeys={current || []} onKeyToggle={(kIdx) => {
                                const next = (current || []).includes(kIdx) ? current.filter((k) => k !== kIdx) : [...(current || []), kIdx];
                                commit(next);
                            }} />
                        );
                    case 'text':
                    default:
                        return (
                            <input type="text" value={current ?? ''} onChange={(e) => commit(e.target.value)} className="bg-app-surface border border-app-borderHighlight text-app-text text-xs rounded-lg px-3 py-2 outline-none w-full font-mono" />
                        );
                }
            };

            const basicProps = schema.properties.filter((p) => !p.advanced);
            const advancedProps = schema.properties.filter((p) => p.advanced);
            const [showAdvanced, setShowAdvanced] = useState(false);

            // Compact widgets (toggle, number_input) look right sharing a row two-at-a-time —
            // the way the hand-authored hold-tap panel always paired Tapping Term/Quick Tap and
            // Retro Tap/Trigger on Release; every other widget gets its own full-width row.
            const PAIRABLE = new Set(['toggle', 'number_input']);
            const rows = [];
            let i = 0;
            while (i < basicProps.length) {
                const p = basicProps[i];
                const next = basicProps[i + 1];
                if (PAIRABLE.has(p.widget) && next?.widget === p.widget) {
                    rows.push({ pair: [p, next] });
                    i += 2;
                } else {
                    rows.push({ single: p });
                    i += 1;
                }
            }

            return (
                <div className="flex flex-col gap-4">
                    {rows.map((row, rIdx) => row.pair ? (
                        row.pair[0].widget === 'toggle' ? (
                            <div key={rIdx} className="flex justify-between mt-1">
                                {row.pair.map((p) => <React.Fragment key={p.key}>{renderWidget(p)}</React.Fragment>)}
                            </div>
                        ) : (
                            <div key={rIdx} className="flex gap-4">
                                {row.pair.map((p) => (
                                    <div key={p.key} className="flex flex-col flex-1 gap-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold">{p.label}</label>
                                        {renderWidget(p)}
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div key={rIdx} className="flex flex-col gap-1.5">
                            {row.single.widget !== 'toggle' && <label className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold">{row.single.label}</label>}
                            {row.single.description && row.single.widget === 'keyboard_picker' && <p className="text-[10px] text-app-textMuted leading-tight mb-1">{row.single.description}</p>}
                            {renderWidget(row.single)}
                        </div>
                    ))}
                    {advancedProps.length > 0 && (
                        <div className="pt-2 border-t border-app-borderHighlight">
                            <button onClick={() => setShowAdvanced((s) => !s)} className="text-[10px] uppercase font-bold text-app-textMuted hover:text-app-text transition-colors flex items-center gap-1">
                                {showAdvanced ? '▾' : '▸'} Advanced
                            </button>
                            {showAdvanced && (
                                <div className="flex flex-col gap-4 mt-3">
                                    {advancedProps.map((p) => (
                                        <div key={p.key} className="flex flex-col gap-1.5">
                                            <label className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold">{p.label}</label>
                                            {p.description && <p className="text-[10px] text-app-textMuted leading-tight mb-1">{p.description}</p>}
                                            {renderWidget(p)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        };

        // Renders a form for one Flows-package's [[param]] declarations (id/label/type/options/
        // labels/default — the shape build-catalog.js actually produces from real .flows files,
        // distinct from BehaviorSchemas' key/widget/min/max shape above, so this stays its own
        // small component rather than being forced through DynamicBehaviorForm).
        const FlowParamForm = ({ params, values, onChange }) => {
            if (!params || params.length === 0) return null;
            return (
                <div className="flex flex-col gap-3">
                    {params.map((p) => {
                        const current = values?.[p.id] !== undefined ? values[p.id] : p.default;
                        return (
                            <div key={p.id} className="flex flex-col gap-1.5">
                                {p.type !== 'boolean' && <label className="text-[10px] uppercase tracking-widest text-app-textMuted font-bold">{p.label || p.id}</label>}
                                {p.type === 'boolean' ? (
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={!!current} onChange={(e) => onChange(p.id, e.target.checked)} className="accent-app-accent" />
                                        <span className="text-xs text-app-textMuted group-hover:text-app-text transition-colors">{p.label || p.id}</span>
                                    </label>
                                ) : p.type === 'number' ? (
                                    <input type="number" value={current ?? ''} onChange={(e) => onChange(p.id, e.target.value === '' ? '' : Number(e.target.value))} className="bg-app-surface border border-app-borderHighlight text-app-text text-xs rounded-lg px-3 py-2 outline-none w-full font-mono" />
                                ) : p.type === 'select' ? (
                                    <select value={current ?? ''} onChange={(e) => onChange(p.id, e.target.value)} className="w-full bg-app-surface border border-app-borderHighlight p-2 rounded-lg text-xs text-app-text outline-none">
                                        {(p.options || []).map((opt, i) => <option key={opt} value={opt}>{(p.labels && p.labels[i]) || opt}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" value={current ?? ''} onChange={(e) => onChange(p.id, e.target.value)} className="bg-app-surface border border-app-borderHighlight text-app-text text-xs rounded-lg px-3 py-2 outline-none w-full font-mono" />
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        };

        // A small in-app confirmation dialog standing in for every native window.confirm()
        // popup in GLIDE (see App's askConfirm/handleConfirmChoice) — matches the rest of the
        // app's design instead of an OS-level interruption, and can offer a real third option
        // ("Export First") inline rather than just discard-or-cancel.
        const ConfirmDialog = ({ state, onChoice }) => {
            if (!state) return null;
            return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => onChoice('cancel')}>
                    <div className="bg-app-surface border border-app-borderHighlight rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-app-text mb-2">{state.title}</h3>
                        <p className="text-xs text-app-textMuted leading-relaxed mb-5 whitespace-pre-wrap">{state.message}</p>
                        <div className="flex flex-col gap-2">
                            {state.extraLabel && (
                                <button onClick={() => onChoice('export')} className="w-full py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-text hover:bg-app-card transition-all">{state.extraLabel}</button>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => onChoice('cancel')} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-all">{state.cancelLabel || 'Cancel'}</button>
                                <button onClick={() => onChoice('confirm')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-none shadow-lg hover:-translate-y-px ${state.danger ? 'bg-red-600 hover:bg-red-500 text-white' : 'btn-active'}`}>{state.confirmLabel || 'Confirm'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { DynamicBehaviorForm, FlowParamForm, ConfirmDialog });
})();
