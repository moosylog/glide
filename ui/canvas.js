// GLIDE UI — the keyboard canvas
//
// MiniKeyboardMap (the small readonly/toggle-mode keyboard thumbnail used by the combo key
// picker and DynamicBehaviorForm), KeyComponent (one rendered key), and KeyboardContainer (the
// whole zoomable/pannable canvas: click/drag/right-click, Paint Mode, Zen Mode, the floating
// toolbars). Depends on ui/shared.js for getContrastColor/getBeautifulLabel, so that script tag
// must come first. Extracted from glide.html's single inline script (Stage 1 modularization,
// see ARCHITECTURE.md) — behavior is unchanged, only the file it lives in.
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
    const { getContrastColor, getBeautifulLabel } = window.GlideUI;

        const MiniKeyboardMap = memo(({ geo, selectedKeys = [], onKeyToggle, readonly = false, size = 140 }) => {
            const bounds = useMemo(() => computeGeoBounds(geo), [geo]);
            const containerRef = useRef(null);
            const [scale, setScale] = useState(0.2);

            useEffect(() => {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const scaleX = (rect.width - 20) / bounds.w;
                    const scaleY = (rect.height - 20) / bounds.h;
                    setScale(Math.min(scaleX, scaleY, 0.35));
                }
            }, [bounds, size]);

            return (
                <div ref={containerRef} style={{ height: `${size}px` }} className="relative overflow-hidden flex items-center justify-center rounded-xl w-full bg-app-panel/30 border border-app-borderHighlight shadow-inner">
                    <div className="relative" style={{ width: bounds.w * scale, height: bounds.h * scale }}>
                        {geo.map((k, i) => {
                            const isSel = selectedKeys.includes(i);
                            return (
                                <div key={i} onClick={(e) => { e.stopPropagation(); if (!readonly && onKeyToggle) onKeyToggle(i); }}
                                     style={{
                                         position: 'absolute',
                                         left: (k.x - bounds.minX) * scale,
                                         top: (k.y - bounds.minY) * scale,
                                         width: (k.w || KEY_SIZE) * scale,
                                         height: (k.h || KEY_SIZE) * scale,
                                         transform: k.r ? `rotate(${k.r}deg)` : 'none',
                                         transformOrigin: k.o ? k.o.split(' ').map(val => parseFloat(val) * scale + 'px').join(' ') : 'center',
                                         backgroundColor: isSel ? 'var(--accent-primary)' : 'var(--bg-surface)',
                                         border: `${Math.max(1, 1.5 * scale)}px solid ${isSel ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                                         borderRadius: k.isRound ? '50%' : `${6 * scale}px`,
                                         cursor: readonly ? 'default' : 'pointer',
                                         opacity: isSel ? 1 : 0.4,
                                         boxShadow: isSel ? '0 5px 15px rgba(229, 95, 46, 0.4)' : 'none'
                                     }}
                                />
                            )
                        })}
                    </div>
                </div>
            );
        });

        const KeyComponent = memo(({ index, geo, binding, isSelected, isComboSelected, isUsageHighlighted, isZenMode, onSelect, osMode, onContextMenu, onKeyMouseDown, isDragSource, isDragOver, showLeds, isTouchpad, onOpenTouchpad, config, layerNames }) => {
            // In combo-editing (Zen) mode the canvas is for picking key POSITIONS, not reviewing
            // a layer's contents — so no key values, custom LED colors, or decorations are shown,
            // just the plain keyboard shape (still normally styled/visible, never dimmed/blacked
            // out). The orange combo-selected highlight below is independent of this and still applies.
            const hasCustomBg = !isZenMode && showLeds && !isTouchpad && binding?.value !== '&trans' && binding?.value !== '&none' && binding?.decoration?.background;

            const labelHtml = isZenMode ? '' : getBeautifulLabel(binding, osMode, hasCustomBg, config, layerNames);

            const outerStyle = { left: `${geo.x}px`, top: `${geo.y}px`, width: `${geo.w || KEY_SIZE}px`, height: `${geo.h || KEY_SIZE}px`, transform: geo.r ? `rotate(${geo.r}deg)` : 'none', transformOrigin: geo.o || 'center' };
            const innerStyle = {};
            if (hasCustomBg) { innerStyle.background = binding.decoration.background; innerStyle.borderColor = binding.decoration.background; innerStyle.color = getContrastColor(binding.decoration.background); }

            return (
                <div className={`p-key-outer ${isSelected ? 'selected' : ''} ${isComboSelected ? 'combo-highlight' : ''} ${isUsageHighlighted ? 'usage-highlight' : ''} ${isDragOver ? 'drag-over' : ''} ${isTouchpad ? 'is-touchpad cursor-pointer' : ''}`} style={outerStyle} data-key-idx={index} title={isTouchpad ? `${TOUCHPAD_LABEL_BY_INDEX[index]} — click to configure` : undefined} onClick={(e) => { e.stopPropagation(); if (isTouchpad) onOpenTouchpad(index); else onSelect(index); }} onContextMenu={(e) => { if (isTouchpad) { e.preventDefault(); } else onContextMenu(e, index); }} onPointerDown={(e) => { if (!isTouchpad) onKeyMouseDown(e, index); }}>
                    <div className={`p-key ${hasCustomBg ? 'has-bg' : ''} ${isDragSource ? 'drag-source' : ''} ${isDragOver ? 'drag-over' : ''} ${geo.isRound ? 'is-round' : ''} ${isComboSelected ? 'combo-selected' : ''}`} style={innerStyle}>
                        {isTouchpad ? (
                            <div className="w-full h-full flex items-center justify-center text-app-textMuted/70 hover:text-app-accent transition-colors">
                                <svg className="w-1/3 h-1/3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="14" rx="2" strokeWidth="1.6"></rect><path d="M3 13h18" strokeWidth="1.6" strokeLinecap="round"></path></svg>
                            </div>
                        ) : (labelHtml ? <div dangerouslySetInnerHTML={{ __html: labelHtml }} className="w-full h-full flex items-center justify-center relative overflow-hidden" /> : null)}
                    </div>
                </div>
            );
        });

const KeyboardContainer = ({ keyboardGeo, activeLayerBindings, selectedKey, onSelectKey, scale, setScale, osMode, onContextAction, clipboard, styleClipboard, onSwapKeys, showLeds, isGo60, config, isZenMode, selectedComboKeys, usageHighlightKeys, layerNames, stopZenMode, onOpenTouchpad, paintMode, onPaintKey, onPaintStrokeEnd }) => {
            const containerRef = useRef(null);
            const [autoFitScale, setAutoFitScale] = useState(1);
            const [pan, setPan] = useState({ x: 0, y: 0 });
            const [isDragging, setIsDragging] = useState(false);
            const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
            const [contextMenu, setContextMenu] = useState(null);
            const [dragSourceIdx, setDragSourceIdx] = useState(null);
            const [dragOverIdx, setDragOverIdx] = useState(null);

            const bounds = useMemo(() => {
                let maxX = 0, maxY = 0;
                keyboardGeo.forEach(k => { maxX = Math.max(maxX, k.x + (k.w || KEY_SIZE)); const extraHeight = k.r ? 60 : 0; maxY = Math.max(maxY, k.y + (k.h || KEY_SIZE) + extraHeight); });
                return { w: maxX + 40, h: maxY + 40 };
            }, [keyboardGeo]);

            useEffect(() => {
                const el = containerRef.current; if (!el) return;
                const compute = () => {
                    const { width, height } = el.getBoundingClientRect(); if (width === 0 || height === 0) return;
                    const fit = Math.min(width / bounds.w, height / bounds.h) * 0.95;
                    setAutoFitScale(Math.max(0.2, Math.min(fit, 2))); setPan({ x: 0, y: 0 });
                };
                const timer = setTimeout(compute, 20); const ro = new ResizeObserver(compute); ro.observe(el);
                return () => { clearTimeout(timer); ro.disconnect(); };
            }, [keyboardGeo, bounds]);

            const effectiveScale = autoFitScale * scale;

            // Pointer Events (not mouse-only) throughout this component: one code path handles
            // mouse, touch and pen alike, which is what actually makes panning/drag-to-swap work
            // on a phone or tablet — plain mousedown/mousemove/mouseup never fire for touch input.
            const handlePointerDown = (e) => {
                // Excludes actual key tiles (so drag-to-swap/long-press on a key still works,
                // handled by handleKeyMouseDown instead) AND any button floating over the canvas
                // (zoom controls, the clipboard/paste dock, "Done Editing" in Focus Mode, …).
                // Without the button exclusion, setPointerCapture below grabs the pointer for the
                // whole canvas the instant ANY of those buttons is pressed, and the browser then
                // retargets the follow-up pointerup/click to the captor instead of the button —
                // so the click event never reaches the button's own onClick at all. Confirmed via
                // a real Chromium session (jsdom doesn't reproduce pointer capture retargeting):
                // a real mouse click on the zoom +/- buttons logged pointerdown/pointerup/click
                // all targeting <html>, not the button, and the displayed percentage never moved.
                if (e.target.closest('.p-key') || e.target.closest('button')) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            };
            const handlePointerMove = (e) => { if(!isDragging) return; setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
            const handlePointerUp = (e) => { setIsDragging(false); try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch (_) {} };

            // Long-press (touch/pen only — a mouse already has a real right-click) opens the same
            // context menu right-click does. Threshold-based drag-to-swap and long-press share one
            // pointerdown listener so they can cleanly cancel each other: moving past the drag
            // threshold cancels a pending long-press, and a fired long-press cancels the drag.
            const LONG_PRESS_MS = 500;
            const handleKeyMouseDown = (e, index) => {
                if (isZenMode || (e.pointerType === 'mouse' && e.button !== 0) || (isGo60 && (index === 60 || index === 61))) return;

                if (paintMode) {
                    // Paint Mode replaces drag-to-swap with drag-to-paint for the duration of this
                    // gesture: the starting key is painted immediately, then every key the pointer
                    // moves over while the button stays down gets painted too — one continuous
                    // brush stroke, not a series of separate clicks. onPaintStrokeEnd (fired on
                    // pointerup/cancel) is what turns the whole stroke into a single undo step.
                    const pointerId = e.pointerId;
                    let lastPainted = null;
                    const paint = (idx) => {
                        if (idx === null || idx === lastPainted || (isGo60 && (idx === 60 || idx === 61))) return;
                        onPaintKey(idx); lastPainted = idx;
                    };
                    paint(index);
                    const onMove = (e2) => {
                        if (e2.pointerId !== pointerId) return;
                        const el = document.elementFromPoint(e2.clientX, e2.clientY)?.closest('[data-key-idx]');
                        paint(el ? parseInt(el.dataset.keyIdx, 10) : null);
                    };
                    const onUp = (e2) => {
                        if (e2.pointerId !== pointerId) return;
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                        document.removeEventListener('pointercancel', onUp);
                        onPaintStrokeEnd();
                    };
                    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
                    return;
                }

                const startX = e.clientX, startY = e.clientY, pointerId = e.pointerId;
                let dragging = false, longPressFired = false;
                const isTouchLike = e.pointerType !== 'mouse';

                const cleanup = () => {
                    if (longPressTimer) clearTimeout(longPressTimer);
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    document.removeEventListener('pointercancel', onUp);
                };
                const longPressTimer = isTouchLike ? setTimeout(() => {
                    longPressFired = true;
                    cleanup();
                    setDragSourceIdx(null); setDragOverIdx(null);
                    openContextMenu({ clientX: startX, clientY: startY, preventDefault: () => {}, stopPropagation: () => {} }, index);
                }, LONG_PRESS_MS) : null;

                const onMove = (e2) => {
                    if (e2.pointerId !== pointerId || longPressFired) return;
                    const dx = e2.clientX - startX, dy = e2.clientY - startY;
                    const dist = Math.hypot(dx, dy);
                    if (longPressTimer && dist > 10) clearTimeout(longPressTimer);
                    if (!dragging && dist > 6) { dragging = true; setDragSourceIdx(index); }
                    if (dragging) {
                        const el = document.elementFromPoint(e2.clientX, e2.clientY)?.closest('[data-key-idx]');
                        const overIdx = el ? parseInt(el.dataset.keyIdx, 10) : null;
                        if (isGo60 && (overIdx === 60 || overIdx === 61)) setDragOverIdx(null); else setDragOverIdx(overIdx !== index ? overIdx : null);
                    }
                };
                const onUp = (e2) => {
                    if (e2.pointerId !== pointerId) return;
                    cleanup();
                    if (longPressFired) return; // already handled by the long-press timer above
                    if (dragging) {
                        const el = document.elementFromPoint(e2.clientX, e2.clientY)?.closest('[data-key-idx]');
                        const targetIdx = el ? parseInt(el.dataset.keyIdx, 10) : null;
                        if (targetIdx !== null && targetIdx !== index && (!isGo60 || (targetIdx !== 60 && targetIdx !== 61))) onSwapKeys(index, targetIdx);
                    }
                    setDragSourceIdx(null); setDragOverIdx(null);
                };
                document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
            };
           
            const openContextMenu = (e, index) => { e.preventDefault(); e.stopPropagation(); if (isZenMode || (isGo60 && (index === 60 || index === 61))) return; onSelectKey(index); setContextMenu({ x: e.clientX, y: e.clientY, keyIndex: index }); };
            const closeContextMenu = () => setContextMenu(null);
            const runContextAction = (action) => { if (contextMenu) onContextAction(action, contextMenu.keyIndex); closeContextMenu(); };

            const handlePasteDock = (e) => { e.stopPropagation(); if(selectedKey !== null) onContextAction('paste', selectedKey); };

            return (
                <div ref={containerRef} className={`canvas-container absolute inset-0 flex items-center justify-center pt-14 sm:pt-0 ${isZenMode ? 'bg-app-panel/50' : ''}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onClick={() => { if(!isZenMode) onSelectKey(null); closeContextMenu(); }}>

                    {/* This floating pill used to just overlay the top of the canvas with no
                        space reserved for it — fine on desktop, where the canvas area is tall
                        enough that the auto-fit keyboard graphic never reaches up that far, but
                        not on mobile: the bottom-docked Inspector panel's fixed height leaves a
                        much shorter canvas area there, so the keyboard (centered in whatever
                        height remains) could render right underneath this pill instead of below
                        it. The canvas-container's pt-14 above reserves that room on narrow
                        screens instead of relying on there happening to be enough margin.
                        max-w-[94vw] + flex-wrap below keep the pill itself from overflowing a
                        narrow viewport sideways, independent of that vertical fix. */}
                    <div className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 max-w-[94vw] flex items-center flex-wrap justify-center gap-2 sm:gap-3 z-30 pointer-events-auto backdrop-blur-xl bg-app-card/80 border border-app-borderHighlight px-3 sm:px-4 py-2 rounded-2xl shadow-2xl transition-all">
                        {isZenMode ? (
                            <div className="flex items-center flex-wrap justify-center gap-2 text-xs font-semibold text-app-text">
                                <span className="w-2 h-2 rounded-full bg-app-accent animate-pulse"></span>
                                <span className="text-app-text font-bold pr-2">Focus Mode: Click keys to toggle</span>
                                <span className="text-app-textMuted bg-app-surface px-2 py-0.5 rounded border border-app-borderHighlight">{selectedComboKeys.length} keys active</span>
                                <div className="w-px h-4 bg-app-borderHighlight mx-1"></div>
                                <button onClick={stopZenMode} className="bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg hover:bg-emerald-600 transition-colors shadow-sm">Done Editing</button>
                            </div>
                        ) : clipboard ? (
                            <div className="flex items-center flex-wrap justify-center gap-2 text-xs font-semibold text-app-text">
                                <span className="text-app-textMuted font-mono">Clipboard:</span>
                                <span className="px-2 py-0.5 bg-app-surface border border-app-borderHighlight rounded font-mono text-app-accent truncate max-w-[120px]">{describeBinding(clipboard, osMode, layerNames)}</span>
                                <div className="w-px h-4 bg-app-borderHighlight mx-1"></div>
                                <button onClick={handlePasteDock} disabled={selectedKey === null} className="px-2.5 py-1 bg-app-accent text-white rounded-lg hover:bg-app-accentHover disabled:opacity-30 transition-colors font-bold text-[11px] shadow-sm" title="Select a key to paste">Paste</button>
                                <button onClick={(e) => { e.stopPropagation(); onContextAction('clearClipboard', null); }} className="p-1 text-app-textMuted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Clear Clipboard">🗑️</button>
                            </div>
                        ) : (
                            <span className="text-[11px] text-app-textMuted font-medium tracking-wide text-center">
                                {/* "Right-click" is desktop-only wording — touch has no right-click,
                                    it long-presses instead (see handleKeyMouseDown's longPressFired
                                    above) — and the full three-part hint is wider than most phones.
                                    A shorter, touch-accurate line below `sm`, the original above it. */}
                                <span className="sm:hidden">Tap a key to edit · Long-press for options</span>
                                <span className="hidden sm:inline">Click a key to edit • Right-click for options • Drag to swap</span>
                            </span>
                        )}
                    </div>

                    <div className="absolute bottom-6 right-6 flex items-center gap-2 backdrop-blur-xl bg-app-card/70 border border-app-borderHighlight p-1.5 rounded-full shadow-2xl z-20">
                        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.1, 0.4)); }} className="text-app-textMuted hover:text-app-text p-2.5 hover:-translate-y-px transition-transform"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); setScale(1); setPan({x:0,y:0}); }} className="text-[11px] font-mono font-bold w-12 text-center text-app-text hover:text-app-text transition-colors" title="Reset to auto-fit">{Math.round(effectiveScale * 100)}%</button>
                        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.1, 2)); }} className="text-app-textMuted hover:text-app-text p-2.5 hover:-translate-y-px transition-transform"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg></button>
                    </div>
                   
                    <div className="relative origin-center" style={{ width: `${bounds.w}px`, height: `${bounds.h}px`, transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})` }}>
                        {keyboardGeo.map((geo, index) => {
                            const isTouchpad = isGo60 && (index === 60 || index === 61);
                            const isSelected = !isZenMode && selectedKey === index;
                            const isComboSel = isZenMode && selectedComboKeys.includes(index);
                            const isUsageHighlighted = !isZenMode && (usageHighlightKeys || []).includes(index);

                            return <KeyComponent key={`matrix-key-${index}`} index={index} geo={geo} binding={activeLayerBindings[index] || { value: '&none' }} isSelected={isSelected} isComboSelected={isComboSel} isUsageHighlighted={isUsageHighlighted} isZenMode={isZenMode} onSelect={onSelectKey} osMode={osMode} onContextMenu={openContextMenu} onKeyMouseDown={handleKeyMouseDown} isDragSource={dragSourceIdx === index} isDragOver={dragOverIdx === index} showLeds={showLeds} isTouchpad={isTouchpad} onOpenTouchpad={onOpenTouchpad} config={config} layerNames={layerNames} />;
                        })}
                    </div>
                   
                    {contextMenu && (
                        <div className="fixed z-50 bg-app-panel border border-app-borderHighlight rounded-xl shadow-2xl py-1.5 min-w-[180px] text-xs font-bold" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
                            <button className="w-full text-left px-5 py-2.5 hover:bg-white/10 transition-colors flex items-center gap-2" onClick={() => runContextAction('copy')}><span>📋</span> Copy Action</button>
                            <button className={`w-full text-left px-5 py-2.5 transition-colors flex items-center gap-2 ${clipboard ? 'hover:bg-white/10' : 'text-app-textMuted cursor-not-allowed'}`} onClick={() => clipboard && runContextAction('paste')}><span>📥</span> Paste Action</button>
                            <div className="my-1 border-t border-app-borderHighlight"></div>
                            <button className="w-full text-left px-5 py-2.5 hover:bg-white/10 transition-colors flex items-center gap-2" onClick={() => runContextAction('copyStyle')}><span>🎨</span> Copy LED Color</button>
                            <button className={`w-full text-left px-5 py-2.5 transition-colors flex items-center gap-2 ${styleClipboard?.background ? 'hover:bg-white/10' : 'text-app-textMuted cursor-not-allowed'}`} onClick={() => styleClipboard?.background && runContextAction('pasteStyle')}><span>🖌️</span> Paste LED Color</button>
                            <div className="my-1 border-t border-app-borderHighlight"></div>
                            <button className="w-full text-left px-5 py-2.5 hover:bg-white/10 transition-colors flex items-center gap-2" onClick={() => runContextAction('clear')}><span>🗑️</span> Clear Key</button>
                        </div>
                    )}
                </div>
            );
        };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { MiniKeyboardMap, KeyComponent, KeyboardContainer });
})();
