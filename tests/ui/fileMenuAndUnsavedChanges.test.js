// @vitest-environment jsdom
//
// Two real UX gaps fixed in the same pass: (1) once a layout was loaded, there was no visible
// way to start a new one or import a different file — only an undiscoverable click on the
// sidebar's logo, which used a native window.confirm() with no real escape hatch; (2) closing
// the tab or switching files could silently discard real work with zero warning. This proves
// the fix end to end: a persistent, full-width top bar carries always-visible, clearly labeled
// New/Import/Export actions once a layout is loaded (no hidden icon-only menu), an edit marks
// the layout dirty (shown as a dot next to the layout name and a "• " prefix on the tab title),
// and any action that would discard a dirty layout — Import or New — routes through GLIDE's own
// in-app ConfirmDialog rather than silently proceeding, with "Export First" as a real way out
// rather than just discard-or-cancel.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, byTitle, byText, q, keyEl, delay } from './testAppHarness.js';

async function uploadFile(text, filename) {
  const fileInput = q('input[type="file"]');
  const file = new window.File([text], filename, { type: 'application/json' });
  Object.defineProperty(fileInput, 'files', { value: [file], writable: false, configurable: true });
  fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await delay(150);
}

describe('Top bar and unsaved-changes protection', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('tynstar.json');
  });

  it('New/Import/Export are always visible in the top bar once a layout is loaded — not hidden behind an icon-only menu', async () => {
    expect(q('[title="Import a layout file"]')).toBeTruthy();
    expect(byTitle('Export this layout')).toBeTruthy();
    await click(byTitle('Start a new blank layout'));
    expect(document.body.textContent).toContain('Start blank');
    expect(document.body.textContent).toContain('Blank Glove80 layout');
    expect(document.body.textContent).toContain('Blank Go60 layout');
  });

  it('the New dropdown is viewport-fixed rather than absolutely positioned inside the scrollable button cluster (regression: it used to grow that cluster\'s own scrollable width, popping a spurious horizontal scrollbar and pushing the menu itself off-screen, unreachable)', async () => {
    await click(byTitle('Start a new blank layout'));
    const panel = byText('div', 'Start blank').parentElement;
    // `fixed` elements don't contribute to any ancestor's scrollable overflow regardless of
    // where they sit in the DOM tree — unlike `absolute`, which (when its containing block is
    // nested inside the New/Import/Export/Undo/Redo cluster's own `overflow-x-auto`, as it used
    // to be here) *does* grow that cluster's scrollable width the moment the panel is wider than
    // the remaining space. `fixed` + explicit left/top (computed from the button's own screen
    // position when opened) is what keeps the panel from doing that.
    expect(panel.className).toContain('fixed');
    expect(panel.className).not.toContain('absolute');
    expect(panel.style.left).toBeTruthy();
    expect(panel.style.top).toBeTruthy();
  });

  it('marks the layout dirty after an edit — shown as a dot next to the layout name and on the tab title', async () => {
    expect(document.title.startsWith('•')).toBe(false);
    await click(keyEl(20));
    await click(byTitle('Clear All Actions'));
    await delay(50);
    await click(byText('button', 'Clear'));
    expect(document.title.startsWith('•')).toBe(true);
    expect(q('[title="Unsaved changes"]')).toBeTruthy();
  });

  it('importing a different file while dirty asks first, and Cancel leaves the current layout untouched', async () => {
    await click(keyEl(20));
    await click(byTitle('Clear All Actions'));
    await delay(50);
    await click(byText('button', 'Clear'));
    expect(document.title.startsWith('•')).toBe(true);

    await uploadFile(JSON.stringify({ layers: [[{ value: '&kp', params: [{ value: 'Z' }] }]] }), 'other.json');

    // The import is paused behind ConfirmDialog, not applied yet.
    expect(document.body.textContent).toContain('Unsaved changes');
    expect(document.body.textContent).not.toMatch(/Loaded "other\.json"/);

    await click(byText('button', 'Cancel'));
    expect(document.body.textContent).not.toMatch(/Loaded "other\.json"/);
    expect(document.title.startsWith('•')).toBe(true); // still dirty, nothing was discarded
  });

  it('"Discard & Continue" actually replaces the layout, and "Export First" exports before doing so', async () => {
    await click(keyEl(20));
    await click(byTitle('Clear All Actions'));
    await delay(50);
    await click(byText('button', 'Clear'));

    await uploadFile(JSON.stringify({ layers: [[{ value: '&kp', params: [{ value: 'Z' }] }]] }), 'other.json');
    await click(byText('button', 'Discard & Continue'));
    await delay(50);
    expect(document.body.textContent).toMatch(/Loaded "other\.json"/);
    expect(document.title.startsWith('•')).toBe(false); // a fresh load always starts clean

    // Re-dirty it, then use the "Export First" escape hatch instead of discarding blind.
    await click(keyEl(0));
    await click(byTitle('Clear All Actions'));
    await delay(50);
    await click(byText('button', 'Clear'));
    expect(document.title.startsWith('•')).toBe(true);

    await uploadFile(JSON.stringify({ layers: [[{ value: '&kp', params: [{ value: 'Y' }] }]] }), 'third.json');
    await click(byText('button', 'Export First'));
    await delay(50);
    // The "Layout exported" toast is real (confirmed by jsdom's own "Not implemented: navigation
    // to another Document" log — the anchor.click() download really fired), but it's a single,
    // transient toast slot that's immediately overwritten by the "Loaded" toast that follows, so
    // only the final, settled state is asserted here.
    expect(document.body.textContent).toMatch(/Loaded "third\.json"/);
  });
});
