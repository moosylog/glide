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

  it('describes a momentary-layer binding using the layer name', () => {
    const binding = { value: '&mo', params: [{ value: 1 }] };
    expect(describeBinding(binding, 'win', ['Base', 'Nav'])).toBe('Momentary Nav');
  });
});
