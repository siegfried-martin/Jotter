import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, readDomOrder, seedTree } from './helpers';

test.describe('sections', () => {
  test('render in ascending sequence order', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [
        { type: 'code', content: 'first by id, last by seq', sequence: 30 },
        { type: 'wysiwyg', content: '<p>second</p>', sequence: 10 },
        { type: 'checklist', checklistData: [{ text: 'a task', checked: false }], sequence: 20 }
      ]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await expect(page.getByTestId('section-card').first()).toBeVisible();

      const order = await readDomOrder(page, 'data-section-id');
      const bySeq = [...tree.sections].sort((a, b) => a.sequence - b.sequence).map((s) => s.id);
      expect(order).toEqual(bySeq);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  for (const label of ['Text', 'Code', 'Draw', 'Tasks']) {
    test(`create a ${label} section opens the editor and persists a card`, async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page);
      try {
        await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
        await page.getByRole('button', { name: label, exact: true }).click();

        const titleInput = page.getByPlaceholder('Untitled section');
        await expect(titleInput).toBeVisible();
        await titleInput.fill(`e2e ${label} title`);
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await expect(page.getByTestId('section-card')).toHaveCount(1);
        await expect(page.getByText(`e2e ${label} title`)).toBeVisible();
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });
  }

  test('delete a section via the ⋮ menu (confirm dialog)', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [{ type: 'code', content: 'content worth confirming', sequence: 10 }]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const card = page.getByTestId('section-card');
      await expect(card).toHaveCount(1);

      await card.getByRole('button', { name: 'More actions' }).click();
      page.once('dialog', (d) => d.accept()); // has content → confirm
      await page.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page.getByTestId('section-card')).toHaveCount(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test.describe('clipboard', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('copy to clipboard shows a toast', async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page, {
        sections: [{ type: 'code', content: 'copy this code', sequence: 10 }]
      });
      try {
        await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
        await page
          .getByTestId('section-card')
          .getByRole('button', { name: 'More actions' })
          .click();
        await page.getByRole('button', { name: 'Copy to clipboard' }).click();
        await expect(page.getByText('Copied to clipboard')).toBeVisible();
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });
  });
});
