/*! GLIDE (c) 2026 Moosy. All rights reserved. See LICENSE.txt. */
(function(){"use strict";const n=window.GlideCore||(window.GlideCore={}),s=e=>JSON.stringify(e,null,2),i="glide_";Object.assign(n,{serializeLayout:s,getExportFilename:(e,t)=>typeof t=="string"&&t.toLowerCase().endsWith(".json")?t.startsWith(i)?t:`${i}${t}`:`layout_${e?.keyboard||"custom"}.json`})})();
