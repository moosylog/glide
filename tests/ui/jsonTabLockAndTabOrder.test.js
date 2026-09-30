// @vitest-environment jsdom
//
// Two small consumer-friendliness changes to the per-key inspector panel, both requested
// directly: (1) the vertical tab order is Pick Key -> Switch Layer -> Advanced Behaviors ->
// Lighting -> JSON, with "Keymap" renamed to "Pick Key" (ZMK's own "keymap" term means the whole
// config file, not one key's basic tap action -- see switchLayerTab.test.js for the matching
// "Layers" vs. "Switch Layer" collision fix); (2) the raw JSON editor opens read-only by default,
// with a lock icon to unlock it for editing, so a stray keystroke can't silently corrupt a key's
// binding -- the "Apply JSON" button only appears once unlocked.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, byTitle, byText, keyEl, q, qa } from './testAppHarness.js';

describe('Per-key inspector: tab order and labels', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('orders the tabs Pick Key, Switch Layer, Advanced Behaviors, Lighting, JSON', async () => {
    await click(keyEl(0));
    const labels = qa('button[title]')
      .map((b) => b.title)
      .filter((t) => ['Pick Key', 'Switch Layer', 'Advanced Behaviors', 'Lighting', 'JSON'].includes(t));
    expect(labels).toEqual(['Pick Key', 'Switch Layer', 'Advanced Behaviors', 'Lighting', 'JSON']);
  });

  it('titles the first tab "Pick Key", not "Keymap"', async () => {
    await click(keyEl(0));
    expect(byTitle('Pick Key')).toBeTruthy();
    expect(byTitle('Keymap')).toBeFalsy();
  });
});

describe('Per-key inspector: JSON tab opens read-only, unlocked via the lock icon', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
    await click(keyEl(0));
    await click(byTitle('JSON'));
  });

  it('opens read-only, with no Apply JSON button and a hint to unlock', async () => {
    const textarea = q('textarea');
    expect(textarea.readOnly).toBe(true);
    expect(byText('button', 'Apply JSON')).toBeFalsy();
    expect(document.body.textContent).toContain('Read-only');
  });

  it('unlocks editing when the lock icon is clicked, and shows Apply JSON', async () => {
    await click(byTitle('Unlock to edit the raw JSON'));
    const textarea = q('textarea');
    expect(textarea.readOnly).toBe(false);
    expect(byText('button', 'Apply JSON')).toBeTruthy();
  });

  it('re-locks when the lock icon is clicked again', async () => {
    await click(byTitle('Unlock to edit the raw JSON'));
    await click(byTitle('Lock editing (read-only)'));
    const textarea = q('textarea');
    expect(textarea.readOnly).toBe(true);
    expect(byText('button', 'Apply JSON')).toBeFalsy();
  });

  it('re-locks automatically after switching to a different key', async () => {
    await click(byTitle('Unlock to edit the raw JSON'));
    expect(q('textarea').readOnly).toBe(false);

    await click(byTitle('Pick Key'));
    await click(keyEl(1));
    await click(byTitle('JSON'));

    expect(q('textarea').readOnly).toBe(true);
    expect(byText('button', 'Apply JSON')).toBeFalsy();
  });
});
