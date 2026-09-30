// @vitest-environment jsdom
//
// End-to-end proof that clicking a Go60 touchpad key in the real UI opens a working settings
// editor, not the dead click it used to be (isTouchpad short-circuited onSelect/onContextMenu
// entirely). Uses the real MoErgo Go60 export with both trackpads actually configured
// (tests/fixtures/go60-touchpads.json — same fixture core/inputProcessors.test.js proves the
// underlying parse/build logic against), so this is checking the wiring — click handler, App
// state, pushHistory — not re-testing the parser.
//
// Queries are scoped to the modal's own [data-testid="touchpad-modal"] root rather than the
// whole document: GLIDE's key-action palette elsewhere in the app happens to have its own
// "Scroll" button (a real &mkp mouse-scroll action), so an unscoped text search would find that
// one first.
import { describe, it, expect, beforeEach } from 'vitest';
import { mountGlideApp, loadFixtureFile, click, q, qa, keyEl, typeInto, delay } from './testAppHarness.js';

const modal = () => q('[data-testid="touchpad-modal"]');
const mByText = (tag, text) => Array.from(modal().querySelectorAll(tag)).find((el) => el.textContent.trim() === text);
const mByStartsWith = (tag, text) => Array.from(modal().querySelectorAll(tag)).find((el) => el.textContent.trim().startsWith(text));
async function selectOption(selectEl, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  nativeSetter.call(selectEl, value);
  selectEl.dispatchEvent(new window.Event('change', { bubbles: true }));
  await delay();
}

describe('Touchpad settings (Go60)', () => {
  beforeEach(async () => {
    await mountGlideApp();
    await loadFixtureFile('go60-touchpads.json');
  });

  it('clicking a touchpad key opens its settings, showing the real configured values — not the ordinary key inspector', async () => {
    await click(keyEl(60)); // left touchpad — &cirque_lh_listener: 11/12, Y-flip, scroll mode, click->right-click
    expect(document.body.textContent).toContain('Left Touchpad');
    expect(mByText('button', 'Scroll')?.className).toMatch(/bg-app-accent/);
    expect(mByText('button', 'Movement')?.className).not.toMatch(/bg-app-accent/);
    expect(mByText('button', 'Flip Vertical')?.className).toMatch(/bg-app-accent/);
    expect(mByText('button', 'Flip Horizontal')?.className).not.toMatch(/bg-app-accent/);
    expect(mByText('button', 'Right Click')?.className).toMatch(/bg-app-accent/);
    expect(mByText('button', 'Left Click')?.className).not.toMatch(/bg-app-accent/);
    const numberInputs = qa('[data-testid="touchpad-modal"] input[type="number"]');
    expect(numberInputs[0].value).toBe('11');
    expect(numberInputs[1].value).toBe('12');
  });

  it('right touchpad shows its own, different configuration', async () => {
    await click(keyEl(61)); // right touchpad — &cirque_rh_listener: plain 3/1 scaler, movement mode
    expect(document.body.textContent).toContain('Right Touchpad');
    expect(mByText('button', 'Movement')?.className).toMatch(/bg-app-accent/);
    expect(qa('[data-testid="touchpad-modal"] input[type="number"]')[0].value).toBe('3');
  });

  it('Apply writes an edit back and it is still there next time the modal opens; Cancel discards it', async () => {
    await click(keyEl(61));
    await click(mByText('button', 'Flip Horizontal'));
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Touchpad settings updated');

    await click(keyEl(61));
    expect(mByText('button', 'Flip Horizontal')?.className).toMatch(/bg-app-accent/);
    await click(mByText('button', 'Flip Horizontal')); // turn it back off, but Cancel instead of Apply
    await click(mByText('button', 'Cancel'));

    await click(keyEl(61));
    expect(mByText('button', 'Flip Horizontal')?.className).toMatch(/bg-app-accent/); // Cancel discarded the un-flip
  });

  it('editing sensitivity persists the exact multiplier/divisor typed in, not just the slider steps', async () => {
    await click(keyEl(61));
    const [multIn, divIn] = qa('[data-testid="touchpad-modal"] input[type="number"]');
    await typeInto(multIn, '7');
    await typeInto(divIn, '2');
    await click(mByText('button', 'Apply'));
    await click(keyEl(61));
    const after = qa('[data-testid="touchpad-modal"] input[type="number"]');
    expect(after[0].value).toBe('7');
    expect(after[1].value).toBe('2');
    expect(document.body.textContent).toMatch(/×3\.50/);
  });

  it('reads &zip_click_to_button_4_click_mapper off a second real export as "Button #4 (Backward)"', async () => {
    await loadFixtureFile('go60-touchpads-clickmap.json');
    await click(keyEl(61)); // right touchpad in this fixture has the button4 click remap
    expect(mByText('button', 'Button #4 (Backward)')?.className).toMatch(/bg-app-accent/);
    expect(mByText('button', 'Left Click')?.className).not.toMatch(/bg-app-accent/);
  });

  it('switching the Mouse Click target persists on Apply, including an inferred/unverified one', async () => {
    await click(keyEl(61));
    expect(mByText('button', 'Left Click')?.className).toMatch(/bg-app-accent/); // RH starts at the device default
    await click(mByStartsWith('button', 'Middle Click')); // one of the two inferred, "unverified" targets
    expect(document.body.textContent).toContain("hasn't been verified against a real export");
    await click(mByText('button', 'Apply'));
    await click(keyEl(61));
    expect(mByStartsWith('button', 'Middle Click')?.className).toMatch(/bg-app-accent/);
  });

  it('adding a per-layer override creates an independent config that does not affect Default', async () => {
    await click(keyEl(60));
    const addSelect = qa('[data-testid="touchpad-modal"] select').find((s) => s.options[0]?.textContent === '+ Add layer override…');
    await selectOption(addSelect, '1'); // "Keypad" layer, per the fixture's layer_names
    expect(document.body.textContent).toContain('Keypad');
    // The new override starts from scratch (movement, no flips) — independent of Default's
    // scroll-mode/Y-flip config, not a copy of it.
    expect(mByText('button', 'Movement')?.className).toMatch(/bg-app-accent/);
    await click(mByText('button', 'Apply'));
    expect(document.body.textContent).toContain('Touchpad settings updated');

    await click(keyEl(60));
    expect(document.body.textContent).toContain('Keypad');
    await click(mByStartsWith('button', 'Default'));
    expect(mByText('button', 'Scroll')?.className).toMatch(/bg-app-accent/); // Default is unaffected
  });
});
