// core/geometry/glove80.js — Glove80 raw key geometry and logical key-position names.
// Extracted from glide.html as part of GLIDE's core/ modularization (see ARCHITECTURE.md).
// Classic script (no bundler yet) — attaches its exports to window.GlideCore.
(function () {
    'use strict';
    const GlideCore = window.GlideCore || (window.GlideCore = {});
    const { mirrorSpecialKey, GLOVE80_TOTAL_WIDTH, convertGeo } = GlideCore;

        const GLOVE80_THUMB_A_LEFT = [{x:6.4,y:4,r:20,rx:4,ry:4}, {x:7.8,y:3.3,r:30,rx:4,ry:3.3}, {x:10.1,y:1.5,r:45,rx:4,ry:1.5}];
        const GLOVE80_THUMB_B_LEFT = [{x:5.3,y:5.4,r:15,rx:4,ry:5.4}, {x:6.6,y:5,r:25,rx:4,ry:5}, {x:9,y:3.2,r:45,rx:4,ry:3.2}];
        const GLOVE80_GEO_RAW = [
            {x:0,y:0.5},{x:1,y:0.5},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:13,y:0},{x:14,y:0},{x:15,y:0},{x:16,y:0.5},{x:17,y:0.5},
            {x:0,y:1.5},{x:1,y:1.5},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:12,y:1},{x:13,y:1},{x:14,y:1},{x:15,y:1},{x:16,y:1.5},{x:17,y:1.5},
            {x:0,y:2.5},{x:1,y:2.5},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:12,y:2},{x:13,y:2},{x:14,y:2},{x:15,y:2},{x:16,y:2.5},{x:17,y:2.5},
            {x:0,y:3.5},{x:1,y:3.5},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:12,y:3},{x:13,y:3},{x:14,y:3},{x:15,y:3},{x:16,y:3.5},{x:17,y:3.5},
            {x:0,y:4.5},{x:1,y:4.5},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4}, ...GLOVE80_THUMB_A_LEFT, ...[...GLOVE80_THUMB_A_LEFT].reverse().map(k => mirrorSpecialKey(k, GLOVE80_TOTAL_WIDTH)),
            {x:12,y:4},{x:13,y:4},{x:14,y:4},{x:15,y:4},{x:16,y:4.5},{x:17,y:4.5},
            {x:0,y:5.5},{x:1,y:5.5},{x:2,y:5},{x:3,y:5},{x:4,y:5}, ...GLOVE80_THUMB_B_LEFT, ...[...GLOVE80_THUMB_B_LEFT].reverse().map(k => mirrorSpecialKey(k, GLOVE80_TOTAL_WIDTH)),
            {x:13,y:5},{x:14,y:5},{x:15,y:5},{x:16,y:5.5},{x:17,y:5.5}
        ];
        const GLOVE80_GEO = convertGeo(GLOVE80_GEO_RAW);
const GLOVE80_NAMES = {
            0: "LH C6R1", 1: "LH C5R1", 2: "LH C4R1", 3: "LH C3R1", 4: "LH C2R1", 10: "LH C6R2", 11: "LH C5R2", 12: "LH C4R2", 13: "LH C3R2", 14: "LH C2R2", 15: "LH C1R2", 22: "LH C6R3", 23: "LH C5R3", 24: "LH C4R3", 25: "LH C3R3", 26: "LH C2R3", 27: "LH C1R3", 34: "LH C6R4", 35: "LH C5R4", 36: "LH C4R4", 37: "LH C3R4", 38: "LH C2R4", 39: "LH C1R4", 46: "LH C6R5", 47: "LH C5R5", 48: "LH C4R5", 49: "LH C3R5", 50: "LH C2R5", 51: "LH C1R5", 64: "LH C6R6", 65: "LH C5R6", 66: "LH C4R6", 67: "LH C3R6", 68: "LH C2R6", 52: "LH T1", 53: "LH T2", 54: "LH T3", 69: "LH T4", 70: "LH T5", 71: "LH T6",
            5: "RH C2R1", 6: "RH C3R1", 7: "RH C4R1", 8: "RH C5R1", 9: "RH C6R1", 16: "RH C1R2", 17: "RH C2R2", 18: "RH C3R2", 19: "RH C4R2", 20: "RH C5R2", 21: "RH C6R2", 28: "RH C1R3", 29: "RH C2R3", 30: "RH C3R3", 31: "RH C4R3", 32: "RH C5R3", 33: "RH C6R3", 40: "RH C1R4", 41: "RH C2R4", 42: "RH C3R4", 43: "RH C4R4", 44: "RH C5R4", 45: "RH C6R4", 58: "RH C1R5", 59: "RH C2R5", 60: "RH C3R5", 61: "RH C4R5", 62: "RH C5R5", 63: "RH C6R5", 75: "RH C2R6", 76: "RH C3R6", 77: "RH C4R6", 78: "RH C5R6", 79: "RH C6R6", 55: "RH T3", 56: "RH T2", 57: "RH T1", 72: "RH T6", 73: "RH T5", 74: "RH T4"
        };

    Object.assign(GlideCore, { GLOVE80_THUMB_A_LEFT, GLOVE80_THUMB_B_LEFT, GLOVE80_GEO_RAW, GLOVE80_GEO, GLOVE80_NAMES });
})();
