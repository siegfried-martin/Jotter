import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

test.describe('section editor', () => {
  test('seeded code content renders in the editor', { tag: '@smoke' }, async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [{ type: 'code', content: 'const answer = 42;', sequence: 10 }]
    });
    try {
      await page.goto(
        `/app/collections/${tree.collectionId}/containers/${tree.containerId}/sections/${tree.sections[0].id}`
      );
      // CodeMirror renders the document into .cm-content.
      await expect(page.locator('.cm-content')).toContainText('const answer = 42;');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('editing a section title persists across reload', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [{ type: 'code', content: 'x', sequence: 10 }]
    });
    try {
      await page.goto(
        `/app/collections/${tree.collectionId}/containers/${tree.containerId}/sections/${tree.sections[0].id}`
      );
      await page.getByPlaceholder('Untitled section').fill('e2e persisted title');
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect(page.getByText('e2e persisted title')).toBeVisible();
      await page.reload();
      await expect(page.getByText('e2e persisted title')).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('adding a checklist item persists across reload', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [
        {
          type: 'checklist',
          checklistData: [{ text: 'existing item', checked: false }],
          sequence: 10
        }
      ]
    });
    try {
      await page.goto(
        `/app/collections/${tree.collectionId}/containers/${tree.containerId}/sections/${tree.sections[0].id}`
      );
      const inputs = page.locator('input[placeholder="Enter task..."]');
      await expect(inputs.first()).toHaveValue('existing item');

      await page.getByRole('button', { name: '+ Add new item' }).click();
      await inputs.last().fill('brand new task');
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      const preview = page.getByTestId('section-card-content');
      await expect(preview.getByText('brand new task')).toBeVisible();
      await page.reload();
      await expect(
        page.getByTestId('section-card-content').getByText('brand new task')
      ).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('cancelling a brand-new empty section deletes it', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page);
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await page.getByRole('button', { name: 'Code', exact: true }).click();
      await expect(page.getByPlaceholder('Untitled section')).toBeVisible();

      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByTestId('section-card')).toHaveCount(0);
      await expect(page.getByText('No sections yet. Add one above.')).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
