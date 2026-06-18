import { test, expect } from '@playwright/test';
import { cleanup, fetchChecklistTexts, gotoAppForSeeding, seedTree } from './helpers';

// DnD is driven through the KeyboardSensor (Space = pick up / drop, Arrow = move):
// deterministic and reliable in CI, and it doubles as the accessibility path. The
// PointerSensor handles real mouse drags in the browser.

test.describe('drag-and-drop', () => {
  test('checklist items reorder via keyboard drag', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [
        {
          type: 'checklist',
          checklistData: [
            { text: 'Alpha', checked: false },
            { text: 'Beta', checked: false },
            { text: 'Gamma', checked: false }
          ],
          sequence: 10
        }
      ]
    });
    try {
      await page.goto(
        `/app/collections/${tree.collectionId}/containers/${tree.containerId}/sections/${tree.sections[0].id}`
      );
      const handles = page.getByRole('button', { name: 'Drag to reorder' });
      await expect(handles.first()).toBeVisible();

      // Pick up Alpha, move it down one, drop → Beta, Alpha, Gamma.
      await handles.first().focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(150);
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);

      // The text inputs should already reflect the new order before saving.
      await expect(page.locator('input[placeholder="Enter task..."]').first()).toHaveValue('Beta');

      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchChecklistTexts(page, tree.sections[0].id))
        .toEqual(['Beta', 'Alpha', 'Gamma']);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
