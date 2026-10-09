/*! GLIDE (c) 2026 Moosy. All rights reserved. See LICENSE.txt. */
(function(){"use strict";const e=window.GlideCore||(window.GlideCore={});Object.assign(e,{runJqScript:async(t,o)=>{if(typeof window.jq>"u"||typeof window.jq.json!="function")return{output:null,error:"The jq engine is not loaded yet — try again in a moment."};try{const n=o.replace(/\r\n/g,`
`);return{output:await window.jq.json(t,n),error:null}}catch(n){return{output:null,error:n&&n.message?n.message:String(n)}}}})})();
