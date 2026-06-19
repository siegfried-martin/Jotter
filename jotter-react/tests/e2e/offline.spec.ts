import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionTitle, gotoAppForSeeding, seedTree } from './helpers';

test.describe('offline editing', () => {
  test('an edit made offline is queued, shown, and syncs on reconnect', async ({
    page,
    context
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-offline',
      sections: [{ type: 'code', content: 'before', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    try {
      // Open the section in the editor.
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByPlaceholder('Untitled section')).toBeVisible();

      // Drop the connection — the global indicator announces offline.
      await context.setOffline(true);
      await expect(page.getByTestId('offline-indicator')).toHaveAttribute('data-offline', 'true');

      // Edit + save while offline. The write is parked; the editor closes normally and the
      // indicator shows a pending change instead of erroring or losing the edit.
      await page.getByPlaceholder('Untitled section').fill('edited offline');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByTestId('offline-indicator')).toContainText('saved locally');

      // The change has NOT yet reached Postgres (we're offline) — it lives only in the outbox.

      // Reconnect → the outbox drains → the edit lands on the server.
      await context.setOffline(false);
      await expect
        .poll(() => fetchSectionTitle(page, sectionId), { timeout: 10000 })
        .toBe('edited offline');

      // Once nothing is pending and we're online, the indicator disappears.
      await expect(page.getByTestId('offline-indicator')).toHaveCount(0);
    } finally {
      await context.setOffline(false);
      await cleanup(page, tree.collectionId);
    }
  });
});
