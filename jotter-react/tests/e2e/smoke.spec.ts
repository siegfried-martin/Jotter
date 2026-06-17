import { test, expect } from '@playwright/test';

// Authenticated against real jotter-dev (storage state from global-setup).

test('authenticated app loads the collections grid', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByText('Collections')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New collection' })).toBeVisible();
});

test('create then delete a collection (real Supabase insert + delete)', async ({ page }) => {
  await page.goto('/app');
  // Wait for the grid to finish loading before counting (the count text shows a
  // number once useCollections resolves; reading too early races the data load).
  await expect(page.getByText(/\d+ collection\(s\)/)).toBeVisible();
  const cards = page.getByTestId('collection-card');

  const before = await cards.count();

  // Create — real insert; exercises RLS + the first-collection-default trigger path.
  await page.getByRole('button', { name: 'New collection' }).click();
  await expect(cards).toHaveCount(before + 1);

  // Delete the newest — confirm() dialog + real delete (cascade).
  page.once('dialog', (d) => d.accept());
  await cards.last().getByRole('button', { name: 'Delete collection' }).click();
  await expect(cards).toHaveCount(before);
});
