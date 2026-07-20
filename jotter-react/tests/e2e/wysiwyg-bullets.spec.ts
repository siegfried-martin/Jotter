import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

// Legacy-content migration + single-marker rendering. Sections written by the old Quill
// editor carry its markup quirks (`.ql-ui` marker spans, `data-list` attributes). TipTap
// must parse that HTML into a clean list — items intact, exactly one marker per item
// (the native ::marker), and no Quill scaffolding surviving in the document.
test.describe('wysiwyg bullet rendering', () => {
  test('a legacy Quill bullet list renders as a clean list with one marker per item', async ({
    page
  }) => {
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
      const editor = page.getByTestId('wysiwyg-content');
      await expect(editor).toContainText('alpha');
      await expect(editor).toContainText('beta');
      await expect(editor.locator('ul li')).toHaveCount(2);

      const markers = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="wysiwyg-content"]')!;
        const li = root.querySelector('ul li')!;
        return {
          // The bullet must come from the native list marker…
          listStyle: getComputedStyle(li.parentElement!).listStyleType,
          // …not from any pseudo-element or leftover Quill scaffolding.
          liBefore: getComputedStyle(li, '::before').content,
          qlUiCount: root.querySelectorAll('.ql-ui').length
        };
      });
      expect(markers.listStyle).toBe('disc');
      expect(markers.liBefore).toBe('none');
      expect(markers.qlUiCount).toBe(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
