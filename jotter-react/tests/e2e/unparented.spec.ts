import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionContainerId, gotoAppForSeeding, seedTree } from './helpers';

test.describe('unparented sections', () => {
  test('quick jot creates an unfiled section, then file it into a collection', async ({ page }) => {
    await gotoAppForSeeding(page);
    // A collection with one note → the most-recent note a jot files into.
    const tree = await seedTree(page, {
      collectionName: 'e2e-file-target',
      containerTitle: 'e2e-target-note'
    });
    let sectionId = '';
    try {
      await page.goto('/app');

      // Quick jot a code section → opens the flat editor at /app/sections/$id.
      await page.getByRole('button', { name: 'Code', exact: true }).click();
      await expect(page).toHaveURL(/\/app\/sections\//);
      sectionId = page.url().split('/sections/')[1];

      // Starts unfiled.
      await expect(page.getByTestId('filing-collection')).toContainText('Collection');
      await expect.poll(() => fetchSectionContainerId(page, sectionId)).toBeNull();

      // File it: pick the seeded collection → lands in its most-recent note.
      await page.getByTestId('filing-collection').click();
      await page.getByRole('button', { name: 'e2e-file-target' }).click();

      await expect.poll(() => fetchSectionContainerId(page, sectionId)).toBe(tree.containerId);
      await expect(page.getByTestId('filing-note')).toContainText('e2e-target-note');
    } finally {
      if (sectionId) {
        await page.evaluate(async (sid) => {
          const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
          await sb.from('note_section').delete().eq('id', sid);
        }, sectionId);
      }
      await cleanup(page, tree.collectionId);
    }
  });
});
