// core/slots.js — The tap/hold/shiftTap/doubleTap <-> ZMK binding decomposition and synthesis engine.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { isGlideMmName, isGlideHtName, isRecognizedTdName, GLIDE_MM_PREFIX, GLIDE_HT_PREFIX, GLIDE_TD_PREFIX, GLIDE_BEHAVIOR_DESCRIPTION, RAW_MOD_CODES } = GlideCore;

        const parseModMorph = (binding, config) => {
            if (!binding || binding.value === '&none') return { tap: null, shiftTap: null };
            if (isGlideMmName(binding.value)) { const mm = (config?.modMorphs || []).find(m => m.name === binding.value); if (mm && mm.cases && mm.cases.length >= 2) return { tap: mm.cases[0].binding, shiftTap: mm.cases[1].binding }; }
            return { tap: binding, shiftTap: null };
        };

        const parseHoldTap = (binding, config) => {
            if (!binding || binding.value === '&none') return { tap: null, hold: null };
            if (binding.value === '&mt') return { hold: { value: binding.params?.[0]?.value }, tap: { value: '&kp', params: [binding.params?.[1]] } };
            if (binding.value === '&lt') return { hold: { value: '&mo', params: [binding.params?.[0]] }, tap: { value: '&kp', params: [binding.params?.[1]] } };
            if (isGlideHtName(binding.value)) {
                const ht = (config?.holdTaps || []).find(h => h.name === binding.value);
                if (ht && ht.bindings && ht.bindings.length >= 2) {
                    let pIdx = 0;
                    const reconstruct = (val) => { const needsP = ['&kp', '&mo', '&to', '&tog', '&sl', '&layer'].includes(val); if (needsP && binding.params?.[pIdx]) return { value: val, params: [binding.params[pIdx++]] }; return { value: val }; };
                    return { hold: reconstruct(ht.bindings[0]), tap: reconstruct(ht.bindings[1]) };
                }
            }
            return { tap: binding, hold: null };
        };

        const parseSlots = (binding, config) => {
            let slots = { tap: null, shiftTap: null, hold: null, doubleTap: null };
            if (!binding || binding.value === '&none') return slots;
            let primaryBinding = binding; let secondaryBinding = null;
            if (isRecognizedTdName(primaryBinding.value)) { const td = (config?.tapDances || []).find(t => t.name === primaryBinding.value); if (td && td.bindings && td.bindings.length >= 2) { primaryBinding = td.bindings[0]; secondaryBinding = td.bindings[1]; } }
            const pHT = parseHoldTap(primaryBinding, config); slots.hold = pHT.hold;
            const pMM = parseModMorph(pHT.tap, config); slots.tap = pMM.tap; slots.shiftTap = pMM.shiftTap;
            slots.doubleTap = secondaryBinding; return slots;
        };

        const makeModMorph = (tap, shiftTap, configRef) => {
            if (!shiftTap || shiftTap.value === '&none') return tap; if (!tap || tap.value === '&none') return shiftTap;
            const tName = tap.params?.[0]?.value || tap.value.replace('&',''); const stName = shiftTap.params?.[0]?.value || shiftTap.value.replace('&',''); const mmName = `${GLIDE_MM_PREFIX}${tName}_${stName}`;
            if (!configRef.modMorphs) configRef.modMorphs = [];
            if (!configRef.modMorphs.find(m => m.name === mmName)) configRef.modMorphs.push({ name: mmName, description: GLIDE_BEHAVIOR_DESCRIPTION, cases: [ { binding: tap, mods: [], keepMods: [] }, { binding: shiftTap, mods: ["MOD_LSFT", "MOD_RSFT"], keepMods: [] } ] });
            return { value: mmName };
        };

        const makeHoldTap = (tap, hold, configRef, forceCustom = false) => {
            if (!tap && !hold) return null; if (tap && !hold) return tap; if (!tap && hold) return hold;
            const holdVal = hold.value; const tapVal = tap.value;
            const isLayer = holdVal === '&mo' || holdVal === '&to' || holdVal === '&tog' || holdVal === '&sl' || holdVal === '&layer';
            const isMod = RAW_MOD_CODES.has(holdVal) || ['LCTRL','RCTRL','LSHFT','RSHFT','LALT','RALT','LGUI','RGUI'].includes(holdVal);
            if (!forceCustom && (tapVal === '&kp' || tapVal.startsWith('&mac'))) {
                if (tapVal === '&kp') { if (isLayer) return { value: '&lt', params: [hold.params?.[0] || {value: 0}, tap.params[0]] }; if (isMod) return { value: '&mt', params: [{value: holdVal}, tap.params[0]] }; }
            }
            const hName = hold.params?.[0]?.value || holdVal.replace('&',''); const tName = tap.params?.[0]?.value || tapVal.replace('&',''); const htName = `${GLIDE_HT_PREFIX}${hName}_${tName}`;
            if (!configRef.holdTaps) configRef.holdTaps = [];
            if (!configRef.holdTaps.find(h => h.name === htName)) configRef.holdTaps.push({ name: htName, description: GLIDE_BEHAVIOR_DESCRIPTION, bindings: [holdVal, tapVal], tappingTermMs: 200, flavor: "tap-preferred", quickTapMs: -1, requirePriorIdleMs: 0, retroTap: false, holdTriggerOnRelease: false });
            let params = []; if (hold.params) params.push(...hold.params); if (tap.params) params.push(...tap.params);
            return { value: htName, params };
        };

        function buildBindingAndConfig(slots, currentConfig, forceCustomHold = false) {
            let newConfig = structuredClone(currentConfig);
            const primaryTap = makeModMorph(slots.tap, slots.shiftTap, newConfig);
            const primary = makeHoldTap(primaryTap, slots.hold, newConfig, forceCustomHold);
            const secondary = slots.doubleTap && slots.doubleTap.value !== '&none' ? slots.doubleTap : null;
            if (!primary && !secondary) return { newBinding: { value: '&none' }, newConfig };
            if (primary && !secondary) return { newBinding: primary, newConfig };
            if (!primary && secondary) return { newBinding: secondary, newConfig };
            const tName = primary.params?.[0]?.value || primary.value.replace('&',''); const dtName = secondary.params?.[0]?.value || secondary.value.replace('&',''); const tdName = `${GLIDE_TD_PREFIX}${tName}_${dtName}`;
            if (!newConfig.tapDances) newConfig.tapDances = [];
            if (!newConfig.tapDances.find(t => t.name === tdName)) newConfig.tapDances.push({ name: tdName, description: GLIDE_BEHAVIOR_DESCRIPTION, tappingTermMs: 200, bindings: [primary, secondary] });
            return { newBinding: { value: tdName }, newConfig };
        }

    Object.assign(GlideCore, { parseModMorph, parseHoldTap, parseSlots, makeModMorph, makeHoldTap, buildBindingAndConfig });
})();
