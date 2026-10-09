/*! GLIDE (c) 2026 Moosy. All rights reserved. See LICENSE.txt. */
(function(){"use strict";const a=window.GlideCore||(window.GlideCore={}),{BehaviorSchemas:e}=a;Object.assign(a,{getBehaviorSchema:t=>e[t],getAllBehaviorSchemas:()=>Object.values(e),getDefaultValues:t=>{const o=e[t];if(!o)return;const s={};return o.properties.forEach(c=>{s[c.key]=c.default}),s}})})();
