// @vitest-environment jsdom
//
// Part of the top-bar/UX redesign: rather than freeform dockable panels (a power-user pattern
// from apps like VS Code or Blender), GLIDE offers a curated "which side is the Layers/Combos
// panel on" preset — Left (default) or Right — set from Settings and persisted like the
// existing bottom/right editor-layout preset. This proves the toggle actually moves the panel
// (via CSS order, since it's the same underlying flex children) and remembers the choice.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, byText, q } from './testAppHarness.js';

describe('Layers/Combos panel side preset', () => {
  beforeEach(async () => {
    localStorage.clear();
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('defaults to Left, and switching to Right in Settings reorders the panel and persists the choice', async () => {
    const sidebar = q('aside');
    expect(sidebar.style.order).toBe('0');

    await click(q('[title="Settings"]'));
    expect(document.body.textContent).toContain('Layers/Combos Panel Side');
    await click(byText('button', 'Right'));

    expect(q('aside').style.order).toBe('2');
    expect(localStorage.getItem('glide_sidebar_side')).toBe('right');

    // Switching back to Left restores the original order.
    await click(byText('button', 'Left'));
    expect(q('aside').style.order).toBe('0');
    expect(localStorage.getItem('glide_sidebar_side')).toBe('left');
  });

  it('remembers a Right preference across a fresh mount', async () => {
    localStorage.setItem('glide_sidebar_side', 'right');
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
    expect(q('aside').style.order).toBe('2');
  });
});
