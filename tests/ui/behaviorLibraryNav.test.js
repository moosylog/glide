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

  it('clicking Layers or Combos closes the Behavior Library section, even if it was manually opened', async () => {
    // Previously this section stayed expanded once opened, on the theory that a user switching
    // between library tabs shouldn't have to re-expand it each time. In practice that meant
    // clicking away to Layers/Combos left five behavior-definition tabs cluttering the nav for no
    // reason — the section is for *editing behavior definitions*, a separate task from browsing
    // layers or combos, so leaving Layers/Combos should close it back up, matching how it behaves
    // everywhere else (an accordion section that yields the space back when you navigate away).
    await click(libraryToggle());
    await click(navButton('Macros'));
    await click(navButton('Layers'));
    expect(navButton('Macros')).toBeFalsy();

    await click(libraryToggle());
    await click(navButton('Sticky'));
    await click(navButton('Combos'));
    expect(navButton('Sticky')).toBeFalsy();
  });

  it('does not collide with the pre-existing per-key "Advanced Behaviors" inspector tab', () => {
    // That tab now shows a visible label too (UX pass: the inspector's tab switcher grew labels
    // under its icons, see ui/inspector.js) — but its label is the full "Advanced Behaviors",
    // which never matches this section's own text-based lookup for "Behavior Library" above, so
    // the two still can't be confused for one another.
    const advancedInspectorTab = qa('button[title="Advanced Behaviors"]')[0];
    expect(advancedInspectorTab).toBeTruthy();
    expect(advancedInspectorTab.textContent.trim()).toBe('Advanced Behaviors');
    expect(libraryToggle()).not.toBe(advancedInspectorTab);
  });
});
