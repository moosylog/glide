// core/geometry/convertGeo.js — Shared geometry constants and the raw-grid -> pixel-box conversion used by both boards.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
        const KEY_UNIT = 70; const KEY_SIZE = 62;
        const GLOVE80_TOTAL_WIDTH = 18; const GO60_TOTAL_WIDTH = 17;
        function mirrorSpecialKey(k, totalWidth) {
            const w = k.w || 1; const mirrored = { ...k, x: totalWidth - k.x - w };
            if (k.r !== undefined) mirrored.r = -k.r;
            if (k.rx !== undefined) mirrored.rx = totalWidth - k.rx;
            return mirrored;
        }
        const GUTTER = (KEY_UNIT - KEY_SIZE) / 2;
        function convertGeo(rawGeo) {
            return rawGeo.map(k => {
                const wUnits = k.w || 1, hUnits = k.h || 1;
                const cellLeft = k.x * KEY_UNIT, cellTop = k.y * KEY_UNIT;
                const w = wUnits * KEY_UNIT - (KEY_UNIT - KEY_SIZE); const h = hUnits * KEY_UNIT - (KEY_UNIT - KEY_SIZE);
                const out = { x: cellLeft + GUTTER, y: cellTop + GUTTER, w, h, isRound: !!k.isRound };
                if (k.r) {
                    out.r = k.r;
                    const pivotX = (k.rx !== undefined ? k.rx : k.x) * KEY_UNIT; const pivotY = (k.ry !== undefined ? k.ry : k.y) * KEY_UNIT;
                    const originX = pivotX - (cellLeft + GUTTER); const originY = pivotY - (cellTop + GUTTER);
                    out.o = `${originX.toFixed(1)}px ${originY.toFixed(1)}px`;
                }
                return out;
            });
        }
        function computeGeoBounds(geo) {
            let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
            geo.forEach(k => {
                minX = Math.min(minX, k.x); minY = Math.min(minY, k.y);
                maxX = Math.max(maxX, k.x + (k.w || KEY_SIZE));
                maxY = Math.max(maxY, k.y + (k.h || KEY_SIZE) + (k.r ? 40 : 0));
            });
            return { w: maxX - minX + 20, h: maxY - minY + 20, minX: minX - 10, minY: minY - 10 };
        }

    Object.assign(GlideCore, { KEY_UNIT, KEY_SIZE, GLOVE80_TOTAL_WIDTH, GO60_TOTAL_WIDTH, GUTTER, mirrorSpecialKey, convertGeo, computeGeoBounds });
})();
