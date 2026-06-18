import { test, expect } from '@playwright/test';
import {
  cleanup,
  countCollectionsNamed,
  fetchCollectionName,
  gotoAppForSeeding,
  readDomOrder,
  seedTree,
  waitForCollectionsGrid
} from './helpers';

// The dev DB already holds the e2e user's own collections, so we never assert the
// full DOM order — only the relative order of the rows we seeded.

test.describe('collections', () => {
  test('render in ascending sequence order', async ({ page }) => {
    await gotoAppForSeeding(page);
    // Seed deliberately out of order; the grid must still sort by sequence asc.
    const a = await seedTree(page, { collectionName: 'e2e-order-A', collectionSequence: 9200 });
    const b = await seedTree(page, { collectionName: 'e2e-order-B', collectionSequence: 9100 });
    const c = await seedTree(page, { collectionName: 'e2e-order-C', collectionSequence: 9300 });
    try {
      await page.reload();
      await waitForCollectionsGrid(page);

      const seeded = [a.collectionId, b.collectionId, c.collectionId];
      const domOrder = (await readDomOrder(page, 'data-collection-id')).filter((id) =>
        seeded.includes(id)
      );
      // ascending sequence → B(9100), A(9200), C(9300)
      expect(domOrder).toEqual([b.collectionId, a.collectionId, c.collectionId]);
    } finally {
      await cleanup(page, a.collectionId);
      await cleanup(page, b.collectionId);
      await cleanup(page, c.collectionId);
    }
  });

  test('edit name + description persists across reload', async ({ page }) => {
    await gotoAppForSeeding(page);
    const { collectionId } = await seedTree(page, { collectionName: 'e2e-edit-src' });
    try {
      await page.reload();
      await waitForCollectionsGrid(page);

      const card = page.locator(`[data-collection-id="${collectionId}"]`);
      await card.getByRole('button', { name: 'Edit collection' }).click();
      await card.getByPlaceholder('Collection name').fill('e2e-edited');
      await card
        .getByPlaceholder('What will you store in this collection?')
        .fill('updated description');
      // Exercise the color picker (swatches carry the hex as their title).
      await card.locator('button[title^="#"]').last().click();
      await card.getByRole('button', { name: 'Save Changes' }).click();

      await expect(card.getByText('e2e-edited')).toBeVisible();
      await expect(card.getByText('updated description')).toBeVisible();

      // The mutation is optimistic — wait for the background write to land before
      // reloading, or the reload would re-fetch the pre-edit row.
      await expect.poll(() => fetchCollectionName(page, collectionId)).toBe('e2e-edited');

      await page.reload();
      await waitForCollectionsGrid(page);
      const reloaded = page.locator(`[data-collection-id="${collectionId}"]`);
      await expect(reloaded.getByText('e2e-edited')).toBeVisible();
      await expect(reloaded.getByText('updated description')).toBeVisible();
    } finally {
      await cleanup(page, collectionId);
    }
  });

  test('create then delete a collection (real insert + cascade delete)', async ({ page }) => {
    await gotoAppForSeeding(page);
    await waitForCollectionsGrid(page);
    const cards = page.getByTestId('collection-card');
    const before = await cards.count();

    await page.getByRole('button', { name: 'Create New Collection' }).click();
    await page.getByPlaceholder('Collection name').fill('e2e-create-delete');
    await page.getByRole('button', { name: 'Create Collection' }).click();
    await expect(cards).toHaveCount(before + 1);

    page.once('dialog', (d) => d.accept());
    await page
      .locator('[data-collection-id]')
      .filter({ hasText: 'e2e-create-delete' })
      .getByRole('button', { name: 'Delete collection' })
      .click();
    await expect(cards).toHaveCount(before);
    // Delete is optimistic — wait for the real DB delete so the row doesn't leak.
    await expect.poll(() => countCollectionsNamed(page, 'e2e-create-delete')).toBe(0);
  });
});
