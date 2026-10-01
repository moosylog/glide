// GLIDE UI — the persistent top bar
//
// File identity (name + unsaved dot), New/Import/Export, Undo/Redo, and the Settings/Flows
// Automations buttons — the always-visible header above the canvas/sidebar/inspector. Purely
// presentational: every value and handler it needs comes in as a prop, and it owns no state of
// its own (New's own open/closed dropdown state, `showNewMenu`, stays in App since App also
// needs it to render the backdrop-catching overlay — see the `showNewMenu` prop below). Second
// step of Stage 3's planned least-coupled-first JSX split (see ARCHITECTURE.md §7 and
// README.md's "Status" section) — extracted verbatim from glide.html's `App`, behavior
// unchanged, only the file it lives in.
(function () {
    const TopBar = ({
        config,
        layoutName,
        isDirty,
        showNewMenu,
        setShowNewMenu,
        isFetchingTemplate,
        fetchTemplate,
        handleFileUpload,
        handleExport,
        undo,
        undoStack,
        redo,
        redoStack,
        setShowSettings,
        setShowCapabilities,
        setShowCommandPalette,
        ensureJqEngineLoaded,
    }) => {
        return (
            <header className="h-14 shrink-0 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 border-b border-app-borderHighlight bg-app-sidebar z-40 relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                    <span className="font-bold text-lg tracking-widest text-app-text shrink-0 select-none">GLIDE</span>
                    {config && (
                        <>
                            <div className="w-px h-5 bg-app-borderHighlight shrink-0"></div>
                            {/* max-w shrinks hard on narrow phones — this name is the first thing
                                to give up space, since the button cluster on the right can no
                                longer be allowed to (see its min-w-0/overflow-x-auto below: this
                                header used to compute that cluster's position with
                                justify-between using its full, un-shrunk content width, which on
                                a phone-width screen could be WIDER than the header itself — with
                                justify-between that pushes the cluster's start position to a
                                negative offset, rendering it on top of/left of the GLIDE
                                wordmark instead of past the right edge). */}
                            <span className="text-xs font-semibold text-app-textMuted truncate max-w-[70px] sm:max-w-[240px]" title={layoutName || ''}>{layoutName || 'Untitled layout'}</span>
                            {isDirty && <span className="w-2 h-2 rounded-full bg-app-accent shrink-0" title="Unsaved changes"></span>}
                        </>
                    )}
                </div>
                {config && (
                    // min-w-0 lets this cluster actually be squeezed below its buttons' natural
                    // width (a flex item's default min-width is its content size, which is what
                    // let it overflow past the header's bounds in the first place); overflow-x-
                    // auto gives the overflow somewhere safe to go — a horizontal scroll inside
                    // this cluster — instead of spilling outside the header. Labels also drop to
                    // icon-only below `sm` so scrolling is rarely needed on an ordinary phone
                    // width; it's a fallback for very narrow screens, not the primary fix.
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-x-auto">
                        <div className="relative shrink-0">
                            {showNewMenu && <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)}></div>}
                            <button onClick={() => setShowNewMenu((v) => !v)} disabled={isFetchingTemplate} className="flex items-center gap-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-app-text hover:bg-white/10 transition-all disabled:opacity-40" title="Start a new blank layout">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                <span className="hidden sm:inline">New</span>
                                <svg className="w-3 h-3 opacity-60 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            {showNewMenu && (
                                <div className="absolute left-0 top-full mt-2 w-56 bg-app-surface border border-app-borderHighlight rounded-xl shadow-2xl z-50 p-1.5" onClick={(e) => e.stopPropagation()}>
                                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-app-textMuted font-bold">Start blank</div>
                                    <button onClick={() => { fetchTemplate('glove80'); setShowNewMenu(false); }} disabled={isFetchingTemplate} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors disabled:opacity-40">Blank Glove80 layout</button>
                                    <button onClick={() => { fetchTemplate('go60'); setShowNewMenu(false); }} disabled={isFetchingTemplate} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors disabled:opacity-40">Blank Go60 layout</button>
                                </div>
                            )}
                        </div>
                        <label className="flex items-center gap-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-app-text hover:bg-white/10 transition-all cursor-pointer shrink-0" title="Import a layout file">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16"></path></svg>
                            <span className="hidden sm:inline">Import</span>
                            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button onClick={handleExport} className="flex items-center gap-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold btn-active shadow-sm hover:-translate-y-px transition-all border-none shrink-0" title="Export this layout">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"></path></svg>
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <div className="w-px h-6 bg-app-borderHighlight mx-0.5 sm:mx-1.5 shrink-0"></div>
                        <button onClick={() => setShowCommandPalette(true)} className="flex items-center gap-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-app-textMuted hover:text-app-text hover:bg-white/10 transition-all border border-app-borderHighlight hover:border-app-textMuted shrink-0" title="What do you want to do? Search Flows, your behaviors, and editor tips">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <span className="hidden sm:inline">What do you want to do?</span>
                        </button>
                        <div className="w-px h-6 bg-app-borderHighlight mx-0.5 sm:mx-1.5 shrink-0"></div>
                        <button onClick={undo} disabled={undoStack.length === 0} className={`p-2 rounded-xl flex items-center justify-center w-9 h-9 shrink-0 transition-all ${undoStack.length !== 0 ? 'text-app-text hover:bg-white/10 hover:-translate-y-px' : 'text-app-textMuted opacity-50 cursor-not-allowed'}`} title="Undo"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v1m-15-6l4-4m-4 4l4 4"></path></svg></button>
                        <button onClick={redo} disabled={redoStack.length === 0} className={`p-2 rounded-xl flex items-center justify-center w-9 h-9 shrink-0 transition-all ${redoStack.length !== 0 ? 'text-app-text hover:bg-white/10 hover:-translate-y-px' : 'text-app-textMuted opacity-50 cursor-not-allowed'}`} title="Redo"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a5 5 0 00-5 5v1m15-6l-4-4m4 4l-4 4"></path></svg></button>
                        <div className="w-px h-6 bg-app-borderHighlight mx-0.5 sm:mx-1.5 shrink-0"></div>
                        <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl flex items-center justify-center w-9 h-9 shrink-0 transition-all text-app-text hover:bg-white/10 hover:-translate-y-px" title="Settings"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
                        <button onClick={() => { setShowCapabilities(true); ensureJqEngineLoaded(); }} className="p-2 rounded-xl flex items-center justify-center w-9 h-9 shrink-0 transition-all text-app-text hover:bg-white/10 hover:-translate-y-px" title="Flows Automations"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></button>
                    </div>
                )}
            </header>
        );
    };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { TopBar });
})();
