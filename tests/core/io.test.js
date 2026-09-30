import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GlideCore } from '../helpers/loadCore.js';

const { validateLayout, loadLayoutObject, parseLayoutJson, serializeLayout, getExportFilename } = GlideCore;

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const loadFixtureText = (name) => readFileSync(path.join(fixturesDir, name), 'utf8');

describe('io/layoutSchema — validateLayout', () => {
  it('accepts a minimal valid layout', () => {
    expect(validateLayout({ layers: [[], []] })).toEqual({ valid: true, errors: [] });
  });

  it('rejects a non-object top level', () => {
    expect(validateLayout([1, 2, 3]).valid).toBe(false);
    expect(validateLayout('a string').valid).toBe(false);
    expect(validateLayout(null).valid).toBe(false);
  });

  it('rejects a layout missing "layers" entirely', () => {
    const { valid, errors } = validateLayout({ keyboard: 'glove80' });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/Missing required "layers"/);
  });

  it('rejects "layers" that is not an array', () => {
    const { valid, errors } = validateLayout({ layers: { 0: [] } });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/"layers" should be an array/);
  });

  it('rejects a layer entry that is not itself an array', () => {
    const { valid, errors } = validateLayout({ layers: [[], 'not-an-array'] });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/"layers\[1\]" should be an array/);
  });

  it('rejects a present-but-wrong-typed optional field (e.g. holdTaps as an object)', () => {
    const { valid, errors } = validateLayout({ layers: [[]], holdTaps: {} });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/"holdTaps" should be an array/);
  });

  it('does not require any optional field to be present', () => {
    // A bare-minimum foreign/hand-authored file with no combos/holdTaps/etc. is still valid.
    expect(validateLayout({ layers: [[]] }).valid).toBe(true);
  });

  it('accepts every real fixture unmodified', () => {
    ['tynstar.json', 'engrammer.json'].forEach((name) => {
      const raw = JSON.parse(loadFixtureText(name));
      expect(validateLayout(raw)).toEqual({ valid: true, errors: [] });
    });
  });
});

describe('io/loadLayout — loadLayoutObject / parseLayoutJson', () => {
  it('parseLayoutJson round-trips a real fixture with zero errors and the exact same data', () => {
    const text = loadFixtureText('tynstar.json');
    const { config, errors } = parseLayoutJson(text);
    expect(errors).toEqual([]);
    expect(config).toEqual(JSON.parse(text));
  });

  it('unwraps a MoErgo/Oryx-style { keymap: {...} } wrapper transparently', () => {
    const inner = { layers: [[{ value: '&kp', params: [{ value: 'A' }] }]] };
    const { config, errors } = loadLayoutObject({ keymap: inner });
    expect(errors).toEqual([]);
    expect(config).toEqual(inner);
  });

  it('reports malformed JSON as a single clear error rather than throwing', () => {
    const { config, errors } = parseLayoutJson('{ this is not valid json');
    expect(config).toBeNull();
    expect(errors.length).toBe(1);
    expect(errors[0]).toMatch(/Invalid JSON/);
  });

  it('reports a schema violation as an error rather than handing back an unsafe config', () => {
    const { config, errors } = parseLayoutJson(JSON.stringify({ keyboard: 'glove80' })); // no layers
    expect(config).toBeNull();
    expect(errors[0]).toMatch(/Missing required "layers"/);
  });
});

describe('io/exportLayout — serializeLayout / getExportFilename', () => {
  it('serializeLayout round-trips a real fixture\'s every field, including ones GLIDE never touches', () => {
    const original = JSON.parse(loadFixtureText('engrammer.json'));
    const roundTripped = JSON.parse(serializeLayout(original));
    expect(roundTripped).toEqual(original);
    // Explicitly confirm a field GLIDE's own logic never reads survives — the schema validator
    // must never be used to reconstruct the object from a known-fields allowlist.
    expect(roundTripped.custom_devicetree).toEqual(original.custom_devicetree);
    expect(roundTripped.uuid).toEqual(original.uuid);
  });

  it('getExportFilename uses the config\'s keyboard field', () => {
    expect(getExportFilename({ keyboard: 'glove80' })).toBe('layout_glove80.json');
  });

  it('getExportFilename falls back to "custom" when keyboard is missing', () => {
    expect(getExportFilename({})).toBe('layout_custom.json');
    expect(getExportFilename(null)).toBe('layout_custom.json');
  });
});
