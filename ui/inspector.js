// GLIDE UI — the per-key/per-combo inspector panel
//
// The `<aside>` that opens beside the canvas once a key or combo is selected: the Combo Gear
// Settings sub-panel, the five-tab vertical switcher (Pick Key / Switch Layer / Advanced
// Behaviors / Lighting / JSON), and each tab's full editor — the biggest and most tightly-coupled piece of
// App's old JSX, since every tab reads `selectedKey`/`config`/`activeLayer` and writes back
// through the same handful of handlers (`assignAction`, `pushHistory`, …). Purely presentational,
// same pattern as the previous three Stage 3 cuts: every value and handler comes in as a prop,
// JSX moved verbatim from `App`'s `<aside>` — no call site outside this file needed to change
// name or shape, and the outer `config && (...)` gate that used to sit at the call site now sits
// inside this component's own return instead, so `<InspectorPanel .../>` can be invoked
// unconditionally in `App` exactly like `<TopBar/>` and `<Sidebar/>` already are.
//
// A handful of small helpers/constants (`SLOT_LABELS`, `SLOT_LINK_LABELS`, `MOD_BASES`,
// `getModSymbol`, `paletteLabel`) moved in here as local constants — this JSX was their only
// reader. `KEY_COLOR_PRESETS` is read here *and* by App's own `usedLayoutColors` memo, so it
// moved to ui/shared.js instead, the shared home for anything two or more files need.
//
// Fourth and final step of Stage 3's least-coupled-first JSX split (see ARCHITECTURE.md §7 and
// README.md's "Status" section) — with this piece extracted, `App`'s `return` is down to its
// outer shell (TopBar, Sidebar, the canvas `<section>`, this panel, and the modals) plus the
// hooks and handlers every tab still needs.
(function () {
    const {
        RAW_MOD_CODES,
        formatKeycode,
        MOD_WRAPPER_TO_FULL,
        FULL_TO_MOD_WRAPPER,
        unwrapModChain,
        getLogicalName,
    } = window.GlideCore;
    const { searchAcrossAllPalette, ALL_PALETTE_SECTIONS, KEY_COLOR_PRESETS } = window.GlideUI;

    const SLOT_LABELS = { tap: 'Tap Action', shiftTap: 'Shift Action', hold: 'Hold Action', doubleTap: 'Double-Tap Action', label: 'Custom Key Text' };
    const SLOT_LINK_LABELS = { shiftTap: 'when tapped with Shift', hold: 'when held', doubleTap: 'when double-tapped', label: 'add text label to the key' };

    const MOD_BASES = [
        { base: 'C', mac: '⌃', win: 'Ctrl', linux: 'Ctrl', nameMac: 'Control', nameWin: 'Control', nameLinux: 'Control' },
        { base: 'A', mac: '⌥', win: 'Alt', linux: 'Alt', nameMac: 'Option', nameWin: 'Alt', nameLinux: 'Alt' },
        { base: 'S', mac: '⇧', win: '⇧', linux: '⇧', nameMac: 'Shift', nameWin: 'Shift', nameLinux: 'Shift' },
        { base: 'G', mac: '⌘', win: '⊞', linux: '❖', nameMac: 'Command', nameWin: 'Windows', nameLinux: 'Super' }
    ];

    const paletteLabel = (item, osMode) => {
        if (item.code && RAW_MOD_CODES.has(item.code)) return <span className="key-center">{formatKeycode(item.code, osMode)}</span>;
        return <span className="key-center">{item.label}</span>;
    };

    const getModSymbol = (code, os) => {
        const isMac = os === 'mac'; const isLinux = os === 'linux'; const isRight = code.startsWith('R');
        let sym = '';
        if (code.endsWith('C')) sym = isMac ? '⌃' : 'Ctrl'; else if (code.endsWith('A')) sym = isMac ? '⌥' : 'Alt'; else if (code.endsWith('S')) sym = '⇧'; else if (code.endsWith('G')) sym = isMac ? '⌘' : (isLinux ? '❖' : '⊞');
        return <span className="flex items-start justify-center w-full"><span>{sym}</span>{isRight && <sup className="text-[7px] -ml-0.5 mt-0.5 opacity-70">R</sup>}</span>;
    };

    const { useState, useEffect } = React;

    const InspectorPanel = ({
        layoutMode,
        panelSize,
        handleRightResizeStart,
        editingComboIdx,
        setEditingComboIdx,
        combosContainingSelectedKey,
        config,
        selectedKey,
        setSelectedKey,
        askConfirm,
        clearAllActions,
        showComboSettings,
        setShowComboSettings,
        pushHistory,
        activeLayer,
        layerNames,
        activeSlotKeys,
        renderSlot,
        availableToAdd,
        setManuallyAddedSlots,
        setActiveActionSlot,
        modSide,
        setModSide,
        armedMods,
        parsedSlots,
        activeActionSlot,
        effectiveOs,
        toggleModifier,
        paletteSearch,
        setPaletteSearch,
        assignAction,
        isItemActive,
        advancedSearch,
        setAdvancedSearch,
        advancedCategory,
        setAdvancedCategory,
        filteredBehaviors,
        activeVerticalTab,
        setActiveVerticalTab,
        targetLayerIdx,
        setTargetLayerIdx,
        assignLayerTap,
        showLeds,
        setShowLeds,
        setKeyDecoration,
        paintColor,
        usedLayoutColors,
        currentLayerBindings,
        bgHexInput,
        setBgHexInput,
        applyBgHexInput,
        paintMode,
        setPaintMode,
        jsonStr,
        setJsonStr,
        jsonError,
        saveCustomJson,
    }) => {
        // Raw JSON AST editing is locked by default -- one wrong hand-edit here can corrupt the
        // whole layout in a way the normal key/behavior editors can't produce, so it takes an
        // explicit unlock (the lock icon, top-right of that tab) rather than being editable the
        // moment you open it. Local, ephemeral UI state (not lifted to App, unlike everything
        // else this component reads) -- it re-locks whenever you switch to a different key or
        // combo, so an unlock never silently carries over onto the next thing you select.
        const [jsonUnlocked, setJsonUnlocked] = useState(false);
        useEffect(() => { setJsonUnlocked(false); }, [selectedKey, editingComboIdx]);

        return (
            config && (
                <aside style={{ [layoutMode === 'right' ? 'width' : 'height']: `${panelSize}px` }} className={`shrink-0 flex ${layoutMode === 'right' ? 'flex-col border-l shadow-[-20px_0_40px_rgba(0,0,0,0.5)]' : 'flex-row border-t shadow-[0_-20px_40px_rgba(0,0,0,0.5)]'} bg-app-sidebar border-app-borderHighlight z-40 relative transition-colors`} onClick={e => e.stopPropagation()}>
                    <div onPointerDown={handleRightResizeStart} title="Drag to resize" style={{ touchAction: 'none' }} className={`absolute ${layoutMode === 'right' ? 'top-0 bottom-0 left-[-12px] w-3 cursor-col-resize flex-col' : '-top-3 left-0 right-0 h-6 cursor-row-resize flex-row'} z-50 flex items-center justify-center group`}><div className={`${layoutMode === 'right' ? 'w-1 h-14' : 'w-14 h-1'} rounded-full bg-app-borderHighlight group-hover:bg-app-accent transition-colors`}></div></div>

                    <div className={`${layoutMode === 'right' ? 'p-6 border-b max-h-[50vh]' : 'w-[360px] p-6 border-r'} border-app-borderHighlight shrink-0 bg-app-surface flex flex-col overflow-y-auto`}>
                        <div className="text-app-text mb-6 text-[15px] flex justify-between items-center px-1">
                            <span className="font-bold flex items-center gap-2 truncate pr-2">
                                {editingComboIdx !== null ? (
                                    <><span className="w-5 h-5 rounded bg-app-accent text-white flex items-center justify-center text-[10px] shadow-sm shrink-0">C</span><span className="truncate">{config.combos[editingComboIdx]?.name || `Combo ${editingComboIdx + 1}`}</span></>
                                ) : selectedKey !== null ? (
                                    `Key ${getLogicalName(selectedKey, config?.keyboard)}`
                                ) : 'No Selection'}
                            </span>
                            <button className="text-app-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors w-8 h-8 rounded-lg flex items-center justify-center shrink-0" title="Clear All Actions" onClick={async () => { if ((await askConfirm({ title: 'Clear all actions?', message: 'Every action on this key (or combo) will be cleared.', confirmLabel: 'Clear', danger: true })) === 'confirm') { clearAllActions(); } }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                        </div>

                        {/* "Part of combo — Edit" chip(s): a key selected outside combo-edit mode
                            can already belong to one or more existing combos. Clicking a chip is
                            the only thing it does — jumps into that combo's own edit mode via the
                            same setEditingComboIdx the sidebar's Combos list uses — so selecting a
                            key never surprises you by silently entering Zen Mode on its own. */}
                        {editingComboIdx === null && combosContainingSelectedKey.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3 -mt-1">
                                {combosContainingSelectedKey.map(({ combo, idx }) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setEditingComboIdx(idx); setSelectedKey(null); setActiveVerticalTab('Keymap'); }}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-app-accentGhost border border-app-accent/40 text-app-accent hover:bg-app-accent hover:text-white transition-colors"
                                        title="Jump to editing this combo"
                                    >
                                        <span>⚡</span> Part of "{combo.name || `Combo ${idx + 1}`}" — Edit
                                    </button>
                                ))}
                            </div>
                        )}

                        {(selectedKey !== null || editingComboIdx !== null) ? (
                            <div className="flex flex-col gap-2.5">

                                {/* COMBO GEAR SETTINGS */}
                                {editingComboIdx !== null && (
                                    <div className="mb-4">
                                        <button onClick={() => setShowComboSettings(!showComboSettings)} className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm ${showComboSettings ? 'bg-app-accentGhost border-app-accent text-app-accent' : 'bg-app-card border-app-borderHighlight text-app-textMuted hover:text-app-text hover:-translate-y-px'}`}>
                                            <span>⚙️</span> Combo Settings
                                        </button>
                                        {showComboSettings && (
                                            <div className="mt-2 p-4 bg-app-card border border-app-borderHighlight rounded-xl shadow-inner flex flex-col gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] uppercase font-bold text-app-textMuted tracking-widest">Name</label>
                                                    <input type="text" value={config.combos[editingComboIdx].name || ''} onChange={(e) => { const n = structuredClone(config); n.combos[editingComboIdx].name = e.target.value; pushHistory(n); }} className="w-full bg-app-surface border border-app-borderHighlight rounded-lg px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent transition-colors" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] uppercase font-bold text-app-textMuted tracking-widest">Description</label>
                                                    <input type="text" value={config.combos[editingComboIdx].description || ''} onChange={(e) => { const n = structuredClone(config); n.combos[editingComboIdx].description = e.target.value; pushHistory(n); }} className="w-full bg-app-surface border border-app-borderHighlight rounded-lg px-3 py-2 text-xs text-app-text outline-none focus:border-app-accent transition-colors" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] uppercase font-bold text-app-textMuted tracking-widest">Timeout (ms)</label>
                                                    <input type="number" min="10" max="500" value={config.combos[editingComboIdx].timeoutMs ?? 50} onChange={(e) => { const n = structuredClone(config); n.combos[editingComboIdx].timeoutMs = parseInt(e.target.value) || 50; pushHistory(n); }} className="w-full bg-app-surface border border-app-borderHighlight rounded-lg px-3 py-2 text-xs font-mono text-app-text outline-none focus:border-app-accent transition-colors" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] uppercase font-bold text-app-textMuted tracking-widest">Layers</label>
                                                    <label className="flex items-center gap-2 text-xs font-bold text-app-text cursor-pointer select-none">
                                                        <input type="checkbox" checked={(config.combos[editingComboIdx].layers || []).includes(-1)} onChange={(e) => {
                                                            const nCfg = structuredClone(config);
                                                            const c = nCfg.combos[editingComboIdx];
                                                            c.layers = e.target.checked ? [-1] : [activeLayer];
                                                            pushHistory(nCfg);
                                                        }} className="w-3.5 h-3.5 accent-app-accent" />
                                                        Combo applies on all layers
                                                    </label>
                                                    {!(config.combos[editingComboIdx].layers || []).includes(-1) && (
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {layerNames.map((n, i) => {
                                                                const isActive = (config.combos[editingComboIdx].layers || []).includes(i);
                                                                return (
                                                                    <button key={i} onClick={() => {
                                                                        const nCfg = structuredClone(config);
                                                                        const c = nCfg.combos[editingComboIdx];
                                                                        const current = c.layers || [];
                                                                        if (current.includes(i)) {
                                                                            // Never allow an empty selection — deselecting the last
                                                                            // specific layer falls back to the current active layer.
                                                                            const next = current.filter(l => l !== i);
                                                                            c.layers = next.length > 0 ? next : [activeLayer];
                                                                        } else {
                                                                            c.layers = [...current, i];
                                                                        }
                                                                        pushHistory(nCfg);
                                                                    }} className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-colors ${isActive ? 'bg-app-accent text-white border-app-accent shadow-sm' : 'bg-app-surface text-app-textMuted border-app-borderHighlight hover:text-app-text hover:border-app-textMuted'}`}>
                                                                        {n}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-2 pt-3 border-t border-app-borderHighlight flex justify-end">
                                                    <button onClick={() => setShowComboSettings(false)} className="px-4 py-1.5 bg-app-surface border border-app-borderHighlight rounded-lg text-xs font-bold hover:bg-app-panel transition-colors">Done</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeSlotKeys.map(slotKey => renderSlot(slotKey, SLOT_LABELS[slotKey]))}

                                {availableToAdd.length > 0 && (
                                    <div className="text-app-textMuted text-[12.5px] leading-relaxed mt-4 px-1">
                                        You can also specify an action to do{' '}
                                        {availableToAdd.map((slotKey, index) => {
                                            const isLast = index === availableToAdd.length - 1; const isSecondToLast = index === availableToAdd.length - 2;
                                            let separator = ''; if (availableToAdd.length > 2 && !isLast) separator = ', '; if (availableToAdd.length >= 2 && isSecondToLast) separator = availableToAdd.length > 2 ? ', or ' : ' or ';

                                            const linkLabel = SLOT_LINK_LABELS[slotKey];

                                            return ( <React.Fragment key={slotKey}><span className="text-app-accent hover:text-app-text cursor-pointer underline decoration-app-accentGhost hover:decoration-app-borderHighlight transition-colors" onClick={() => { setManuallyAddedSlots(prev => new Set(prev).add(slotKey)); setActiveActionSlot(slotKey); }}>{linkLabel}</span>{separator}</React.Fragment> );
                                        })}.
                                    </div>
                                )}
                            </div>
                        ) : <div className="text-app-textMuted text-[12px] italic leading-relaxed text-center mt-10">Select a key or combo to edit.</div>}
                    </div>

                    {/* iPhone-style labeled picker (UX pass, Phase 4) — icon-above-label-below in
                        every tab, matching an iOS tab bar, whichever orientation this row of tabs
                        renders in (a horizontal strip along the top when the panel docks on the
                        right, a vertical strip along the edge when it docks at the bottom). The
                        five tab names/order are unchanged from the icon-only version this
                        replaces — that naming-collision cleanup already happened in an earlier
                        pass (see the "Switch Layer" note below); this is purely a discoverability
                        and polish upgrade, not a rename. Each button gets its own smooth
                        background/scale transition on activation rather than a single shared
                        sliding indicator — a literal sliding pill needs to measure each button's
                        position (the labels aren't equal width, especially "Switch Layer"), which
                        wasn't worth the added complexity for what's still just a tab switcher. */}
                    <div className={`flex ${layoutMode === 'right' ? 'flex-row items-stretch p-2 gap-2 border-b w-full' : 'flex-col items-stretch py-4 px-2 gap-2 w-[84px] border-r'} border-app-borderHighlight bg-app-panel shrink-0 shadow-inner transition-colors`}>
                        {[
                            // Titled "Pick Key", not "Keymap" -- in ZMK, "keymap" means the whole
                            // config file, so re-using it for just this one tab (which only picks
                            // a basic tap action) read as confusing in context.
                            { key: 'Keymap', label: 'Pick Key', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 4h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h8" /> },
                            // Titled "Switch Layer", not "Layers" — the left sidebar already has a
                            // "Layers" toggle (manage/reorder the keyboard's layers themselves).
                            // This tab does a different job: assign a layer-*switching* action
                            // (Momentary/Layer-Tap/Sticky/Toggle/Switch-To) to the selected key.
                            // Same label on two different things was the same class of confusion
                            // "Advanced Behaviors" vs. "Behavior Library" was.
                            { key: 'Layer', label: 'Switch Layer', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /> },
                            { key: 'Advanced', label: 'Advanced Behaviors', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /> },
                            { key: 'Lighting', label: 'Lighting', dividerBefore: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /> },
                            { key: 'JSON', label: 'JSON', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /> },
                        ].map((tab) => {
                            const isActive = activeVerticalTab === tab.key;
                            return (
                                <React.Fragment key={tab.key}>
                                    {tab.dividerBefore && <div className={`${layoutMode === 'right' ? 'w-px h-8 self-center' : 'w-full h-px my-1'} bg-app-borderHighlight shrink-0`}></div>}
                                    <button
                                        onClick={() => setActiveVerticalTab(tab.key)}
                                        title={tab.label}
                                        className={`group flex flex-col items-center justify-center gap-1 py-2.5 px-1.5 rounded-xl transition-all duration-200 ${layoutMode === 'right' ? 'flex-1' : 'w-full'} ${isActive ? 'btn-active border-none scale-[1.03]' : 'text-app-textMuted hover:text-app-text hover:bg-app-card hover:-translate-y-px'}`}
                                    >
                                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
                                        <span className="text-[9.5px] font-bold leading-tight text-center">{tab.label}</span>
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto bg-app-surface relative flex flex-col transition-colors">
                        {activeVerticalTab === 'Keymap' && (
                            <div className="flex flex-col gap-6 w-full max-w-7xl relative">
                                <div className="sticky top-[-32px] bg-app-surface z-10 pb-4 pt-1 flex items-center justify-between gap-4 border-b border-app-borderHighlight mb-6 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col bg-app-card border border-app-borderHighlight p-0.5 rounded-lg h-[48px] justify-between shadow-inner">
                                            <button onClick={() => setModSide('L')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${modSide === 'L' ? 'bg-app-borderHighlight text-app-text' : 'text-app-textMuted hover:text-app-text'}`}>L</button>
                                            <button onClick={() => setModSide('R')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${modSide === 'R' ? 'bg-app-borderHighlight text-app-text' : 'text-app-textMuted hover:text-app-text'}`}>R</button>
                                        </div>
                                        <div className="flex gap-2">
                                            {MOD_BASES.map(m => {
                                                const code = modSide + m.base; let active = armedMods.has(code);
                                                const slotBinding = parsedSlots[activeActionSlot];
                                                if (slotBinding && slotBinding.value === '&kp') {
                                                    let p1 = slotBinding.params?.[0]?.value;
                                                    if (MOD_WRAPPER_TO_FULL[p1] && slotBinding.params[0].params) {
                                                        const unwrapped = unwrapModChain(slotBinding.params[0]);
                                                        const currentMods = unwrapped.mods.map(full => FULL_TO_MOD_WRAPPER[full]);
                                                        if (currentMods.includes(code)) active = true;
                                                    }
                                                }
                                                return <button key={code} title={`Toggle ${modSide === 'R' ? 'Right' : 'Left'} ${effectiveOs === 'mac' ? m.nameMac : (effectiveOs === 'linux' ? m.nameLinux : m.nameWin)}`} onClick={() => toggleModifier(code)} className={`palette-btn ${active ? 'btn-active-hollow' : ''}`}>{getModSymbol(code, effectiveOs)}</button>;
                                            })}
                                        </div>
                                    </div>
                                    <div className="relative w-72">
                                        <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        <input type="text" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} placeholder="Search for an action..." className="w-full bg-app-card border border-app-borderHighlight rounded-xl pl-10 pr-10 py-2 text-sm text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors shadow-inner" />
                                        {paletteSearch.trim() && <button onClick={() => setPaletteSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text transition-colors">✕</button>}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-10">
                                    {(paletteSearch.trim() ? searchAcrossAllPalette(paletteSearch) : ALL_PALETTE_SECTIONS).map((section, sIdx) => (
                                        <div key={sIdx}>
                                            <div className="text-app-textMuted text-[11px] font-bold mb-4 flex items-center gap-2 tracking-wide uppercase">
                                                {paletteSearch.trim() ? <span className="text-[9px] uppercase tracking-widest text-[#fff] bg-app-accent px-2 py-0.5 rounded">{section.tabName}</span> : <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>}
                                                {section.category || 'General'}
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {section.items.map((item, idx) => (
                                                    <button key={idx} onClick={() => assignAction(item)} className={`palette-btn ${isItemActive(item) ? 'btn-active-hollow' : ''}`}>
                                                        {item.top ? <div className="key-dual"><span>{item.top}</span><span>{item.bottom}</span></div> : paletteLabel(item, effectiveOs)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {paletteSearch.trim() && searchAcrossAllPalette(paletteSearch).length === 0 && <div className="text-app-textMuted text-xs italic">No keys match "{paletteSearch}" anywhere.</div>}
                                </div>
                            </div>
                        )}

                        {activeVerticalTab === 'Advanced' && (
                            <div className="flex flex-col gap-6 w-full max-w-7xl relative">
                                <div className="sticky top-[-32px] bg-app-surface z-10 pb-4 pt-1 flex items-center gap-4 border-b border-app-borderHighlight mb-2 transition-colors">
                                    <div className="relative flex-1 max-w-md">
                                        <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-app-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        <input type="text" value={advancedSearch} onChange={(e) => setAdvancedSearch(e.target.value)} placeholder="Search custom behaviors..." className="w-full bg-app-card border border-app-borderHighlight rounded-xl pl-10 pr-10 py-2 text-sm text-app-text placeholder-app-textMuted outline-none focus:border-app-text transition-colors shadow-inner" />
                                        {advancedSearch.trim() && <button onClick={() => setAdvancedSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-app-textMuted hover:text-app-text transition-colors">✕</button>}
                                    </div>
                                    <select value={advancedCategory} onChange={e => setAdvancedCategory(e.target.value)} className="bg-app-card border border-app-borderHighlight text-app-text text-sm rounded-xl px-4 py-2 outline-none shadow-sm cursor-pointer">
                                        <option value="All">All Categories</option>
                                        <option value="Macro">Macros</option>
                                        <option value="Hold-Tap">Hold-Taps</option>
                                        <option value="Tap-Dance">Tap-Dances</option>
                                        <option value="Mod-Morph">Mod-Morphs</option>
                                        <option value="Sticky-Key">Sticky-Keys</option>
                                    </select>
                                </div>

                                <div>
                                    {filteredBehaviors.length > 0 ? (
                                        <div className="flex flex-wrap gap-2.5">
                                            {filteredBehaviors.map((m, i) => (
                                                <button key={i} onClick={() => assignAction(m)} className={`palette-btn !h-auto !py-2.5 !px-4 ${isItemActive(m) ? 'btn-active-hollow' : ''}`}>
                                                    <span className="text-[8px] text-app-textMuted uppercase tracking-widest mb-1 opacity-70 font-bold">{m.cat}</span>
                                                    <span className="font-mono text-xs">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-app-textMuted text-xs italic">No advanced behaviors match your search criteria.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeVerticalTab === 'Layer' && (
                            <div className="flex flex-col gap-6 w-full max-w-4xl relative">
                                {(selectedKey === null && editingComboIdx === null) && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/80 rounded-lg p-3 text-xs font-semibold flex items-center gap-2 mb-2">
                                        <span>ℹ️</span> Select a key on the canvas to assign layer actions.
                                    </div>
                                )}
                                <div className="bg-app-card border border-app-borderHighlight p-4 rounded-xl flex items-center justify-between shadow-inner">
                                    <span className="text-xs font-bold text-app-textMuted uppercase tracking-widest pl-2">Target Layer</span>
                                    <select className="bg-app-surface border border-app-borderHighlight text-app-text text-sm rounded-lg px-4 py-2.5 outline-none w-72 shadow-sm cursor-pointer" value={targetLayerIdx} onChange={e => setTargetLayerIdx(parseInt(e.target.value))}>
                                        {layerNames.map((dName, i) => <option key={i} value={i}>{dName}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div className="bg-app-panel border border-app-borderHighlight rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-[2px] hover:shadow-xl hover:border-app-text transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[#b4b4ff] font-bold text-sm tracking-wide">Momentary (&mo)</span>
                                            <button disabled={selectedKey === null && editingComboIdx === null} onClick={() => assignAction({ type: '&mo', param1: targetLayerIdx })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isItemActive({type: '&mo', param1: targetLayerIdx}) ? 'bg-[#b4b4ff] text-black border border-[#b4b4ff]' : 'bg-[#b4b4ff]/10 text-[#b4b4ff] hover:bg-[#b4b4ff]/20 border border-[#b4b4ff]/20'}`}>Assign</button>
                                        </div>
                                        <p className="text-app-textMuted text-xs leading-relaxed">Enables a layer while a key is pressed.</p>
                                        <div className="mt-auto pt-4 border-t border-app-borderHighlight"><p className="text-[#b4b4ff]/70 text-[10px] italic leading-relaxed">💡 Tip: Assign this to "When held" alongside a tapped key to automatically create a Layer-Tap (&lt).</p></div>
                                    </div>

                                    <div className="bg-app-panel border border-app-borderHighlight rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-[2px] hover:shadow-xl hover:border-app-text transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="text-purple-400 font-bold text-sm tracking-wide">Layer-Tap (&lt)</span>
                                            <button disabled={selectedKey === null && editingComboIdx === null} onClick={() => assignLayerTap(targetLayerIdx)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${(parsedSlots.hold && parsedSlots.hold.value === '&mo' && String(parsedSlots.hold.params?.[0]?.value) === String(targetLayerIdx)) ? 'bg-purple-400 text-black border border-purple-400' : 'bg-purple-900/20 text-purple-400 hover:bg-purple-900/40 border border-purple-900/30'}`}>Assign</button>
                                        </div>
                                        <p className="text-app-textMuted text-xs leading-relaxed">Enables a layer when held, outputs key press when tapped.</p>
                                    </div>

                                    <div className="bg-app-panel border border-app-borderHighlight rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-[2px] hover:shadow-xl hover:border-app-text transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="text-amber-400 font-bold text-sm tracking-wide">Sticky (&sl)</span>
                                            <button disabled={selectedKey === null && editingComboIdx === null} onClick={() => assignAction({ type: '&sl', param1: targetLayerIdx })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isItemActive({type: '&sl', param1: targetLayerIdx}) ? 'bg-amber-400 text-black border border-amber-400' : 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 border border-amber-900/30'}`}>Assign</button>
                                        </div>
                                        <p className="text-app-textMuted text-xs leading-relaxed">Enables a layer until the next key press.</p>
                                    </div>

                                    <div className="bg-app-panel border border-app-borderHighlight rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-[2px] hover:shadow-xl hover:border-app-text transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="text-emerald-400 font-bold text-sm tracking-wide">Toggle (&tog)</span>
                                            <button disabled={selectedKey === null && editingComboIdx === null} onClick={() => assignAction({ type: '&tog', param1: targetLayerIdx })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isItemActive({type: '&tog', param1: targetLayerIdx}) ? 'bg-emerald-400 text-black border border-emerald-400' : 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-900/30'}`}>Assign</button>
                                        </div>
                                        <p className="text-app-textMuted text-xs leading-relaxed">Enables a layer until manually disabled.</p>
                                    </div>

                                    <div className="bg-app-panel border border-app-borderHighlight rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-[2px] hover:shadow-xl hover:border-app-text transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="text-blue-400 font-bold text-sm tracking-wide">Switch To (&to)</span>
                                            <button disabled={selectedKey === null && editingComboIdx === null} onClick={() => assignAction({ type: '&to', param1: targetLayerIdx })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isItemActive({type: '&to', param1: targetLayerIdx}) ? 'bg-blue-400 text-black border border-blue-400' : 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-blue-900/30'}`}>Assign</button>
                                        </div>
                                        <p className="text-app-textMuted text-xs leading-relaxed">Enables a layer and disables all other layers except default.</p>
                                    </div>

                                    <div className="bg-app-panel border border-app-borderHighlight rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:-translate-y-[2px] hover:shadow-xl hover:border-app-text transition-all group">
                                        <div className="flex justify-between items-start">
                                            <span className="text-pink-400 font-bold text-sm tracking-wide">MoErgo Layer (&layer)</span>
                                            <button disabled={selectedKey === null && editingComboIdx === null} onClick={() => assignAction({ type: '&layer', param1: targetLayerIdx })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isItemActive({type: '&layer', param1: targetLayerIdx}) ? 'bg-pink-400 text-black border border-pink-400' : 'bg-pink-900/20 text-pink-400 hover:bg-pink-900/40 border border-pink-900/30'}`}>Assign</button>
                                        </div>
                                        <p className="text-app-textMuted text-xs leading-relaxed">Proprietary syntax layer momentary toggle.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeVerticalTab === 'Lighting' && (
                            <div className="flex flex-col gap-8 w-full text-app-text pl-2">
                                <div className="flex flex-col gap-3">
                                    <div className="text-[11px] text-app-textMuted font-bold tracking-wide uppercase">LED View Toggle</div>
                                    <div className="h-px w-full max-w-[600px] bg-app-borderHighlight"></div>
                                    <button onClick={() => setShowLeds(!showLeds)} className={`w-8 h-8 mt-1 flex items-center justify-center rounded transition-colors border cursor-pointer ${showLeds ? 'btn-active border-none' : 'text-app-textMuted border-transparent hover:border-app-borderHighlight'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="text-[11px] text-app-textMuted font-bold tracking-wide uppercase">LED Color Palette</div>
                                    <div className="h-px w-full max-w-[600px] bg-app-borderHighlight"></div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <button onClick={() => setKeyDecoration(null)} title="Turns LED OFF — also arms the eraser for Paint Mode below" className={`w-6 h-6 rounded-full flex items-center justify-center text-gray-500 relative shrink-0 group ${paintColor === null ? 'ring-2 ring-offset-2 ring-offset-app-surface ring-app-accent' : ''}`}>
                                            <div className="absolute inset-0 rounded-full border-2 border-gray-500 group-hover:border-white transition-colors"></div>
                                            <div className="absolute w-[2px] h-[120%] bg-gray-500 group-hover:bg-white transition-colors rotate-45"></div>
                                        </button>
                                        <div className="w-px h-6 bg-app-borderHighlight shrink-0 mx-1"></div>
                                        {KEY_COLOR_PRESETS.map(c => <button key={c} onClick={() => setKeyDecoration(c)} title={`Arm ${c} for Paint Mode below`} className={`w-5 h-5 rounded-full hover:scale-125 transition-transform ${paintColor?.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-offset-app-surface ring-app-accent' : ''}`} style={{backgroundColor: c}}></button>)}
                                        {usedLayoutColors.length > 0 && <div className="w-px h-6 bg-app-borderHighlight shrink-0 mx-1"></div>}
                                        {usedLayoutColors.map(c => <button key={c} onClick={() => setKeyDecoration(c)} title={`Arm ${c} for Paint Mode below`} className={`w-5 h-5 rounded-full hover:scale-125 transition-transform ${paintColor?.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-offset-app-surface ring-app-accent' : ''}`} style={{backgroundColor: c}}></button>)}

                                        <div className="flex items-center gap-2 ml-2 bg-app-card rounded-full border border-app-borderHighlight px-2 py-1 shadow-inner">
                                            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-app-borderHighlight relative hover:scale-110 transition-transform">
                                                <input type="color" className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" value={currentLayerBindings[selectedKey]?.decoration?.background || '#ffffff'} onChange={(e) => setKeyDecoration(e.target.value)} />
                                            </div>
                                            <input type="text" className="w-16 bg-transparent text-[11px] font-mono text-app-textMuted outline-none uppercase" placeholder="#HEX" value={bgHexInput} onChange={(e) => setBgHexInput(e.target.value)} onBlur={applyBgHexInput} onKeyDown={e => e.key === 'Enter' && applyBgHexInput()} />
                                        </div>
                                    </div>
                                </div>

                                {/* Paint Mode — colors several keys directly on the canvas (click, or click-drag
                                    across a run of keys) instead of the old one-at-a-time select-key/click-swatch
                                    loop. Disabled until a swatch above has actually been armed at least once, since
                                    there'd otherwise be nothing to paint with. A whole drag stroke lands as ONE undo
                                    step (see commitPaintStroke), not one per key. */}
                                <div className="flex flex-col gap-3">
                                    <div className="text-[11px] text-app-textMuted font-bold tracking-wide uppercase">Paint Mode</div>
                                    <div className="h-px w-full max-w-[600px] bg-app-borderHighlight"></div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <button
                                            onClick={() => setPaintMode(v => !v)}
                                            disabled={paintColor === undefined}
                                            title={paintColor === undefined ? 'Pick a color above first' : (paintMode ? 'Turn off Paint Mode' : 'Turn on Paint Mode')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${paintMode ? 'btn-active border-none' : 'bg-app-card border border-app-borderHighlight text-app-textMuted hover:text-app-text'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"></path></svg>
                                            {paintMode ? 'Paint Mode: On' : 'Paint Mode: Off'}
                                        </button>
                                        {paintColor === undefined ? (
                                            <span className="text-[11px] text-app-textMuted italic">Pick a color above, then turn this on.</span>
                                        ) : paintMode ? (
                                            <span className="text-[11px] text-app-textMuted italic">Click, or click-drag across several keys, on the canvas to color them. Switch tabs to stop.</span>
                                        ) : (
                                            <span className="text-[11px] text-app-textMuted italic">Colors every key you click or drag over on the canvas — no need to select each one first.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeVerticalTab === 'JSON' && (
                            <div className="flex flex-col w-full h-full pb-4">
                                <div className="flex justify-between items-center mb-3 shrink-0">
                                    <span className="text-[11px] text-app-textMuted font-bold uppercase tracking-widest">Raw JSON AST</span>
                                    {jsonUnlocked && (
                                        <button onClick={saveCustomJson} className="btn-active-hollow text-xs font-bold px-5 py-2 rounded-lg transition-transform hover:-translate-y-px shadow-sm">Apply JSON</button>
                                    )}
                                </div>
                                <div className="relative flex-1">
                                    <button
                                        onClick={() => setJsonUnlocked((v) => !v)}
                                        title={jsonUnlocked ? 'Lock editing (read-only)' : 'Unlock to edit the raw JSON'}
                                        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-app-panel/90 border border-app-borderHighlight text-app-textMuted hover:text-app-text hover:bg-app-card transition-colors shadow-sm"
                                    >
                                        {jsonUnlocked
                                            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" /></svg>
                                        }
                                    </button>
                                    <textarea
                                        className={`w-full h-full bg-app-card text-app-accent font-mono text-xs p-5 pr-12 rounded-xl border outline-none resize-none shadow-inner transition-colors ${jsonError ? 'border-red-500' : 'border-app-borderHighlight focus:border-app-text'} ${!jsonUnlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        value={jsonStr}
                                        onChange={(e) => jsonUnlocked && setJsonStr(e.target.value)}
                                        readOnly={!jsonUnlocked}
                                        spellCheck="false"
                                    />
                                </div>
                                {jsonError && <div className="text-red-400 text-xs mt-3 font-semibold shrink-0">{jsonError}</div>}
                                {!jsonUnlocked && <div className="text-app-textMuted text-[11px] mt-3 font-semibold shrink-0">Read-only — click the lock to edit.</div>}
                            </div>
                        )}
                    </div>
                </aside>
            )
        );
    };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { InspectorPanel });
})();
