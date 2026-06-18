import { test, expect } from '@playwright/test';
import {
  cleanup,
  fetchContainerTitle,
  gotoAppForSeeding,
  readDomOrder,
  seedContainer,
  seedTree
} from './helpers';

// The sidebar lists only the current collection's containers, so we can assert the
// full rendered order directly.

test.describe('containers', () => {
  test('render in ascending sequence order in the sidebar', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { containerTitle: 'e2e-cont-mid', containerSequence: 20 });
    const first = await seedContainer(page, tree.collectionId, 'e2e-cont-first', 10);
    const last = await seedContainer(page, tree.collectionId, 'e2e-cont-last', 30);
    try {
      await page.goto(`/app/collections/${tree.collectionId}`);
      await expect(page.getByTestId('container-item').first()).toBeVisible();

      const order = await readDomOrder(page, 'data-container-id');
      expect(order).toEqual([first, tree.containerId, last]);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('create a new note adds a container', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { containerTitle: 'e2e-existing-note' });
    try {
      await page.goto(`/app/collections/${tree.collectionId}`);
      await expect(page.getByTestId('container-item')).toHaveCount(1);

      await page.getByRole('button', { name: '+ New Note' }).click();
      await expect(page.getByTestId('container-item')).toHaveCount(2);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('rename a note via double-click persists', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { containerTitle: 'e2e-rename-src' });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const item = page.locator(`[data-container-id="${tree.containerId}"]`);
      await item.getByText('e2e-rename-src').dblclick();
      const input = item.locator('input');
      await input.fill('e2e-renamed');
      await input.press('Enter');
      await expect(item.getByText('e2e-renamed')).toBeVisible();

      // Optimistic mutation — let the background write land before reloading.
      await expect.poll(() => fetchContainerTitle(page, tree.containerId)).toBe('e2e-renamed');

      await page.reload();
      await expect(
        page.locator(`[data-container-id="${tree.containerId}"]`).getByText('e2e-renamed')
      ).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('delete a note removes it (confirm dialog + cascade)', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { containerTitle: 'e2e-keep-note' });
    const target = await seedContainer(page, tree.collectionId, 'e2e-delete-note', 99);
    try {
      await page.goto(`/app/collections/${tree.collectionId}`);
      await expect(page.getByTestId('container-item')).toHaveCount(2);

      page.once('dialog', (d) => d.accept());
      await page
        .locator(`[data-container-id="${target}"]`)
        .getByRole('button', { name: 'Delete note' })
        .click();

      await expect(page.getByTestId('container-item')).toHaveCount(1);
      await expect(page.locator(`[data-container-id="${target}"]`)).toHaveCount(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
