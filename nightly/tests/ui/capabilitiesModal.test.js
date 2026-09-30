// @vitest-environment jsdom
//
// Proves the Flows Automations modal (glide.html's showCapabilities state, opened from the
// toolbar's "Flows Automations"-titled button — a modal, deliberately NOT a left-nav tab beside
// Layers/Combos, since applying an automation is an occasional action, not a persistent editing
// mode) is really wired end to end: open -> an app-store-style grid of categories -> a category's
// own list -> pick an automation -> fill its params -> Apply -> real jq-web runs the real,
// GLIDE-bundled flow's script (including the .layout.keys normalizer prologue Home-Row Mods
// needs) against the real loaded layout -> the result lands in app state via pushHistory, and a
// small result box (success + custom follow-up text, or the real jq error) appears right where
// the automation was launched from. The catalog is bundled with GLIDE itself
// (core/capabilities/builtinCatalog.js) — no network fetch, so nothing here mocks fetch.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mountGlideApp, click, q, qa, byText, byTitle, delay, loadFixtureFile, typeInto } from './testAppHarness.js';

const openFlowsAutomations = async () => { await click(byTitle('Flows Automations')); await delay(150); };

// A category tile's own title (grid "home" screen) — deliberately not `.truncate`, so it never
// collides with a flow row's title element (see clickCapability below).
const clickCategory = (name) => click(qa('.font-bold.text-sm.text-app-text.leading-tight').find((el) => el.textContent.trim() === name));

// A catalog category header can legitimately share text with a flow's own title (e.g. hrm_add
// itself is filed under a "Home-Row Mods" category) — byText('div', title) would then match the
// (non-clickable) category header first, since it renders earlier in the DOM. This targets the
// list row's own title element specifically.
const clickCapability = (title) => click(qa('.font-bold.text-app-text.truncate').find((el) => el.textContent.trim() === title));

beforeAll(async () => {
    // Production glide.html loads jq-web via <script src=".../jq.wasm.js">, which the test
    // harness doesn't fetch from a CDN — wire the same real jq-web engine core/capabilities'
    // tests use behind the exact window.jq.json(input, script) -> Promise contract jqRunner.js
    // expects, so Apply actually runs the real, bundled flow scripts rather than a mock.
    const jqWeb = (await import('jq-web')).default;
    global.window = global.window || {};
    window.jq = { json: (input, script) => jqWeb.promised.json(input, script) };
});

describe('Flows Automations modal', () => {
    beforeEach(async () => {
        await mountGlideApp();
        await loadFixtureFile('go60.json');
    });

    it('is not a left-nav tab — only Layers and Combos are', async () => {
        expect(byText('button', 'Layers')).toBeTruthy();
        expect(byText('button', 'Combos')).toBeTruthy();
        expect(byText('button', 'Flows')).toBeFalsy();
        expect(byText('button', 'Flows Automations')).toBeFalsy(); // it's an icon button (title, no text), not a nav tab
    });

    it('opens from the toolbar into an app-store-style grid of categories, not a flat list', async () => {
        await openFlowsAutomations();
        expect(document.body.textContent).toContain('Flows Automations');
        expect(document.body.textContent).toContain('Home-Row Mods');
        expect(document.body.textContent).toContain('Special keys');
        expect(document.body.textContent).toContain('Decorations & RGB');
        // Category tiles show a count, not the individual automations yet.
        expect(document.body.textContent).toMatch(/automation/);
        expect(document.body.textContent).not.toContain('Function keys on Go60');
    });

    it('drills into a category to see its automations, then into one for its detail view', async () => {
        await openFlowsAutomations();
        await clickCategory('Special keys');
        expect(document.body.textContent).toContain('Function keys on Go60');
        await clickCapability('Function keys on Go60');
        expect(document.body.textContent).toContain('Adds Fn Key Combos');
        expect(byText('button', 'Apply to Layout')).toBeTruthy();
    });

    // Real gap found auditing this modal: `description` fields carry real markdown (bold,
    // inline code, links, bullet lists) but used to render inside a plain whitespace-pre-wrap
    // <p>, so a user saw literal asterisks/backticks instead of formatted text. Proves
    // renderFlowMarkdown (ui/shared.js) is actually wired into the detail view, not just unit-
    // tested in isolation.
    it('renders a description\'s markdown as real elements, not literal asterisks/backticks', async () => {
        await openFlowsAutomations();
        await clickCategory('Decorations & RGB');
        await clickCapability('Magic Key Stylizer');
        const detail = qa('p, li').find((el) => el.textContent.includes('same look'));
        expect(detail).toBeTruthy();
        // The inline code span for `&magic` is a real <code> element...
        expect(detail.querySelector('code')?.textContent).toBe('&magic');
        // ...and the bold lead-in on the bullet list is a real <strong> element, in its own <li>.
        const removeItem = qa('li').find((el) => el.textContent.includes('remove the styling'));
        expect(removeItem.querySelector('strong')?.textContent).toBe('To remove the styling:');
        // Nothing in the rendered text should still show raw markdown syntax.
        expect(document.body.textContent).not.toMatch(/\*\*/);
        expect(document.body.textContent).not.toMatch(/`&magic`/);
    });

    it('searching skips straight to matching automations across every category', async () => {
        await openFlowsAutomations();
        const input = q('input[placeholder="Search Flows Automations..."]');
        await typeInto(input, 'combo');
        expect(document.body.textContent).toContain('Function keys on Go60');
    });

    it('search also matches a flow\'s description, not just its title/subtitle/category', async () => {
        await openFlowsAutomations();
        const input = q('input[placeholder="Search Flows Automations..."]');
        // "letters" appears only in Home-Row Mods' own description ("...act as normal letters when
        // tapped, and as modifier keys when held") — nowhere in its title ("Home-Row Mods"),
        // subtitle ("Adds Home-Row Modifiers"), or category ("Home-Row Mods"). If this only matched
        // title/subtitle/category (the pre-fix behavior), this query would come up empty.
        await typeInto(input, 'letters');
        expect(document.body.textContent).toContain('Home-Row Mods');
        expect(document.body.textContent).not.toContain('No Flows Automations match your search');
    });

    it('search matches a hyphenated title against an unhyphenated query (and vice versa)', async () => {
        // Found via the command palette's own real-browser QA, but the same substring-match code
        // this search runs on predates that entirely — "Home-Row Mods" (title/category) and
        // "home-row keys" (description) are hyphenated throughout the catalog, so typing it the way
        // most people actually would ("home row mods") never matched before normalizeForSearch.
        await openFlowsAutomations();
        const input = q('input[placeholder="Search Flows Automations..."]');
        await typeInto(input, 'home row mods');
        expect(document.body.textContent).toContain('Home-Row Mods');
        expect(document.body.textContent).not.toContain('No Flows Automations match your search');
    });

    it('applies a param-free real automation (Fn_combos) end to end and shows a success result box with its custom message', async () => {
        await openFlowsAutomations();
        await clickCategory('Special keys');
        await clickCapability('Function keys on Go60');
        await click(byText('button', 'Apply to Layout'));
        await delay(300);
        expect(document.body.textContent).toMatch(/Applied "Function keys on Go60"/);
        expect(document.body.textContent).toContain('Success');
        expect(document.body.textContent).toMatch(/F1.{0,3}F12/); // the automation's own successMessage text

        // Confirm the real combos landed in app state, not just the result box — close the
        // modal (clicking its backdrop, same as the user would) and check the Combos tab.
        await click(q('.fixed.inset-0.z-50'));
        await click(byText('button', 'Combos'));
        expect(document.body.textContent).toMatch(/F1_vertical_combo|Combo 1/);
    });

    it('applies the real Home-Row Mods flow without the "Cannot iterate over null" crash', async () => {
        await openFlowsAutomations();
        await clickCategory('Home-Row Mods');
        await clickCapability('Home-Row Mods'); // hrm_add's own title
        await click(byText('button', 'Apply to Layout'));
        await delay(300);
        expect(document.body.textContent).not.toMatch(/Cannot iterate over null/);
        expect(document.body.textContent).toContain('Success');
    });

    it('running the same automation twice updates its own result box each time, not a growing log', async () => {
        await openFlowsAutomations();
        await clickCategory('Home-Row Mods');
        await clickCapability('Home-Row Mods');
        await click(byText('button', 'Apply to Layout'));
        await delay(300);
        expect(document.body.textContent).toContain('Success');
        await click(byText('button', 'Apply to Layout'));
        await delay(300);
        // Still exactly one result box for this automation (a fresh run replaces the old
        // result rather than appending to a list).
        expect(qa('.font-bold.flex.items-center.gap-1\\.5')).toHaveLength(1);
        expect(document.body.textContent).toContain('Success');
    });

    it('never shows a keyboard-restricted automation at all when the wrong hardware is loaded, rather than dimming it', async () => {
        // colors_createRGBscheme ("PR36 RGB Scheme") is glove80-only; go60.json is loaded by
        // default in this suite's beforeEach. The whole point of filtering the catalog before
        // it reaches the modal is that an incompatible entry is simply absent — not present,
        // dimmed, and disabled — so search and category browsing never surface a dead end.
        await openFlowsAutomations();
        await clickCategory('Decorations & RGB');
        expect(document.body.textContent).not.toContain('PR36 RGB Scheme');
        await click(byText('button', '← All categories'));
        const input = q('input[placeholder="Search Flows Automations..."]');
        await typeInto(input, 'RGB Scheme');
        expect(document.body.textContent).not.toContain('PR36 RGB Scheme');
    });

    it('shows every category from the full catalog, including the newly-added ones', async () => {
        await openFlowsAutomations();
        expect(document.body.textContent).toContain('macOS');
        expect(document.body.textContent).toContain('QWERTY Alternatives');
        expect(document.body.textContent).toContain('Autoshift');
        expect(document.body.textContent).toContain('Gaming');
    });

    it('applies the real macOS/Windows modifier remapper (os_remap), a param-free automation with no dedicated category icon needed beyond its own', async () => {
        await openFlowsAutomations();
        await clickCategory('macOS');
        await clickCapability('🍏 Remap to/from macOS');
        expect(document.body.textContent).toContain('Go60 · Glove80'); // hardware badge, unrestricted
        await click(byText('button', 'Apply to Layout'));
        await delay(300);
        expect(document.body.textContent).toContain('Success');
        expect(document.body.textContent).toMatch(/Ctrl and Cmd\/GUI/); // its own successMessage
    });

    it('applies the real Alternative Layouts automation, which declares a real select param bound to the jq script', async () => {
        await openFlowsAutomations();
        await clickCategory('QWERTY Alternatives');
        await clickCapability('Alternative Layouts');
        // FlowParamForm renders a real <select> for this param (defaulting to colemak-dh) —
        // just confirm it's there and apply with that default, same as a user who doesn't touch it.
        expect(q('select')).toBeTruthy();
        await click(byText('button', 'Apply to Layout'));
        await delay(300);
        expect(document.body.textContent).toContain('Success');
    });

    it('a Go60-only automation (Gaming Layer 60) shows its hardware badge; the Glove80-only sibling is filtered out entirely on Go60', async () => {
        await openFlowsAutomations();
        await clickCategory('Gaming');
        expect(document.body.textContent).toContain('Gaming Layer 60');
        expect(document.body.textContent).not.toContain('Gaming Layer 80'); // glove80-only, current layout is go60.json
        await clickCapability('Gaming Layer 60');
        expect(document.body.textContent).toContain('Go60 only');
    });

    it('shows the two newest categories (Mouse Controls, Symbols) with their own icons', async () => {
        await openFlowsAutomations();
        expect(document.body.textContent).toContain('Mouse Controls');
        expect(document.body.textContent).toContain('Symbols');
        expect(document.body.textContent).toContain('🖱️');
        expect(document.body.textContent).toContain('🔣');
    });

    it('on a Glove80 layout, shows glove80-only automations and hides the go60-only ones', async () => {
        await mountGlideApp();
        await loadFixtureFile('engrammer.json'); // a real glove80 fixture
        await openFlowsAutomations();
        await clickCategory('Decorations & RGB');
        expect(document.body.textContent).toContain('PR36 RGB Scheme'); // glove80-only, now visible
        await click(byText('button', '← All categories'));
        await clickCategory('Gaming');
        expect(document.body.textContent).toContain('Gaming Layer 80');
        expect(document.body.textContent).not.toContain('Gaming Layer 60'); // go60-only, hidden on glove80
        await click(byText('button', '← All categories'));
        await clickCategory('Special keys');
        expect(document.body.textContent).not.toContain('Function keys on Go60'); // go60-only, hidden on glove80
    });
});
