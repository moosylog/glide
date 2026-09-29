// @vitest-environment jsdom
//
// Proves the sidebar nav restructure itself: Layers/Combos are always visible, while
// Macros/Sticky/Morphs/Hold-Taps/Tap-Dances are tucked under a collapsible "Behavior Library"
// section that starts collapsed and expands on click (or automatically, if one of its own tabs is
// already the active view). Named "Behavior Library" rather than "Advanced Behaviors" specifically
// to not collide with the pre-existing per-key inspector tab of that name (title="Advanced
// Behaviors", tests/ui/comboLayerScope.test.js exercises that one) — that tab searches/assigns an
// EXISTING behavior to the selected key; this section is where behavior DEFINITIONS are made.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, qa } from './testAppHarness.js';

const navButton = (label) => qa('button').find((b) => b.textContent.trim() === label);
const libraryToggle = () => qa('button').find((b) => b.textContent.includes('Behavior Library'));

describe('Behavior Library nav section', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('shows Layers and Combos immediately, with the library tabs hidden', () => {
    expect(navButton('Layers')).toBeTruthy();
    expect(navButton('Combos')).toBeTruthy();
    expect(navButton('Macros')).toBeFalsy();
    expect(navButton('Sticky')).toBeFalsy();
    expect(navButton('Morphs')).toBeFalsy();
    expect(navButton('Hold-Taps')).toBeFalsy();
    expect(navButton('Tap-Dances')).toBeFalsy();
  });

  it('reveals all five library tabs on click, and hides them again on a second click', async () => {
    await click(libraryToggle());
    expect(navButton('Macros')).toBeTruthy();
    expect(navButton('Sticky')).toBeTruthy();
    expect(navButton('Morphs')).toBeTruthy();
    expect(navButton('Hold-Taps')).toBeTruthy();
    expect(navButton('Tap-Dances')).toBeTruthy();

    await click(libraryToggle());
    expect(navButton('Macros')).toBeFalsy();
  });

  it('going back to Layers does not collapse the section once it has been opened', async () => {
    await click(libraryToggle());
    await click(navButton('Macros'));
    await click(navButton('Layers'));
    // Section should still be expanded since the user opened it, even though Layers is now active.
    expect(navButton('Macros')).toBeTruthy();
  });

  it('does not collide with the pre-existing per-key "Advanced Behaviors" inspector tab', () => {
    // That tab is a plain icon button with a title attribute, no visible text — so it never
    // matches the visible-text lookups above, and this section's own toggle never matches its
    // title-based lookup either.
    const advancedInspectorTab = qa('button[title="Advanced Behaviors"]')[0];
    expect(advancedInspectorTab).toBeTruthy();
    expect(advancedInspectorTab.textContent.trim()).toBe('');
    expect(libraryToggle()).not.toBe(advancedInspectorTab);
  });
});
