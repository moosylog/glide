// GLIDE UI — the left sidebar (Layers / Combos / Behavior Library)
//
// The `<aside>` that lists and manages layers, combos, and the five Behavior Library editors
// (Macros/StickyKeys/ModMorphs/HoldTaps/TapDances) — the everyday-editing nav that sits beside
// the canvas, distinct from the always-visible top bar (ui/topBar.js) and the per-key inspector
// panel (still inline in App, Stage 3's next and hardest step). Purely presentational, same
// pattern as the previous two Stage 3 cuts: every value (`config`, `leftNavMode`, the six
// `filtered*` search-memo results, …) and every handler (`addLayer`, `createNewMacro`,
// `cloneStickyKeyAction`, …) comes in as a prop, JSX moved verbatim from `App`'s `<aside>` — no
// call site outside this file needed to change name or shape. `BEHAVIOR_LIBRARY_NAV_MODES` moved
// in here as a local constant (it was only ever read by this JSX, nowhere else in `App`), rather
// than becoming a new `window.GlideUI` export nothing else needs.
//
// Third step of Stage 3's least-coupled-first JSX split (see ARCHITECTURE.md §7 and README.md's
// "Status" section) — the biggest of the three "outer chrome" pieces (top bar, sidebar, then the
// key inspector last), but still no state shared with the canvas or the inspector beyond what
// was already threaded through App's existing handlers.
//
// Reverse-selection UX pass (post-Stage-3): every combo/Behavior-Library row also fires
// `setHoveredComboIdx`/`setHoveredBehaviorName` on hover, so the virtual keyboard can light up
// the keys that use it — App turns that into `usageHighlightKeys` for `KeyboardContainer`. Each
// row clears its own hover value on mouseleave only if it's still the one hovered, so a fast
// mouse move from one row straight to another never flashes an empty gap between them.
(function () {
    const { MiniKeyboardMap } = window.GlideUI;
    const { comboHasBinding, findDuplicateCombos } = window.GlideCore;

    // Sidebar nav modes that live under the collapsible "Behavior Library" section, rather than
    // the always-visible Layers/Combos row — see README.md's "Behavior Library" note for why it's
    // named that and not "Advanced Behaviors" (a pre-existing, unrelated per-key inspector tab).
    const BEHAVIOR_LIBRARY_NAV_MODES = ['Macros', 'StickyKeys', 'ModMorphs', 'HoldTaps', 'TapDances'];

    const Sidebar = ({
        leftPanelSize,
        sidebarSide,
        handleLeftResizeStart,
        config,
        leftNavMode,
        setLeftNavMode,
        behaviorLibraryExpanded,
        setBehaviorLibraryExpanded,
        layerNames,
        draggedLayerIdx,
        dragOverLayerIdx,
        activeLayer,
        isZenMode,
        renamingLayerIdx,
        renameValue,
        setRenameValue,
        commitRenameLayer,
        setRenamingLayerIdx,
        handleLayerPointerDown,
        setActiveLayer,
        setSelectedKey,
        setEditingComboIdx,
        startRenameLayer,
        cloneLayer,
        deleteLayer,
        addLayer,
        createNewCombo,
        comboSearchText,
        setComboSearchText,
        comboLayerFilter,
        setComboLayerFilter,
        filteredCombos,
        editingComboIdx,
        hoveredComboIdx,
        setHoveredComboIdx,
        hoveredBehaviorName,
        setHoveredBehaviorName,
        setActiveVerticalTab,
        pushHistory,
        showToast,
        keyboardGeo,
        createNewMacro,
        macroSearchText,
        setMacroSearchText,
        filteredMacros,
        setMacroModalName,
        cloneMacroAction,
        deleteMacroAction,
        createNewStickyKey,
        stickyKeySearchText,
        setStickyKeySearchText,
        filteredStickyKeys,
        setStickyKeyModalName,
        cloneStickyKeyAction,
        deleteStickyKeyAction,
        createNewModMorph,
        modMorphSearchText,
        setModMorphSearchText,
        filteredModMorphs,
        setModMorphModalName,
        cloneModMorphAction,
        deleteModMorphAction,
        createNewHoldTap,
        holdTapSearchText,
        setHoldTapSearchText,
        filteredHoldTaps,
        setHoldTapModalName,
        cloneHoldTapAction,
        deleteHoldTapAction,
        createNewTapDance,
        tapDanceSearchText,
        setTapDanceSearchText,
        filteredTapDances,
        setTapDanceModalName,
        cloneTapDanceAction,
        deleteTapDanceAction,
    }) => {
        return (
            <aside style={{ width: `${leftPanelSize}px`, order: sidebarSide === 'right' ? 2 : 0 }} className={`shrink-0 bg-app-sidebar flex flex-col z-30 transition-colors relative h-full ${sidebarSide === 'right' ? 'border-l' : 'border-r'} border-app-borderHighlight`}>
                <div onPointerDown={handleLeftResizeStart} title="Drag to resize" style={{ touchAction: 'none' }} className={`absolute top-0 bottom-0 w-3 cursor-col-resize z-50 flex items-center justify-center group ${sidebarSide === 'right' ? '-left-3' : '-right-3'}`}>
                    <div className="w-1 h-14 rounded-full bg-app-borderHighlight group-hover:bg-app-accent transition-colors"></div>
                </div>
                {config && (
                    <div className="p-3 border-b border-app-borderHighlight shrink-0 bg-app-surface">
                        <div className="flex gap-1 bg-app-card rounded-lg border border-app-borderHighlight p-1 shadow-inner">
                            <button onClick={() => { setLeftNavMode('Layers'); setEditingComboIdx(null); setBehaviorLibraryExpanded(false); }} className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${leftNavMode === 'Layers' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Layers</button>
                            <button onClick={() => { setLeftNavMode('Combos'); setBehaviorLibraryExpanded(false); }} className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${leftNavMode === 'Combos' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Combos</button>
                        </div>

                        <button onClick={() => setBehaviorLibraryExpanded((v) => !v)} title="Create and edit named, reusable ZMK behaviors: macros, sticky keys, mod-morphs, hold-taps, tap-dances" className="w-full flex items-center justify-between gap-2 mt-2 px-1 py-1.5 text-[10px] font-bold uppercase tracking-widest text-app-textMuted hover:text-app-text transition-colors">
                            <span>Behavior Library</span>
                            <span className={`transition-transform ${(behaviorLibraryExpanded || BEHAVIOR_LIBRARY_NAV_MODES.includes(leftNavMode)) ? 'rotate-90' : ''}`}>▸</span>
                        </button>
                        {(behaviorLibraryExpanded || BEHAVIOR_LIBRARY_NAV_MODES.includes(leftNavMode)) && (
                            <div className="flex flex-wrap gap-1 bg-app-card rounded-lg border border-app-borderHighlight p-1 shadow-inner mt-1">
                                <button onClick={() => { setLeftNavMode('Macros'); setEditingComboIdx(null); }} className={`flex-1 min-w-[30%] py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${leftNavMode === 'Macros' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Macros</button>
                                <button onClick={() => { setLeftNavMode('StickyKeys'); setEditingComboIdx(null); }} title="Sticky Keys" className={`flex-1 min-w-[30%] py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${leftNavMode === 'StickyKeys' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Sticky</button>
                                <button onClick={() => { setLeftNavMode('ModMorphs'); setEditingComboIdx(null); }} title="Mod-Morphs" className={`flex-1 min-w-[30%] py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${leftNavMode === 'ModMorphs' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Morphs</button>
                                <button onClick={() => { setLeftNavMode('HoldTaps'); setEditingComboIdx(null); }} title="Hold-Taps" className={`flex-1 min-w-[30%] py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${leftNavMode === 'HoldTaps' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Hold-Taps</button>
                                <button onClick={() => { setLeftNavMode('TapDances'); setEditingComboIdx(null); }} title="Tap-Dances" className={`flex-1 min-w-[30%] py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-all ${leftNavMode === 'TapDances' ? 'bg-app-accent text-white shadow-sm' : 'text-app-textMuted hover:text-app-text'}`}>Tap-Dances</button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col min-h-0 relative">
                    {config && leftNavMode === 'Layers' && (
                        <div className="p-4 flex flex-col gap-2 min-w-max">
                            {layerNames.map((displayName, i) => {
                                const isDragged = draggedLayerIdx === i;
                                const isDropTarget = dragOverLayerIdx === i && draggedLayerIdx !== null && draggedLayerIdx !== i;
                                return (
                                    <div
                                        key={i}
                                        data-layer-idx={i}
                                        className={`relative group flex items-center rounded-xl transition-all duration-200
                                            ${activeLayer === i && !isZenMode ? 'bg-app-card border border-app-accent shadow-sm' : 'border border-transparent hover:border-app-borderHighlight hover:bg-app-surface'}
                                            ${isDragged ? 'opacity-40 scale-95 border-dashed border-app-borderHighlight' : ''}
                                            ${isDropTarget ? 'border-t-2 border-t-app-accent' : ''}
                                        `}
                                    >
                                        {renamingLayerIdx === i ? (
                                            <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={commitRenameLayer} onKeyDown={(e) => { if (e.key === 'Enter') commitRenameLayer(); if (e.key === 'Escape') setRenamingLayerIdx(null); }} className="w-full mx-2 my-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-black outline-none shadow-sm min-w-0" />
                                        ) : (
                                            <>
                                                <div onPointerDown={(e) => handleLayerPointerDown(e, i)} style={{ touchAction: 'none' }} className="px-3 py-2 -my-2 cursor-grab opacity-50 group-hover:opacity-80 hover:!opacity-100 text-app-textMuted text-[15px] leading-none flex items-center justify-center shrink-0 transition-opacity" title="Drag to reorder">⠿</div>
                                                <div onClick={() => { setActiveLayer(i); setSelectedKey(null); setEditingComboIdx(null); }} onDoubleClick={() => startRenameLayer(i, displayName)} className="flex-1 flex items-center gap-2 py-2.5 min-w-0 cursor-pointer pr-4" title="Double-click to rename">
                                                    <span className="opacity-50 font-mono text-[10px] w-3 text-right shrink-0">{i}</span>
                                                    <span className={`min-w-0 flex-1 truncate font-bold text-xs ${activeLayer === i && !isZenMode ? 'text-app-accent' : ''}`}>{displayName}</span>
                                                </div>
                                                <div className={`flex items-center transition-opacity pr-2 shrink-0 bg-app-surface/50 backdrop-blur-md rounded px-1 py-0.5 shadow-sm border border-app-borderHighlight absolute right-1 ${activeLayer === i && !isZenMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <button onClick={(e) => { e.stopPropagation(); cloneLayer(i); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-app-text hover:bg-white/10 rounded transition-colors" title="Clone layer">⧉</button>
                                                    <button onClick={(e) => { e.stopPropagation(); startRenameLayer(i, displayName); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-app-text hover:bg-white/10 rounded transition-colors" title="Rename layer">✎</button>
                                                    {config.layers.length > 1 && ( <button onClick={(e) => { e.stopPropagation(); deleteLayer(i); }} className="w-6 h-6 flex items-center justify-center text-red-500/70 hover:text-red-400 hover:bg-red-900/50 rounded transition-colors" title="Delete layer">🗑️</button> )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            <button onClick={addLayer} className="mt-2 w-full py-2.5 rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted hover:bg-app-card flex items-center justify-center gap-2 transition-all font-semibold text-xs hover:-translate-y-px shrink-0">
                               <span className="text-lg leading-none mt-[-2px]">+</span> Add Layer
                            </button>
                        </div>
                    )}

                    {config && leftNavMode === 'Combos' && (() => {
                        // Computed once per render of the Combos list rather than per-row: a
                        // combo's conflict status depends on every OTHER combo too, so checking
                        // it inside the .map() below would mean re-scanning the whole list once
                        // per row (O(n^2) become O(n^3) across the list). See core/zmk/combos.js
                        // for what actually counts as a conflict (same keys, overlapping layers).
                        const duplicateComboIdxs = new Set(findDuplicateCombos(config.combos || []).map((d) => d.idx));
                        return (
                        <div className="p-4 flex flex-col gap-2">
                            <button onClick={createNewCombo} className="w-full py-2.5 rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted hover:bg-app-card flex items-center justify-center gap-2 transition-all font-semibold text-xs hover:-translate-y-px shrink-0 mb-3">
                               <span className="text-lg leading-none mt-[-2px]">+</span> Create Combo
                            </button>

                            {(config.combos || []).length > 0 && (
                                <div className="flex flex-col gap-2 mb-3">
                                    <div className="relative">
                                        <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        <input type="text" value={comboSearchText} onChange={(e) => setComboSearchText(e.target.value)} placeholder="Search by name or key (e.g. T1)..." className="w-full bg-app-card border border-app-borderHighlight rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors" />
                                        {comboSearchText && <button onClick={() => setComboSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text text-xs">✕</button>}
                                    </div>
                                    <select value={comboLayerFilter === null ? '' : comboLayerFilter} onChange={(e) => setComboLayerFilter(e.target.value === '' ? null : parseInt(e.target.value))} className="w-full bg-app-surface border border-app-borderHighlight text-app-text text-[11px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
                                        <option value="">All Layers</option>
                                        {layerNames.map((n, i) => (
                                            <option key={i} value={i}>{n}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(config.combos || []).length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No combos created yet.</div>}
                            {(config.combos || []).length > 0 && filteredCombos.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No combos match your search/filter.</div>}

                            {filteredCombos.map(({ combo, idx }) => {
                                const keyPositions = combo.keyPositions || combo.key_positions || [];
                                return (
                                    <div key={idx} onClick={() => { setEditingComboIdx(idx); setSelectedKey(null); setActiveVerticalTab('Keymap'); }} onMouseEnter={() => setHoveredComboIdx(idx)} onMouseLeave={() => setHoveredComboIdx((prev) => prev === idx ? null : prev)} onPointerDown={(e) => { if (e.pointerType !== 'mouse') setHoveredComboIdx(idx); }} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHoveredComboIdx((prev) => prev === idx ? null : prev); }} onPointerCancel={(e) => { if (e.pointerType !== 'mouse') setHoveredComboIdx((prev) => prev === idx ? null : prev); }} className={`flex flex-col gap-2 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer relative group ${editingComboIdx === idx ? 'bg-app-card border-app-accent shadow-sm' : hoveredComboIdx === idx ? 'border-amber-500/40 bg-app-surface' : 'border-transparent hover:border-app-borderHighlight hover:bg-app-surface'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${editingComboIdx === idx ? 'bg-app-accent text-white' : 'bg-app-panel border border-app-borderHighlight text-app-textMuted'}`}>C{idx + 1}</span>
                                                <span className={`min-w-0 flex-1 truncate ${editingComboIdx === idx ? 'text-app-text' : 'text-app-textMuted'}`}>{combo.name || `Combo ${idx+1}`}</span>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); const n = structuredClone(config); n.combos.splice(idx, 1); pushHistory(n); if (editingComboIdx === idx) { setEditingComboIdx(null); } showToast('Combo deleted'); }} className={`w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-red-400 hover:bg-red-900/30 rounded transition-colors shrink-0 ${editingComboIdx === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>🗑️</button>
                                        </div>
                                        <MiniKeyboardMap geo={keyboardGeo} selectedKeys={keyPositions} readonly={true} size={64} />
                                        {(combo.layers || []).includes(-1) ? (
                                            <div className="flex flex-wrap gap-1">
                                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-app-panel border border-app-borderHighlight text-app-textMuted normal-case">All Layers</span>
                                            </div>
                                        ) : (combo.layers || []).length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {combo.layers.map((li) => (
                                                    <span key={li} className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-app-panel border border-app-borderHighlight text-app-textMuted normal-case">{layerNames[li] || `Layer ${li}`}</span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Both checks are the same ones handleExport re-runs before letting a layout out the
                                            door (core/zmk/combos.js) — surfaced here too so the problem is visible the moment
                                            it happens, not just as a surprise on export. */}
                                        {keyPositions.length > 0 && !comboHasBinding(combo) && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-900/40 border border-amber-600/50 text-amber-400 normal-case w-fit" title="This combo has no action assigned — it will fire and do nothing">⚠ No action</span>
                                        )}
                                        {duplicateComboIdxs.has(idx) && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-900/40 border border-red-600/50 text-red-400 normal-case w-fit" title="Another combo uses this exact same set of keys on an overlapping layer">⚠ Duplicate keys</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        );
                    })()}

                    {config && leftNavMode === 'Macros' && (
                        <div className="p-4 flex flex-col gap-2">
                            <button onClick={createNewMacro} className="w-full py-2.5 rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted hover:bg-app-card flex items-center justify-center gap-2 transition-all font-semibold text-xs hover:-translate-y-px shrink-0 mb-3">
                               <span className="text-lg leading-none mt-[-2px]">+</span> Create Macro
                            </button>

                            {(config.macros || []).length > 0 && (
                                <div className="relative mb-3">
                                    <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <input type="text" value={macroSearchText} onChange={(e) => setMacroSearchText(e.target.value)} placeholder="Search by name or description..." className="w-full bg-app-card border border-app-borderHighlight rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors" />
                                    {macroSearchText && <button onClick={() => setMacroSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text text-xs">✕</button>}
                                </div>
                            )}

                            {(config.macros || []).length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No macros created yet.</div>}
                            {(config.macros || []).length > 0 && filteredMacros.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No macros match your search.</div>}

                            {filteredMacros.map(({ macro, idx }) => {
                                const stepCount = (macro.bindings || []).length;
                                return (
                                    <div key={idx} onClick={() => setMacroModalName(macro.name)} onMouseEnter={() => setHoveredBehaviorName(macro.name)} onMouseLeave={() => setHoveredBehaviorName((prev) => prev === macro.name ? null : prev)} onPointerDown={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName(macro.name); }} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === macro.name ? null : prev); }} onPointerCancel={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === macro.name ? null : prev); }} className={`flex flex-col gap-1 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer relative group ${hoveredBehaviorName === macro.name ? 'border-amber-500/40 bg-app-surface' : 'border-transparent hover:border-app-borderHighlight hover:bg-app-surface'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 bg-app-panel border border-app-borderHighlight text-app-textMuted">M</span>
                                                <span className="min-w-0 flex-1 truncate text-app-textMuted group-hover:text-app-text">{(macro.name || '').replace('&', '')}</span>
                                            </div>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); cloneMacroAction(macro.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-app-text hover:bg-white/10 rounded transition-colors" title="Clone macro">⧉</button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteMacroAction(macro.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete macro">🗑️</button>
                                            </div>
                                        </div>
                                        {macro.description && <p className="text-[10px] font-medium text-app-textMuted normal-case truncate pl-7">{macro.description}</p>}
                                        <p className="text-[9px] font-semibold text-app-textMuted normal-case pl-7 opacity-60">{stepCount} step{stepCount !== 1 ? 's' : ''}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {config && leftNavMode === 'StickyKeys' && (
                        <div className="p-4 flex flex-col gap-2">
                            <button onClick={createNewStickyKey} className="w-full py-2.5 rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted hover:bg-app-card flex items-center justify-center gap-2 transition-all font-semibold text-xs hover:-translate-y-px shrink-0 mb-3">
                               <span className="text-lg leading-none mt-[-2px]">+</span> Create Sticky Key
                            </button>

                            {(config.stickyKeys || []).length > 0 && (
                                <div className="relative mb-3">
                                    <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <input type="text" value={stickyKeySearchText} onChange={(e) => setStickyKeySearchText(e.target.value)} placeholder="Search by name or description..." className="w-full bg-app-card border border-app-borderHighlight rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors" />
                                    {stickyKeySearchText && <button onClick={() => setStickyKeySearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text text-xs">✕</button>}
                                </div>
                            )}

                            {(config.stickyKeys || []).length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No sticky keys created yet.</div>}
                            {(config.stickyKeys || []).length > 0 && filteredStickyKeys.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No sticky keys match your search.</div>}

                            {filteredStickyKeys.map(({ stickyKey, idx }) => (
                                <div key={idx} onClick={() => setStickyKeyModalName(stickyKey.name)} onMouseEnter={() => setHoveredBehaviorName(stickyKey.name)} onMouseLeave={() => setHoveredBehaviorName((prev) => prev === stickyKey.name ? null : prev)} onPointerDown={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName(stickyKey.name); }} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === stickyKey.name ? null : prev); }} onPointerCancel={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === stickyKey.name ? null : prev); }} className={`flex flex-col gap-1 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer relative group ${hoveredBehaviorName === stickyKey.name ? 'border-amber-500/40 bg-app-surface' : 'border-transparent hover:border-app-borderHighlight hover:bg-app-surface'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 bg-app-panel border border-app-borderHighlight text-app-textMuted">📌</span>
                                            <span className="min-w-0 flex-1 truncate text-app-textMuted group-hover:text-app-text">{(stickyKey.name || '').replace('&', '')}</span>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); cloneStickyKeyAction(stickyKey.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-app-text hover:bg-white/10 rounded transition-colors" title="Clone sticky key">⧉</button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteStickyKeyAction(stickyKey.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete sticky key">🗑️</button>
                                        </div>
                                    </div>
                                    {stickyKey.description && <p className="text-[10px] font-medium text-app-textMuted normal-case truncate pl-7">{stickyKey.description}</p>}
                                    <p className="text-[9px] font-semibold text-app-textMuted normal-case pl-7 opacity-60">{[
                                        stickyKey.quickRelease ? 'quick release' : null,
                                        stickyKey.lazy ? 'lazy' : null,
                                        typeof stickyKey.releaseAfterMs === 'number' ? `${stickyKey.releaseAfterMs}ms` : null,
                                    ].filter(Boolean).join(' · ') || 'defaults'}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {config && leftNavMode === 'ModMorphs' && (
                        <div className="p-4 flex flex-col gap-2">
                            <button onClick={createNewModMorph} className="w-full py-2.5 rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted hover:bg-app-card flex items-center justify-center gap-2 transition-all font-semibold text-xs hover:-translate-y-px shrink-0 mb-3">
                               <span className="text-lg leading-none mt-[-2px]">+</span> Create Mod-Morph
                            </button>

                            {(config.modMorphs || []).length > 0 && (
                                <div className="relative mb-3">
                                    <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <input type="text" value={modMorphSearchText} onChange={(e) => setModMorphSearchText(e.target.value)} placeholder="Search by name or description..." className="w-full bg-app-card border border-app-borderHighlight rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors" />
                                    {modMorphSearchText && <button onClick={() => setModMorphSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text text-xs">✕</button>}
                                </div>
                            )}

                            {(config.modMorphs || []).length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No mod-morphs created yet.</div>}
                            {(config.modMorphs || []).length > 0 && filteredModMorphs.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No mod-morphs match your search.</div>}

                            {filteredModMorphs.map(({ modMorph, idx }) => {
                                const mods = modMorph.cases?.[1]?.mods || [];
                                return (
                                    <div key={idx} onClick={() => setModMorphModalName(modMorph.name)} onMouseEnter={() => setHoveredBehaviorName(modMorph.name)} onMouseLeave={() => setHoveredBehaviorName((prev) => prev === modMorph.name ? null : prev)} onPointerDown={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName(modMorph.name); }} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === modMorph.name ? null : prev); }} onPointerCancel={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === modMorph.name ? null : prev); }} className={`flex flex-col gap-1 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer relative group ${hoveredBehaviorName === modMorph.name ? 'border-amber-500/40 bg-app-surface' : 'border-transparent hover:border-app-borderHighlight hover:bg-app-surface'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 bg-app-panel border border-app-borderHighlight text-app-textMuted">⇄</span>
                                                <span className="min-w-0 flex-1 truncate text-app-textMuted group-hover:text-app-text">{(modMorph.name || '').replace('&', '')}</span>
                                            </div>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); cloneModMorphAction(modMorph.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-app-text hover:bg-white/10 rounded transition-colors" title="Clone mod-morph">⧉</button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteModMorphAction(modMorph.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete mod-morph">🗑️</button>
                                            </div>
                                        </div>
                                        {modMorph.description && <p className="text-[10px] font-medium text-app-textMuted normal-case truncate pl-7">{modMorph.description}</p>}
                                        <p className="text-[9px] font-semibold text-app-textMuted normal-case pl-7 opacity-60">{mods.length > 0 ? mods.map((m) => m.replace('MOD_', '')).join(' + ') : 'no trigger mods set'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {config && leftNavMode === 'HoldTaps' && (
                        <div className="p-4 flex flex-col gap-2">
                            <button onClick={createNewHoldTap} className="w-full py-2.5 rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted hover:bg-app-card flex items-center justify-center gap-2 transition-all font-semibold text-xs hover:-translate-y-px shrink-0 mb-3">
                               <span className="text-lg leading-none mt-[-2px]">+</span> Create Hold-Tap
                            </button>

                            {(config.holdTaps || []).length > 0 && (
                                <div className="relative mb-3">
                                    <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <input type="text" value={holdTapSearchText} onChange={(e) => setHoldTapSearchText(e.target.value)} placeholder="Search by name or description..." className="w-full bg-app-card border border-app-borderHighlight rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors" />
                                    {holdTapSearchText && <button onClick={() => setHoldTapSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text text-xs">✕</button>}
                                </div>
                            )}

                            {(config.holdTaps || []).length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No hold-taps created yet.</div>}
                            {(config.holdTaps || []).length > 0 && filteredHoldTaps.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No hold-taps match your search.</div>}

                            {filteredHoldTaps.map(({ holdTap, idx }) => (
                                <div key={idx} onClick={() => setHoldTapModalName(holdTap.name)} onMouseEnter={() => setHoveredBehaviorName(holdTap.name)} onMouseLeave={() => setHoveredBehaviorName((prev) => prev === holdTap.name ? null : prev)} onPointerDown={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName(holdTap.name); }} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === holdTap.name ? null : prev); }} onPointerCancel={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === holdTap.name ? null : prev); }} className={`flex flex-col gap-1 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer relative group ${hoveredBehaviorName === holdTap.name ? 'border-amber-500/40 bg-app-surface' : 'border-transparent hover:border-app-borderHighlight hover:bg-app-surface'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 bg-app-panel border border-app-borderHighlight text-app-textMuted">⏱️</span>
                                            <span className="min-w-0 flex-1 truncate text-app-textMuted group-hover:text-app-text">{(holdTap.name || '').replace('&', '')}</span>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); cloneHoldTapAction(holdTap.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-app-text hover:bg-white/10 rounded transition-colors" title="Clone hold-tap">⧉</button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteHoldTapAction(holdTap.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete hold-tap">🗑️</button>
                                        </div>
                                    </div>
                                    {holdTap.description && <p className="text-[10px] font-medium text-app-textMuted normal-case truncate pl-7">{holdTap.description}</p>}
                                    <p className="text-[9px] font-semibold text-app-textMuted normal-case pl-7 opacity-60">{(holdTap.flavor || 'tap-preferred')}{(holdTap.bindings || []).length >= 2 ? ` · ${(holdTap.bindings[0] || '').replace('&', '')} / ${(holdTap.bindings[1] || '').replace('&', '')}` : ''}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {config && leftNavMode === 'TapDances' && (
                        <div className="p-4 flex flex-col gap-2">
                            <button onClick={createNewTapDance} className="w-full py-2.5 rounded-lg border border-dashed border-app-borderHighlight text-app-textMuted hover:text-app-text hover:border-app-textMuted hover:bg-app-card flex items-center justify-center gap-2 transition-all font-semibold text-xs hover:-translate-y-px shrink-0 mb-3">
                               <span className="text-lg leading-none mt-[-2px]">+</span> Create Tap-Dance
                            </button>

                            {(config.tapDances || []).length > 0 && (
                                <div className="relative mb-3">
                                    <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <input type="text" value={tapDanceSearchText} onChange={(e) => setTapDanceSearchText(e.target.value)} placeholder="Search by name or description..." className="w-full bg-app-card border border-app-borderHighlight rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors" />
                                    {tapDanceSearchText && <button onClick={() => setTapDanceSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text text-xs">✕</button>}
                                </div>
                            )}

                            {(config.tapDances || []).length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No tap-dances created yet.</div>}
                            {(config.tapDances || []).length > 0 && filteredTapDances.length === 0 && <div className="text-app-textMuted text-xs italic text-center py-4">No tap-dances match your search.</div>}

                            {filteredTapDances.map(({ tapDance, idx }) => (
                                <div key={idx} onClick={() => setTapDanceModalName(tapDance.name)} onMouseEnter={() => setHoveredBehaviorName(tapDance.name)} onMouseLeave={() => setHoveredBehaviorName((prev) => prev === tapDance.name ? null : prev)} onPointerDown={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName(tapDance.name); }} onPointerUp={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === tapDance.name ? null : prev); }} onPointerCancel={(e) => { if (e.pointerType !== 'mouse') setHoveredBehaviorName((prev) => prev === tapDance.name ? null : prev); }} className={`flex flex-col gap-1 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer relative group ${hoveredBehaviorName === tapDance.name ? 'border-amber-500/40 bg-app-surface' : 'border-transparent hover:border-app-borderHighlight hover:bg-app-surface'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 bg-app-panel border border-app-borderHighlight text-app-textMuted">🔀</span>
                                            <span className="min-w-0 flex-1 truncate text-app-textMuted group-hover:text-app-text">{(tapDance.name || '').replace('&', '')}</span>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); cloneTapDanceAction(tapDance.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-app-text hover:bg-white/10 rounded transition-colors" title="Clone tap-dance">⧉</button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteTapDanceAction(tapDance.name); }} className="w-6 h-6 flex items-center justify-center text-app-textMuted hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete tap-dance">🗑️</button>
                                        </div>
                                    </div>
                                    {tapDance.description && <p className="text-[10px] font-medium text-app-textMuted normal-case truncate pl-7">{tapDance.description}</p>}
                                    <p className="text-[9px] font-semibold text-app-textMuted normal-case pl-7 opacity-60">{(tapDance.bindings || []).length} taps</p>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </aside>
        );
    };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { Sidebar });
})();
