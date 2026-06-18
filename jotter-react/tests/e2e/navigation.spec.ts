import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree, waitForCollectionsGrid } from './helpers';

test.describe('navigation', () => {
  test('app → collection → container → section → back', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-nav',
      containerTitle: 'e2e-nav-note',
      sections: [{ type: 'code', content: 'nav content', sequence: 10 }]
    });
    try {
      await page.goto('/app');
      await waitForCollectionsGrid(page);

      await page.locator(`[data-collection-id="${tree.collectionId}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/app/collections/${tree.collectionId}`));
      await expect(page.getByTestId('section-card')).toHaveCount(1);

      await page.getByTestId('section-card').click();
      await expect(page).toHaveURL(new RegExp(`/sections/${tree.sections[0].id}`));
      await expect(page.getByPlaceholder('Untitled section')).toBeVisible();

      // Save closes the editor, returning to the container page.
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/containers/${tree.containerId}$`));
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('collection tabs switch between collections', async ({ page }) => {
    await gotoAppForSeeding(page);
    const a = await seedTree(page, { collectionName: 'e2e-tab-A' });
    const b = await seedTree(page, { collectionName: 'e2e-tab-B' });
    try {
      await page.goto(`/app/collections/${a.collectionId}/containers/${a.containerId}`);
      // On collection A, B is an inactive tab (a link); clicking navigates there.
      await page.getByRole('link', { name: 'e2e-tab-B', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/app/collections/${b.collectionId}`));
    } finally {
      await cleanup(page, a.collectionId);
      await cleanup(page, b.collectionId);
    }
  });

  test('deep link to a container renders its sections', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [{ type: 'code', content: 'deep link content', sequence: 10 }]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await expect(page.getByTestId('section-card')).toHaveCount(1);
      await expect(page.getByTestId('section-card-content')).toContainText('deep link content');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
