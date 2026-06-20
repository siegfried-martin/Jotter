import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

// Regression for the double-bullet bug: the custom editor CSS (ported from the Quill 1.x
// Svelte app) used to draw a bullet on `li::before` in addition to Quill 2's own marker on
// `.ql-ui::before`, so every bullet rendered twice. The marker must come ONLY from .ql-ui.
test.describe('wysiwyg bullet rendering', () => {
  test('a bullet list shows exactly one marker per item', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-wys-bullets',
      sections: [
        {
          type: 'wysiwyg',
          content:
            '<p>intro</p><ul><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>alpha</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>beta</li></ul>',
          sequence: 10
        }
      ]
    });
    try {
      await page.goto(`/app/sections/${tree.sections[0].id}`);
      await expect(page.locator('.ql-editor')).toContainText('alpha');

      const markers = await page.evaluate(() => {
        const li = document.querySelector('.ql-editor li');
        const ui = li?.querySelector('.ql-ui') ?? null;
        const before = (el: Element | null) =>
          el ? getComputedStyle(el, '::before').content : '(no element)';
        return { liBefore: before(li ?? null), uiBefore: before(ui) };
      });

      // Quill's marker (on .ql-ui) renders the bullet…
      expect(markers.uiBefore).toContain('•');
      // …and the legacy li::before must NOT add a second one.
      expect(markers.liBefore).not.toContain('•');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
