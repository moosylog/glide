// Import every core/*.js file, in the same dependency order glide.html loads them in,
// purely for their side effect of populating window.GlideCore. See ARCHITECTURE.md and
// README.md for why these are classic scripts rather than real ES modules for now.
import '../../core/zmk/naming.js';
import '../../core/zmk/layerPointers.js';
import '../../core/keycodes/zmkMap.js';
import '../../core/keycodes/modChain.js';
import '../../core/geometry/convertGeo.js';
import '../../core/geometry/glove80.js';
import '../../core/geometry/go60.js';
import '../../core/gc.js';
import '../../core/usage.js';
import '../../core/slots.js';
import '../../core/describe.js';
import '../../core/layerShift.js';

export const GlideCore = globalThis.window.GlideCore;
