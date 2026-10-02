import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { formatKeycode, describeBinding } = GlideCore;

describe('formatKeycode', () => {
  it('collapses a two-digit number-row code to its single digit', () => {
    expect(formatKeycode('N1', 'win')).toBe('1');
    expect(formatKeycode('N0', 'win')).toBe('0');
  });

  it('renders platform-specific modifier symbols', () => {
    expect(formatKeycode('LGUI', 'mac')).toBe('⌘');
    expect(formatKeycode('LGUI', 'win')).toBe('⊞');
    expect(formatKeycode('LGUI', 'linux')).toBe('❖');
  });

  it('marks a right-side modifier with a superscript R', () => {
    expect(formatKeycode('RCTRL', 'win')).toBe('Ctrlᴿ');
  });

  it('falls back to the raw uppercased code for anything unmapped', () => {
    expect(formatKeycode('Q', 'win')).toBe('Q');
  });

  // Consumer-facing label normalization (not a layout-format change — a layout file still
  // reads/writes the exact same raw ZMK code, e.g. "KP_N1" or "INT5"; only the on-screen text
  // changes). Covers real codes seen in actual MoErgo exports (tests/fixtures/engrammer.json
  // and go60-touchpads-clickmap.json both use KP_N1.../KP_N0 and KP_SLASH literally) plus their
  // less common canonical/alias siblings from ZMK's own keycode list
  // (https://zmk.dev/docs/keymaps/list-of-keycodes).
  it('renders keypad digits as plain numbers, both the common alias and the canonical name', () => {
    expect(formatKeycode('KP_N1', 'win')).toBe('1');
    expect(formatKeycode('KP_N0', 'win')).toBe('0');
    expect(formatKeycode('KP_N9', 'win')).toBe('9');
    expect(formatKeycode('KP_NUMBER_7', 'win')).toBe('7');
  });

  it('renders keypad operator keys as the plain glyph printed on a real numpad, not a math-class symbol', () => {
    expect(formatKeycode('KP_SLASH', 'win')).toBe('/');
    expect(formatKeycode('KP_DIVIDE', 'win')).toBe('/');
    expect(formatKeycode('KP_MULTIPLY', 'win')).toBe('*');
    expect(formatKeycode('KP_ASTERISK', 'win')).toBe('*');
    expect(formatKeycode('KP_MINUS', 'win')).toBe('-');
    expect(formatKeycode('KP_SUBTRACT', 'win')).toBe('-');
  });

  it('renders the remaining keypad keys in plain English', () => {
    expect(formatKeycode('KP_LPAR', 'win')).toBe('(');
    expect(formatKeycode('KP_RIGHT_PARENTHESIS', 'win')).toBe(')');
    expect(formatKeycode('KP_NUM', 'win')).toBe('Num Lock');
    expect(formatKeycode('KP_NUMLOCK', 'win')).toBe('Num Lock');
    expect(formatKeycode('KP_CLEAR', 'win')).toBe('Clear');
  });

  it('renders International/Language keys abbreviated in English, not the native-script legend ZMK\'s own docs use', () => {
    expect(formatKeycode('INT5', 'win')).toBe('Intl 5');
    expect(formatKeycode('INTERNATIONAL_5', 'win')).toBe('Intl 5');
    expect(formatKeycode('LANG2', 'win')).toBe('Lang 2');
    expect(formatKeycode('LANGUAGE_2', 'win')).toBe('Lang 2');
    // Every one of INT1-9/LANG1-9 is covered, not just the commonly-cited ones.
    for (let n = 1; n <= 9; n++) {
      expect(formatKeycode(`INT${n}`, 'win')).toBe(`Intl ${n}`);
      expect(formatKeycode(`LANG${n}`, 'win')).toBe(`Lang ${n}`);
    }
  });
});

describe('describeBinding', () => {
  it('describes a plain &kp binding by its keycode', () => {
    expect(describeBinding({ value: '&kp', params: [{ value: 'A' }] }, 'win')).toBe('A');
  });

  it('describes an empty/&none binding as "Empty"', () => {
    expect(describeBinding({ value: '&none' }, 'win')).toBe('Empty');
    expect(describeBinding(null, 'win')).toBe('Empty');
  });

  it('describes &trans as "Transparent"', () => {
    expect(describeBinding({ value: '&trans' }, 'win')).toBe('Transparent');
  });

  it('describes MoErgo\'s &lower proprietary behavior the same way as &magic — a clean action name, not the raw code', () => {
    expect(describeBinding({ value: '&magic' }, 'win')).toBe('Magic Action');
    expect(describeBinding({ value: '&lower' }, 'win')).toBe('Lower Action');
  });

  it('describes a momentary-layer binding using the layer name', () => {
    const binding = { value: '&mo', params: [{ value: 1 }] };
    expect(describeBinding(binding, 'win', ['Base', 'Nav'])).toBe('Momentary Nav');
  });
});
