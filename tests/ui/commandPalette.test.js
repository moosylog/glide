// @vitest-environment jsdom
//
// The command palette (glide.html's showCommandPalette state, opened from the top bar's "What do
// you want to do?" button; component in ui/modals.js's CommandPaletteModal) exists to give GLIDE
// one search box that spans Flows Automations, the layout's own already-created custom behaviors,
// and a handful of built-in editor capabilities that have no catalog entry of their own — rather
// than someone having to already know "home-row mods" lives specifically inside the separate Flows
// modal, or that "double-tap" is a per-key inspector slot, before they can find either. These tests
// prove each of the three result kinds actually surfaces and actually does something when clicked
// (a Flow opens straight to its own detail in the *existing* Flows modal — no duplicate apply logic
// here — and a behavior opens its real builder modal via the same openBehaviorEditor this session's
// earlier ✎ "Edit this behavior's own definition" button already uses).
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, byText, byTitle, typeInto, delay } from './testAppHarness.js';

const openPalette = async () => { await click(byTitle('What do you want to do? Search Flows, your behaviors, and editor tips')); await delay(100); };
const paletteInput = () => q('input[placeholder^="What do you want to do?"]');

describe('Command palette', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json'); // Glove80, has &msteams_ptt macro on layer "Meeting"
  });

  it('opens from the top bar and closes on backdrop click, clearing the search', async () => {
    expect(paletteInput()).toBeFalsy();
    await openPalette();
    expect(paletteInput()).toBeTruthy();

    await typeInto(paletteInput(), 'gaming');
    // The backdrop is the palette's own outer fixed-inset div, the only ancestor with onClose.
    await click(q('.fixed.inset-0.z-50'));
    expect(paletteInput()).toBeFalsy();

    await openPalette();
    expect(paletteInput().value).toBe('');
  });

  it('searching a Flow term surfaces it and clicking opens the Flows modal straight to its detail', async () => {
    await openPalette();
    await typeInto(paletteInput(), 'gaming layer');
    expect(document.body.textContent).toMatch(/Gaming Layer/);

    const clickedTitle = qa('.font-bold.text-app-text.truncate').find((el) => /Gaming Layer/.test(el.textContent)).textContent.trim();
    await click(qa('.font-bold.text-app-text.truncate').find((el) => /Gaming Layer/.test(el.textContent)));
    // Same detail view CapabilitiesModal always renders for a selected flow — proves this really
    // routed into the existing Flows modal rather than some parallel apply path. Checking for a
    // "← Back to <category>" link (rather than the Apply button, whose label depends on the jq-web
    // engine load state this test never mocks) is engine-state-independent.
    expect(document.body.textContent).toMatch(/← Back to/);
    expect(document.body.textContent).toContain(clickedTitle);
    // The palette itself closed behind it.
    expect(paletteInput()).toBeFalsy();
  });

  it('searching an existing macro by name surfaces it under "Your own behaviors" and opens its builder', async () => {
    await openPalette();
    await typeInto(paletteInput(), 'msteams');
    expect(document.body.textContent).toContain('Your own behaviors');
    expect(document.body.textContent).toContain('msteams_ptt');

    await click(byText('div', 'msteams_ptt'));
    expect(q('[data-testid="macro-modal"]')).toBeTruthy();
    expect(q('[data-testid="macro-modal"] input')?.value).toBe('msteams_ptt');
    expect(paletteInput()).toBeFalsy();
  });

  it('matches a hyphenated catalog title against an unhyphenated query, in both directions', async () => {
    // Found by actually looking at this in a real browser, not by the jsdom suite: the catalog's
    // own Home-Row Mods flow is hyphenated throughout (title "Home-Row Mods", description
    // "...home-row keys do two things..."), but the exact phrase from GLIDE's own pitch copy
    // ("I want Home-Row Mods") and how anyone would actually type it ("home row mods") has no
    // hyphen at all. A plain substring match never finds it. See normalizeForSearch in
    // ui/modals.js.
    await openPalette();
    await typeInto(paletteInput(), 'home row mods');
    expect(document.body.textContent).toContain('Home-Row Mods');

    await typeInto(paletteInput(), 'home-row');
    expect(document.body.textContent).toContain('Home-Row Mods');
  });

  it('searching in the pitch\'s own phrasing surfaces the matching "how do I" tip', async () => {
    await openPalette();
    await typeInto(paletteInput(), 'swap colon and semi colon');
    expect(document.body.textContent).toContain('Swap two keys');
    expect(document.body.textContent).toMatch(/Drag one key and drop it onto another/);
  });

  it('an empty query shows guidance text, not a result list', async () => {
    await openPalette();
    expect(document.body.textContent).toMatch(/in your own words, not ZMK's/);
  });

  it('a nonsense query shows the empty state rather than a blank silence', async () => {
    await openPalette();
    await typeInto(paletteInput(), 'zzzznonexistentquery');
    expect(document.body.textContent).toMatch(/Nothing matches/);
  });
});
