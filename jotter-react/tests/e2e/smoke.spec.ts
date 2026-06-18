import { test, expect } from '@playwright/test';
import { countCollectionsNamed } from './helpers';

// Authenticated against real jotter-dev (storage state from global-setup).

test('authenticated app loads the collections grid', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByText('Collections', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create New Collection' })).toBeVisible();
});

test('create then delete a collection (real Supabase insert + delete)', async ({ page }) => {
  await page.goto('/app');
  // Wait for the grid to finish loading before counting.
  await expect(page.getByText(/\d+ collection\(s\)/)).toBeVisible();
  const cards = page.getByTestId('collection-card');
  const before = await cards.count();

  // Create via the inline form — real insert; exercises RLS + the limit/default triggers.
  await page.getByRole('button', { name: 'Create New Collection' }).click();
  await page.getByPlaceholder('Collection name').fill('e2e smoke test');
  await page.getByRole('button', { name: 'Create Collection' }).click();
  await expect(cards).toHaveCount(before + 1);

  // Delete the one we just made — target by name (sequence sorting means it isn't
  // necessarily the last card, and deleting the wrong one would leak + drop real data).
  page.once('dialog', (d) => d.accept());
  await page
    .locator('[data-collection-id]')
    .filter({ hasText: 'e2e smoke test' })
    .first()
    .getByRole('button', { name: 'Delete collection' })
    .click();
  await expect(cards).toHaveCount(before);
  // Delete is optimistic — wait for the real DB delete so the row doesn't leak.
  await expect.poll(() => countCollectionsNamed(page, 'e2e smoke test')).toBe(0);
});
