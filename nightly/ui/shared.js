// GLIDE UI — shared, non-JSX helpers
//
// Pure-JS pieces used by more than one UI component: the keycap palette data (the grid the
// key inspector, Macro Builder, and Mod-Morph/Tap-Dance binding pickers all search and pull
// from) and the plain-string key-label renderer used by the canvas's KeyComponent. Nothing
// here is a React component, so this loads as a plain <script>, same as core/*.js, with no
// Babel step needed. Extracted from glide.html's single inline script (Stage 1 modularization,
// see ARCHITECTURE.md) — behavior is unchanged, only the file it lives in.
(function () {
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

        const PALETTE_DATA = {
            Basic: [
                { category: "Letters", items: [ { label: 'A', code: 'A' }, { label: 'B', code: 'B' }, { label: 'C', code: 'C' }, { label: 'D', code: 'D' }, { label: 'E', code: 'E' }, { label: 'F', code: 'F' }, { label: 'G', code: 'G' }, { label: 'H', code: 'H' }, { label: 'I', code: 'I' }, { label: 'J', code: 'J' }, { label: 'K', code: 'K' }, { label: 'L', code: 'L' }, { label: 'M', code: 'M' }, { label: 'N', code: 'N' }, { label: 'O', code: 'O' }, { label: 'P', code: 'P' }, { label: 'Q', code: 'Q' }, { label: 'R', code: 'R' }, { label: 'S', code: 'S' }, { label: 'T', code: 'T' }, { label: 'U', code: 'U' }, { label: 'V', code: 'V' }, { label: 'W', code: 'W' }, { label: 'X', code: 'X' }, { label: 'Y', code: 'Y' }, { label: 'Z', code: 'Z' } ] },
                { category: "Numbers", items: [ { top: '!', bottom: '1', code: 'N1' }, { top: '@', bottom: '2', code: 'N2' }, { top: '#', bottom: '3', code: 'N3' }, { top: '$', bottom: '4', code: 'N4' }, { top: '%', bottom: '5', code: 'N5' }, { top: '^', bottom: '6', code: 'N6' }, { top: '&', bottom: '7', code: 'N7' }, { top: '*', bottom: '8', code: 'N8' }, { top: '(', bottom: '9', code: 'N9' }, { top: ')', bottom: '0', code: 'N0' } ] },
                { category: "Symbols", items: [ { top: '_', bottom: '-', code: 'MINUS' }, { top: '+', bottom: '=', code: 'EQUAL' }, { top: '~', bottom: '`', code: 'GRAVE' }, { top: '{', bottom: '[', code: 'LBKT' }, { top: '}', bottom: ']', code: 'RBKT' }, { top: '|', bottom: '\\', code: 'BSLH' }, { top: ':', bottom: ';', code: 'SEMI' }, { top: '"', bottom: "'", code: 'SQT' }, { top: '<', bottom: ',', code: 'COMMA' }, { top: '>', bottom: '.', code: 'DOT' }, { top: '?', bottom: '/', code: 'FSLH' }, { label: '=', code: 'KP_EQUAL' }, { label: ',', code: 'KP_COMMA' }, { label: '÷', code: 'KP_DIVIDE' }, { label: '×', code: 'KP_MULTIPLY' }, { label: '-', code: 'KP_MINUS' }, { label: '+', code: 'KP_PLUS' }, { label: '.', code: 'KP_DOT' }, { label: '&', code: 'AMPS' } ] },
                { category: "Modifiers", items: [ { code: 'LSHFT' }, { code: 'RSHFT' }, { code: 'LCTRL' }, { code: 'RCTRL' }, { code: 'LALT' }, { code: 'RALT' }, { code: 'LGUI' }, { code: 'RGUI' } ] },
                { category: "Control", items: [ { label: '▽', type: '&trans' }, { label: '∅ None', type: '&none' }, { label: 'F1', code: 'F1' }, { label: 'F2', code: 'F2' }, { label: 'F3', code: 'F3' }, { label: 'F4', code: 'F4' }, { label: 'F5', code: 'F5' }, { label: 'F6', code: 'F6' }, { label: 'F7', code: 'F7' }, { label: 'F8', code: 'F8' }, { label: 'F9', code: 'F9' }, { label: 'F10', code: 'F10' }, { label: 'F11', code: 'F11' }, { label: 'F12', code: 'F12' }, { label: 'Caps Lock', code: 'CAPS' }, { label: 'Tab', code: 'TAB' }, { label: 'Backspace', code: 'BSPC' }, { label: 'Enter', code: 'RET' }, { label: 'Space', code: 'SPACE' }, { label: 'Ins', code: 'INS' }, { label: 'Del', code: 'DEL' }, { label: 'Home', code: 'HOME' }, { label: 'End', code: 'END' }, { label: 'PgUp', code: 'PG_UP' }, { label: 'PgDn', code: 'PG_DN' }, { label: 'Esc', code: 'ESC' }, { label: 'Print', code: 'PRINTSCREEN' }, { label: 'Scroll', code: 'SLCK' }, { label: 'Pause', code: 'PAUSE_BREAK' }, { label: 'RApp', code: 'K_APP' }, { label: 'N.ent', code: 'KP_ENTER' }, { label: 'N.Lck', code: 'KP_NUM' } ] }
            ],
            Media: [ { category: "Media & Editing", items: [{ label: 'Vol -', code: 'C_VOL_DN' }, { label: 'Vol +', code: 'C_VOL_UP' }, { label: 'Mute', code: 'C_MUTE' }, { label: 'Play', code: 'C_PP' }, { label: 'Mstp', code: 'C_STOP' }, { label: 'Prvs', code: 'C_PREV' }, { label: 'Next', code: 'C_NEXT' }, { label: 'Rewind', code: 'C_RW' }, { label: 'Mffd', code: 'C_FF' }, { label: 'Select', code: 'C_AL_SEL_TASK' }, { label: 'Eject', code: 'C_EJECT' }] } ],
            SpecialKeys: [
                { category: "General Special", items: [ { label: 'Nuhs', code: 'NON_US_HASH' }, { label: 'Nubs', code: 'NON_US_BSLH' }, { label: 'Ro', code: 'INT3' }, { label: '¥', code: 'INT1' }, { label: '無変換', code: 'INT5' }, { label: '漢字', code: 'INT4' }, { label: '한영', code: 'LANG1' }, { label: '変換', code: 'INT4' }, { label: 'かな', code: 'INT2' }, { label: 'Esc `', code: 'GRAVE' }, { label: '(', type: '&kp', param1: 'LPAR' }, { label: ')', type: '&kp', param1: 'RPAR' }, { label: 'SftEnt', type: '&kp', param1: 'RET' }, { label: 'Reset', type: '&sys_reset' }, { label: 'Boot', type: '&bootloader' }, { label: 'F13', code: 'F13' }, { label: 'F14', code: 'F14' }, { label: 'F15', code: 'F15' }, { label: 'F16', code: 'F16' }, { label: 'F17', code: 'F17' }, { label: 'F18', code: 'F18' }, { label: 'F19', code: 'F19' }, { label: 'Mouse ↑', type: '&mmv', param1: 'MOVE_UP' }, { label: 'Mouse ↓', type: '&mmv', param1: 'MOVE_DOWN' }, { label: 'Mouse ←', type: '&mmv', param1: 'MOVE_LEFT' }, { label: 'Mouse →', type: '&mmv', param1: 'MOVE_RIGHT' }, { label: 'Mouse Btn1', type: '&mkp', param1: 'MB1' }, { label: 'Mouse Btn2', type: '&mkp', param1: 'MB2' }, { label: 'Mouse Btn3', type: '&mkp', param1: 'MB3' }, { label: 'Magic', type: '&magic' } ] }
            ],
            Custom: [
                { category: "System & Connectivity", items: [ { label: 'BTH1', type: '&bt', param1: 'BT_SEL', param2: 0 }, { label: 'BTH2', type: '&bt', param1: 'BT_SEL', param2: 1 }, { label: 'BTH3', type: '&bt', param1: 'BT_SEL', param2: 2 }, { label: '2.4G', type: '&out', param1: 'OUT_USB' }, { label: 'Batt', type: '&ext_power', param1: 'EP_TOG' }, { label: 'BT Clr', type: '&bt', param1: 'BT_CLR' }, { label: 'PROF1', type: '&none' }, { label: 'PROF2', type: '&none' }, { label: 'PROF3', type: '&none' }, { label: 'Any', type: 'Custom', param1: '' } ] }
            ]
        };

        const FLAT_GRID_TABS = ['Basic', 'Media', 'SpecialKeys', 'Custom'];
        function searchAcrossAllPalette(query) {
            if (!query.trim()) return []; const results = []; const q = query.trim().toLowerCase();
            FLAT_GRID_TABS.forEach(tabName => { const sections = PALETTE_DATA[tabName] || []; sections.forEach(section => { const matched = section.items.filter(item => [item.label, item.top, item.bottom, item.code].filter(Boolean).join(' ').toLowerCase().includes(q)); if (matched.length > 0) results.push({ tabName, category: section.category, items: matched }); }); }); return results;
        }
        const ALL_PALETTE_SECTIONS = [...PALETTE_DATA.Basic, ...PALETTE_DATA.Media, ...PALETTE_DATA.SpecialKeys, ...PALETTE_DATA.Custom];

        // Used by both App's own `usedLayoutColors` memo and ui/inspector.js's Lighting tab —
        // moved here (Stage 3, final step) rather than duplicated, since it's needed in two files.
        const KEY_COLOR_PRESETS = ['#e5484d', '#f76b15', '#f5d90a', '#46a758', '#12a594', '#0091ff', '#8e4ec6', '#e93d82'];

        // -- Macro Builder --
        // Reuses the same palette data/search the key-inspector uses for ordinary key
        // assignment (PALETTE_DATA/searchAcrossAllPalette/ALL_PALETTE_SECTIONS) so a macro's
        // behavior steps are picked from the exact same familiar grid, rather than a second,
        // divergent list of keycodes.
        function bindingFromPaletteItem(item) {
            if (item.code) return { value: '&kp', params: [composeKeycodeParam(item.code, [])] };
            if (item.type) {
                const binding = { value: item.type };
                if (item.param1 !== undefined) {
                    binding.params = [{ value: item.param1, params: [] }];
                    if (item.param2 !== undefined) binding.params.push({ value: item.param2, params: [] });
                }
                return binding;
            }
            return { value: '&none' };
        }

        // -- Flows Automations' description text --
        // Real gap found auditing the Flows Automations modal: `description` fields in
        // core/capabilities/builtinCatalog.js carry real markdown (bold, inline code, links,
        // bullet lists, blank-line paragraphs) — CapabilitiesModal used to wrap that in a plain
        // whitespace-pre-wrap <p>, so a user just saw literal asterisks/backticks/brackets
        // instead of formatted text. Deliberately narrow, not a general markdown engine: only
        // the handful of constructs the catalog's own descriptions actually use, and it never
        // touches raw HTML (no dangerouslySetInnerHTML) — every node is a real React element
        // built with React.createElement, so there's nothing here for a hostile string to
        // inject into the page.
        function renderFlowMarkdownInline(line, keyPrefix) {
            const tokens = [];
            let rest = line;
            let i = 0;
            const pattern = /(\*\*(.+?)\*\*|`([^`]+?)`|\[([^\]]+)\]\(([^)]+)\))/;
            while (rest.length > 0) {
                const m = pattern.exec(rest);
                if (!m) { tokens.push(rest); break; }
                if (m.index > 0) tokens.push(rest.slice(0, m.index));
                if (m[2] !== undefined) {
                    tokens.push(React.createElement('strong', { key: `${keyPrefix}-${i++}`, className: 'font-bold text-app-text' }, m[2]));
                } else if (m[3] !== undefined) {
                    tokens.push(React.createElement('code', { key: `${keyPrefix}-${i++}`, className: 'font-mono text-[10px] bg-app-card px-1 py-0.5 rounded' }, m[3]));
                } else {
                    tokens.push(React.createElement('a', { key: `${keyPrefix}-${i++}`, href: m[5], target: '_blank', rel: 'noopener noreferrer', className: 'text-app-accent underline hover:no-underline' }, m[4]));
                }
                rest = rest.slice(m.index + m[0].length);
            }
            return tokens;
        }
        function renderFlowMarkdown(text) {
            if (!text) return null;
            // Paragraphs are blank-line separated; a run of consecutive "- "/"* " lines becomes
            // one bullet list, everything else becomes one paragraph with a real <br> between
            // its own lines (a single newline inside one paragraph is a soft break here, not a
            // new block — matches how these descriptions were actually authored).
            const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/);
            return blocks.map((block, bIdx) => {
                const lines = block.split('\n').filter((l) => l.trim().length > 0);
                if (lines.length === 0) return null;
                const isList = lines.every((l) => /^[-*]\s+/.test(l.trim()));
                if (isList) {
                    return React.createElement('ul', { key: bIdx, className: `list-disc pl-4 space-y-0.5 ${bIdx > 0 ? 'mt-2' : ''}` },
                        lines.map((l, lIdx) => React.createElement('li', { key: lIdx }, renderFlowMarkdownInline(l.trim().replace(/^[-*]\s+/, ''), `${bIdx}-${lIdx}`)))
                    );
                }
                return React.createElement('p', { key: bIdx, className: bIdx > 0 ? 'mt-2' : '' },
                    lines.flatMap((l, lIdx) => {
                        const rendered = renderFlowMarkdownInline(l, `${bIdx}-${lIdx}`);
                        return lIdx < lines.length - 1 ? [...rendered, React.createElement('br', { key: `${bIdx}-${lIdx}-br` })] : rendered;
                    })
                );
            });
        }

        function describeBindingParam(p) {
            const inner = (p.params || []).map(describeBindingParam).join(' ');
            return inner ? `${p.value}(${inner})` : String(p.value);
        }
        function describeBindingStep(binding) {
            if (!binding || !binding.value) return '(empty)';
            const name = binding.value.replace(/^&/, '');
            const params = (binding.params || []).map(describeBindingParam).join(' ');
            return params ? `${name} ${params}` : name;
        }

        const getContrastColor = (hexcolor) => {
            if (!hexcolor) return '#ffffff';
            let cleanHex = hexcolor.replace("#", "");
            if (cleanHex.length === 3) cleanHex = cleanHex.split('').map(c => c+c).join('');
            const r = parseInt(cleanHex.substr(0,2),16); const g = parseInt(cleanHex.substr(2,2),16); const b = parseInt(cleanHex.substr(4,2),16);
            return (((r*299)+(g*587)+(b*114))/1000 >= 128) ? '#000000' : '#ffffff';
        };


        const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

        const mainLabelSizeClass = (text) => {
            if (!text) return '';
            const len = Array.from(String(text)).length;
            if (len === 1) return 'kc-main-solo';
            if (len <= 3) return 'kc-main-short';
            return '';
        };

        const getBeautifulLabel = (binding, osMode, hasCustomBg, config, layerNames) => {
            if (!binding) return '';
            const cc = (colorStr) => hasCustomBg ? 'text-inherit' : colorStr;

            if (binding.decoration && binding.decoration.label) {
                const lbl = binding.decoration.label;
                return `<div class="kc-grid"><span class="kc-custom ${mainLabelSizeClass(lbl)} ${cc('text-app-text')}">${escapeHtml(lbl)}</span></div>`;
            }

            let val = binding.value; if (!val || val === '&none' || val === 'none') return '';

            const renderStructured = (main, tl = '', icon = '') => {
                const mainSizeClass = mainLabelSizeClass(main);
                return `<div class="kc-grid">
                            ${tl ? `<span class="kc-tl ${cc('text-app-accent')}">${escapeHtml(tl)}</span>` : ''}
                            ${icon ? `<span class="kc-tr ${cc('text-app-textMuted')}">${icon}</span>` : ''}
                            <span class="kc-main ${mainSizeClass} ${cc('text-app-text')}">${escapeHtml(main)}</span>
                        </div>`;
            };

            if (val === '&trans') return `<div class="kc-grid"><span class="text-[18px] font-bold ${cc('text-app-textMuted')}">▽</span></div>`;
            if (val === 'Custom') return renderStructured(binding.params?.[0]?.value || 'Custom', '', '⚙️');
           
            if (isGlideHtName(val)) {
                const ht = config?.holdTaps?.find(h => h.name === val);
                if (ht && ht.bindings) return renderStructured(formatKeycode(ht.bindings[1], osMode), formatKeycode(ht.bindings[0], osMode), '⏱️');
            }
            if (isGlideMmName(val)) {
                const mm = config?.modMorphs?.find(m => m.name === val);
                if (mm && mm.cases) return renderStructured(formatKeycode(mm.cases[0].binding.value, osMode), '⇧'+formatKeycode(mm.cases[1].binding.value, osMode), '🔤');
            }
            if (isRecognizedTdName(val)) {
                const td = config?.tapDances?.find(t => t.name === val);
                if (td && td.bindings) return renderStructured(formatKeycode(td.bindings[0].value, osMode), formatKeycode(td.bindings[1].value, osMode), '🔀');
            }

            let p1 = binding.params?.[0]?.value ?? ''; let p2 = binding.params?.[1]?.value ?? '';
            let combinedParams = [formatParam(p1, layerNames), formatParam(p2, layerNames)].filter(x => x).join(' ');
           
            if (val === '&kp') {
                if (p1 && MOD_WRAPPER_TO_FULL[p1] && binding.params[0].params) {
                    const { mods, keyVal } = unwrapModChain(binding.params[0]);
                    const modSymbols = mods.map(m => formatKeycode(m, osMode)).join('+');
                    return renderStructured(formatKeycode(keyVal, osMode), modSymbols);
                }
                return renderStructured(combinedParams ? formatKeycode(combinedParams, osMode) : '');
            }
           
            if (val === '&mo' || val === '&tog' || val === '&to' || val === '&sl' || val === '&layer') {
                let icon = val === '&mo' || val === '&layer' ? '⭕' : (val === '&tog' ? '🔁' : (val === '&to' ? '➡️' : '📌'));
                const layerLabel = formatParam(p1, layerNames);
                return `<div class="kc-grid"><span class="kc-main ${mainLabelSizeClass(layerLabel)} ${cc('text-app-accent')}">${escapeHtml(layerLabel)}</span><span class="kc-tr ${cc('text-app-textMuted')}">${icon}</span></div>`;
            }
           
            if (val === '&mt') return renderStructured(formatKeycode(p2, osMode), formatKeycode(p1, osMode), '⏱️');
            if (val === '&lt') return renderStructured(formatKeycode(p2, osMode), formatParam(p1, layerNames), '⏱️');
           
            if (val === '&bt') return renderStructured(`BT ${String(p1).replace('BT_','')}`, '', '📶');
            if (val === '&out') return renderStructured(String(p1).replace('OUT_',''), '', '🔌');
            if (val === '&rgb_ug') return renderStructured(`RGB ${String(p1).replace('RGB_','')}`, '', '💡');
            if (val === '&ext_power') return renderStructured(`PWR ${String(p1).replace('EP_','')}`, '', '🔋');
           
            if (val === '&magic') return renderStructured(`Magic`, '', '✨');
            if (val === '&sk') return renderStructured(combinedParams ? formatKeycode(combinedParams, osMode) : '', '', '📌');

            if (val.startsWith('&mac')) return renderStructured(val.replace('&',''), '', '⚡');
           
            return renderStructured(combinedParams, val.replace('&', ''));
        };

        // Moved here in Stage 3 (see ARCHITECTURE.md §7): was a top-level helper in glide.html's
        // inline script, fine when only App used it, but the new SettingsModal (ui/modals.js)
        // needs it too — the "Auto-Detect (WIN)" option label calls it directly.
        const detectOs = () => { const platform = navigator.userAgent.toLowerCase(); if (platform.includes('mac')) return 'mac'; if (platform.includes('linux')) return 'linux'; return 'win'; };

    window.GlideUI = window.GlideUI || {};
    Object.assign(window.GlideUI, { PALETTE_DATA, FLAT_GRID_TABS, searchAcrossAllPalette, ALL_PALETTE_SECTIONS, KEY_COLOR_PRESETS, bindingFromPaletteItem, describeBindingParam, describeBindingStep, getContrastColor, escapeHtml, mainLabelSizeClass, getBeautifulLabel, detectOs, renderFlowMarkdown });
})();
