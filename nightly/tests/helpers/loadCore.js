// Import every core/*.js file, in the same dependency order glide.html loads them in,
// purely for their side effect of populating window.GlideCore. See ARCHITECTURE.md and
// README.md for why these are classic scripts rather than real ES modules for now.
import '../../core/zmk/naming.js';
import '../../core/zmk/layerPointers.js';
import '../../core/zmk/combos.js';
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
import '../../core/behaviors/schemas.js';
import '../../core/behaviors/registry.js';
import '../../core/behaviors/compile.js';
import '../../core/io/layoutSchema.js';
import '../../core/io/loadLayout.js';
import '../../core/io/exportLayout.js';
import '../../core/capabilities/paramBinding.js';
import '../../core/capabilities/catalogSchema.js';
import '../../core/capabilities/jqRunner.js';
import '../../core/capabilities/applyFlow.js';
import '../../core/capabilities/builtinCatalog.js';

export const GlideCore = globalThis.window.GlideCore;
