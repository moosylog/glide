// core/geometry/go60.js — Go60 raw key geometry, logical key-position names, and the shared getLogicalName lookup.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { mirrorSpecialKey, GO60_TOTAL_WIDTH, convertGeo, GLOVE80_NAMES } = GlideCore;

        const GO60_THUMB_LEFT = [{x:4,y:4.25,r:15,rx:4.5,ry:9}, {x:4,y:4.25,r:30,rx:4.5,ry:9}, {x:4,y:4.25,r:45,rx:4.5,ry:9}];
        const GO60_ROUND_LEFT = {x:6.5,y:2.2,w:1.8,h:1.8,isRound:1};
        const GO60_GEO_RAW = [
            {x:0,y:0.9},{x:1,y:0.9},{x:2,y:0.25},{x:3,y:0},{x:4,y:0.15},{x:5,y:0.25},{x:11,y:0.25},{x:12,y:0.15},{x:13,y:0},{x:14,y:0.25},{x:15,y:0.9},{x:16,y:0.9},
            {x:0,y:1.9},{x:1,y:1.9},{x:2,y:1.25},{x:3,y:1},{x:4,y:1.15},{x:5,y:1.25},{x:11,y:1.25},{x:12,y:1.15},{x:13,y:1},{x:14,y:1.25},{x:15,y:1.9},{x:16,y:1.9},
            {x:0,y:2.9},{x:1,y:2.9},{x:2,y:2.25},{x:3,y:2},{x:4,y:2.15},{x:5,y:2.25},{x:11,y:2.25},{x:12,y:2.15},{x:13,y:2},{x:14,y:2.25},{x:15,y:2.9},{x:16,y:2.9},
            {x:0,y:3.9},{x:1,y:3.9},{x:2,y:3.25},{x:3,y:3},{x:4,y:3.15},{x:5,y:3.25},{x:11,y:3.25},{x:12,y:3.15},{x:13,y:3},{x:14,y:3.25},{x:15,y:3.9},{x:16,y:3.9},
            {x:2,y:4.25},{x:3,y:4},{x:4,y:4.15},{x:12,y:4.15},{x:13,y:4},{x:14,y:4.25}, ...GO60_THUMB_LEFT, ...[...GO60_THUMB_LEFT].reverse().map(k => mirrorSpecialKey(k, GO60_TOTAL_WIDTH)),
            GO60_ROUND_LEFT, mirrorSpecialKey(GO60_ROUND_LEFT, GO60_TOTAL_WIDTH)
        ];
        const GO60_GEO = convertGeo(GO60_GEO_RAW);
        const GO60_NAMES = {
            0: "LH C6R1", 1: "LH C5R1", 2: "LH C4R1", 3: "LH C3R1", 4: "LH C2R1", 5: "LH C1R1", 12: "LH C6R2", 13: "LH C5R2", 14: "LH C4R2", 15: "LH C3R2", 16: "LH C2R2", 17: "LH C1R2", 24: "LH C6R3", 25: "LH C5R3", 26: "LH C4R3", 27: "LH C3R3", 28: "LH C2R3", 29: "LH C1R3", 36: "LH C6R4", 37: "LH C5R4", 38: "LH C4R4", 39: "LH C3R4", 40: "LH C2R4", 41: "LH C1R4", 48: "LH C4R5", 49: "LH C3R5", 50: "LH C2R5", 54: "LH T1", 55: "LH T2", 56: "LH T3",
            6: "RH C1R1", 7: "RH C2R1", 8: "RH C3R1", 9: "RH C4R1", 10: "RH C5R1", 11: "RH C6R1", 18: "RH C1R2", 19: "RH C2R2", 20: "RH C3R2", 21: "RH C4R2", 22: "RH C5R2", 23: "RH C6R2", 30: "RH C1R3", 31: "RH C2R3", 32: "RH C3R3", 33: "RH C4R3", 34: "RH C5R3", 35: "RH C6R3", 42: "RH C1R4", 43: "RH C2R4", 44: "RH C3R4", 45: "RH C4R4", 46: "RH C5R4", 47: "RH C6R4", 51: "RH C2R5", 52: "RH C3R5", 53: "RH C4R5", 57: "RH T3", 58: "RH T2", 59: "RH T1"
        };
        const getLogicalName = (index, kbType) => { return ((kbType || '').toLowerCase() === 'go60' ? GO60_NAMES : GLOVE80_NAMES)[index] || index; };

    Object.assign(GlideCore, { GO60_THUMB_LEFT, GO60_ROUND_LEFT, GO60_GEO_RAW, GO60_GEO, GO60_NAMES, getLogicalName });
})();
