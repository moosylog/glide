import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as babel from '@babel/core';
import React from 'react';
import ReactDOM from 'react-dom/client';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CORE_SCRIPT_PATHS = [
  'core/zmk/naming.js', 'core/zmk/layerPointers.js', 'core/zmk/combos.js', 'core/zmk/inputProcessors.js', 'core/zmk/macro.js', 'core/zmk/stickyKey.js', 'core/zmk/modMorph.js', 'core/zmk/holdTap.js', 'core/zmk/tapDance.js',
  'core/keycodes/zmkMap.js', 'core/keycodes/modChain.js',
  'core/geometry/convertGeo.js', 'core/geometry/glove80.js', 'core/geometry/go60.js',
  'core/gc.js', 'core/usage.js', 'core/slots.js', 'core/describe.js', 'core/layerShift.js',
  'core/behaviors/schemas.js', 'core/behaviors/registry.js', 'core/behaviors/compile.js',
  'core/io/layoutSchema.js', 'core/io/loadLayout.js', 'core/io/exportLayout.js',
  'core/capabilities/paramBinding.js', 'core/capabilities/catalogSchema.js',
  'core/capabilities/jqRunner.js', 'core/capabilities/applyFlow.js',
  'core/capabilities/builtinCatalog.js',
];

let compiledAppCache = null;
function getCompiledApp() {
  if (compiledAppCache) return compiledAppCache;
  const html = readFileSync(path.join(repoRoot, 'glide.html'), 'utf8');
  const startTag = '<script type="text/babel">';
  const start = html.indexOf(startTag) + startTag.length;
  const end = html.indexOf('</script>', start);
  const code = html.slice(start, end);
  const { code: compiled } = babel.transformSync(code, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
  });
  compiledAppCache = compiled;
  return compiled;
}

/**
 * Mounts the real glide.html app (compiled exactly as the browser's Babel Standalone
 * would) into the current jsdom document. Call once per test, typically in beforeEach —
 * each call gets a fresh #root and a fresh React tree, so tests don't leak state.
 */
export async function mountGlideApp() {
  document.body.innerHTML = '<div id="root"></div>';

  window.React = React;
  window.ReactDOM = ReactDOM;

  // jsdom doesn't implement ResizeObserver or real layout geometry — same stubs used
  // to prove the fixes interactively earlier this session.
  window.ResizeObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ target: el, contentRect: el.getBoundingClientRect() }]); }
    disconnect() {} unobserve() {}
  };
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { width: 1200, height: 800, top: 0, left: 0, right: 1200, bottom: 800 };
  };
  window.confirm = () => true;
  window.alert = () => {};

  for (const p of CORE_SCRIPT_PATHS) {
    const src = readFileSync(path.join(repoRoot, p), 'utf8');
    new Function(src).call(window);
  }

  const compiled = getCompiledApp();
  new Function(compiled).call(window);

  // React 18's createRoot().render() doesn't commit synchronously — give it a tick before
  // returning, so callers can immediately query the DOM without their own boilerplate delay.
  await delay(50);
}

export const delay = (ms = 50) => new Promise((res) => setTimeout(res, ms));
export const q = (sel) => document.querySelector(sel);
export const qa = (sel) => Array.from(document.querySelectorAll(sel));
export const byText = (tag, text) => qa(tag).find((el) => el.textContent.trim() === text);
export const byTitle = (title) => qa('button').find((b) => b.title === title);
export const keyEl = (idx) => qa('[data-key-idx]').find((el) => el.dataset.keyIdx === String(idx));

export async function click(el) {
  if (!el) throw new Error('click(): target element was null — check the selector that produced it');
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await delay();
}

/**
 * Sets a controlled <input>'s value the way a real keystroke would. Setting el.value directly
 * and dispatching a plain 'input' event does NOT reliably trigger React's onChange in jsdom —
 * React overrides the instance's value setter to track the "last known" value, so it needs the
 * native prototype setter invoked instead to correctly detect the change.
 */
export async function typeInto(el, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSetter.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  await delay();
}

/**
 * Dispatches a PointerEvent, for the touch/pen drag interactions (canvas panning, key
 * drag-to-swap, long-press-for-context-menu, layer reordering, panel resizing) that are driven
 * by Pointer Events rather than React's onClick — see glide.html's KeyboardContainer and the
 * Layers list. `el` is where the event is dispatched from; pointermove/pointerup are usually
 * dispatched on `document` since that's where the app's own listeners live once a drag starts.
 */
export async function pointerEvent(el, type, opts = {}) {
  const { pointerId = 1, pointerType = 'touch', clientX = 0, clientY = 0, button = 0 } = opts;
  el.dispatchEvent(new window.PointerEvent(type, { bubbles: true, cancelable: true, pointerId, pointerType, clientX, clientY, button }));
  await delay();
}

/**
 * jsdom has no real layout engine, so `document.elementFromPoint` is undefined — the app's drag
 * logic calls it (optional-chained) to hit-test which key/layer-row a pointer is currently over.
 * Tests that exercise a drag stub it to return a specific element for the duration of the test.
 */
export function stubElementFromPoint(elOrFn) {
  const original = document.elementFromPoint;
  document.elementFromPoint = typeof elOrFn === 'function' ? elOrFn : () => elOrFn;
  return () => { document.elementFromPoint = original; };
}

export async function loadFixtureFile(fixtureName) {
  const jsonText = readFileSync(path.join(repoRoot, 'tests', 'fixtures', fixtureName), 'utf8');
  const fileInput = q('input[type="file"]');
  const file = new window.File([jsonText], fixtureName, { type: 'application/json' });
  Object.defineProperty(fileInput, 'files', { value: [file], writable: false, configurable: true });
  fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await delay(150);
}

/** Reads the currently-selected key/combo's binding via the app's own JSON tab, then returns to Keymap. */
export async function readCurrentBindingJson() {
  await click(byTitle('JSON'));
  const value = q('textarea').value;
  await click(byTitle('Keymap'));
  return JSON.parse(value);
}
