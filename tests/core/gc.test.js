import { describe, it, expect } from 'vitest';
import { GlideCore } from '../helpers/loadCore.js';

const { runGC, GLIDE_HT_PREFIX } = GlideCore;

describe('runGC', () => {
  it('removes a GLIDE-owned holdTap that is no longer referenced by any key', () => {
    const config = {
      layers: [[{ value: '&kp', params: [{ value: 'A' }] }]],
      holdTaps: [{ name: `${GLIDE_HT_PREFIX}mo_a`, bindings: ['&mo', '&kp'] }],
    };
    const result = runGC(config);
    expect(result.holdTaps).toBeUndefined();
  });

  it('keeps a GLIDE-owned holdTap that IS still referenced', () => {
    const name = `${GLIDE_HT_PREFIX}mo_a`;
    const config = {
      layers: [[{ value: name, params: [{ value: 1 }, { value: 'A' }] }]],
      holdTaps: [{ name, bindings: ['&mo', '&kp'] }],
    };
    const result = runGC(config);
    expect(result.holdTaps).toHaveLength(1);
  });

  it('never removes a hand-authored (non-GLIDE) holdTap, even when unused', () => {
    const config = {
      layers: [[{ value: '&trans' }]],
      holdTaps: [{ name: '&thumb_v2_TKZ', bindings: ['&mo', '&kp'] }],
    };
    const result = runGC(config);
    expect(result.holdTaps).toHaveLength(1);
    expect(result.holdTaps[0].name).toBe('&thumb_v2_TKZ');
  });

  it('follows nested references transitively (a used tap-dance keeps its referenced holdTap alive)', () => {
    const htName = `${GLIDE_HT_PREFIX}mo_a`;
    const tdName = '&GLIDE_td_x_y';
    const config = {
      layers: [[{ value: tdName }]],
      tapDances: [{ name: tdName, bindings: [{ value: htName, params: [{ value: 1 }] }, { value: '&kp', params: [{ value: 'B' }] }] }],
      holdTaps: [{ name: htName, bindings: ['&mo', '&kp'] }],
    };
    const result = runGC(config);
    expect(result.holdTaps).toHaveLength(1);
    expect(result.tapDances).toHaveLength(1);
  });
});
