// core/describe.js — Human-readable keycode/binding formatting (slot-list text, tooltips).
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { ZMK_MAP, MOD_WRAPPER_TO_FULL, unwrapModChain, RAW_MOD_CODES, isGlideHtName, isRecognizedTdName, isGlideMmName, stripGlideHtPrefix, stripTdPrefix, stripGlideMmPrefix } = GlideCore;

        const formatKeycode = (val, osMode) => {
            if (!val || val === 'none' || val === '&none') return '';
            const normalized = String(val).toUpperCase().replace('&', '');
            const isMac = osMode === 'mac'; const isLinux = osMode === 'linux'; const isRight = normalized.startsWith('R');
            let sym = '';
            if (normalized.endsWith('GUI')) sym = isMac ? '⌘' : (isLinux ? '❖' : '⊞');
            else if (normalized.endsWith('CTRL')) sym = isMac ? '⌃' : 'Ctrl';
            else if (normalized.endsWith('ALT')) sym = isMac ? '⌥' : 'Alt';
            else if (normalized.endsWith('SHFT')) sym = '⇧';
            if (sym) return sym + (isRight ? 'ᴿ' : '');
            if (ZMK_MAP[normalized]) return ZMK_MAP[normalized];
            if (normalized.length === 2 && normalized.startsWith('N') && '0123456789'.includes(normalized[1])) return normalized[1];
            return normalized;
        };

        const formatParam = (p, layerNames) => {
            if (p === '' || p === undefined || p === null) return '';
            const pStr = String(p);
            if (/^\d+$/.test(pStr)) {
                let dName = layerNames[parseInt(pStr)] || `L${pStr}`;
                return dName.length > 5 ? dName.substring(0, 4) + '..' : dName;
            }
            return pStr;
        };

        const formatParamFull = (p, layerNames) => {
            if (p === '' || p === undefined || p === null) return '';
            const pStr = String(p);
            if (/^\d+$/.test(pStr)) return layerNames[parseInt(pStr)] || `Layer ${pStr}`;
            return pStr;
        };
        const describeBinding = (binding, osMode, layerNames = []) => {
            if (!binding || !binding.value || binding.value === '&none' || binding.value === 'none') return 'Empty';
            if (binding.value === '&trans') return 'Transparent';
            const val = binding.value; const p1 = binding.params?.[0]?.value; const p2 = binding.params?.[1]?.value;
            if (RAW_MOD_CODES.has(val)) return formatKeycode(val, osMode);
            if (val === '&kp') {
                if (p1 && MOD_WRAPPER_TO_FULL[p1] && binding.params[0].params) {
                    const { mods, keyVal } = unwrapModChain(binding.params[0]);
                    return mods.map(m => formatKeycode(m, osMode)).join(' + ') + ' + ' + formatKeycode(keyVal, osMode);
                }
                return p1 ? formatKeycode(String(p1), osMode) : '&kp';
            }
           
            const lName = formatParamFull(p1, layerNames);
            if (val === '&mo' || val === '&layer') return `Momentary ${lName}`; if (val === '&tog') return `Toggle ${lName}`; if (val === '&to') return `Switch to ${lName}`; if (val === '&sl') return `Sticky Layer ${lName}`; if (val === '&lt') return `Layer-Tap (${lName})`;
            if (val === 'Custom') return p1 ? String(p1) : 'Custom';
           
            if (val === '&bt') return `Bluetooth: ${p1} ${p2 ?? ''}`; if (val === '&out') return `Output: ${p1}`; if (val === '&rgb_ug') return `RGB: ${p1}`;
           
            if (val === '&magic') return `Magic Action`;
            if (val === '&sk') {
                let combinedFallback = [formatParamFull(p1, layerNames), formatParamFull(p2, layerNames)].filter(x => x).join(' ');
                return `Sticky Key: ${formatKeycode(combinedFallback, osMode)}`;
            }
           
            if (isGlideHtName(val)) return stripGlideHtPrefix(val).split('_').map(s => formatKeycode(s, osMode)).join(' + ');
            if (isRecognizedTdName(val)) return stripTdPrefix(val).split('_').map(s => formatKeycode(s, osMode)).join(' / ');
            if (isGlideMmName(val)) return stripGlideMmPrefix(val).split('_').map(s => formatKeycode(s, osMode)).join(' / Shift+');
           
            let combinedFallback = [formatParamFull(p1, layerNames), formatParamFull(p2, layerNames)].filter(x => x).join(' ');
            if (val.startsWith('&')) return val.replace('&', '') + (combinedFallback ? ` ${combinedFallback}` : '');
            return val;
        };

    Object.assign(GlideCore, { formatKeycode, formatParam, formatParamFull, describeBinding });
})();
