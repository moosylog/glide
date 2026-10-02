// tests/core/paletteData.test.js — the key picker's underlying data (ui/shared.js's
// PALETTE_DATA/ALL_PALETTE_SECTIONS), shared by the key inspector, Macro Builder, and
// Mod-Morph/Tap-Dance binding pickers (see BindingPicker in ui/builders.js). Pure data, no
// React/Babel involved (see ui/shared.js's own header), so it loads the same way core/*.js
// does rather than through the jsdom app harness.
import { describe, it, expect } from 'vitest';
import '../helpers/loadCore.js';
import '../../ui/shared.js';

const { PALETTE_DATA, ALL_PALETTE_SECTIONS } = globalThis.window.GlideUI;

const findSection = (category) => ALL_PALETTE_SECTIONS.find((s) => s.category === category);

describe('International & Language key picker entries', () => {
  const section = findSection('International & Language');

  it('exists as its own category, offering all nine International and nine Language keys', () => {
    expect(section).toBeTruthy();
    expect(section.items).toHaveLength(18);
  });

  it('labels every entry in plain English ("International N"/"Language N"), matching the name ZMK\'s own docs give each code — never the native-script legend', () => {
    for (let n = 1; n <= 9; n++) {
      const intItem = section.items.find((i) => i.code === `INT${n}`);
      const langItem = section.items.find((i) => i.code === `LANG${n}`);
      expect(intItem.label).toBe(`International ${n}`);
      expect(langItem.label).toBe(`Language ${n}`);
    }
  });

  it('never surfaces the native-script legends the International/Language entries used to show', () => {
    const allLabels = ALL_PALETTE_SECTIONS.flatMap((s) => s.items.map((i) => i.label)).filter(Boolean).join(' ');
    for (const legend of ['無変換', '한영', '漢字', '変換', 'かな', '한자']) {
      expect(allLabels).not.toContain(legend);
    }
  });

  it('labels every International/Language entry with exactly "International N" or "Language N" — nothing else', () => {
    for (const item of section.items) {
      expect(item.label).toMatch(/^(International|Language) [1-9]$/);
    }
  });

  it('fixes the pre-existing bug where both 漢字 and 変換 were mapped to INT4 — INT4 now appears exactly once, as "International 4"', () => {
    const int4Items = ALL_PALETTE_SECTIONS.flatMap((s) => s.items).filter((i) => i.code === 'INT4');
    expect(int4Items).toHaveLength(1);
    expect(int4Items[0].label).toBe('International 4');
  });
});

describe('Keypad operator keys in the picker', () => {
  it('shows the plain glyph printed on a real numpad key, not a math-class symbol', () => {
    const symbols = findSection('Symbols');
    expect(symbols.items.find((i) => i.code === 'KP_DIVIDE').label).toBe('/');
    expect(symbols.items.find((i) => i.code === 'KP_MULTIPLY').label).toBe('*');
  });
});
