import { test, expect } from '@playwright/test';
import {
  SECOND_EMAIL,
  cleanup,
  e2ePassword,
  gotoAppForSeeding,
  seedTree,
  signInAs
} from './helpers';

test.describe('real-time collaboration', () => {
  test('two users editing the same code section see each other live', async ({ page, browser }) => {
    await gotoAppForSeeding(page);
    // Empty section → no seed → no cross-client duplicate-text edge; pure live-sync test.
    const tree = await seedTree(page, {
      collectionName: 'e2e-collab',
      sections: [{ type: 'code', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await signInAs(pageB, SECOND_EMAIL, e2ePassword());
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await pageB.goto(`/app/sections/${sectionId}`);
      await expect(page.locator('.cm-content')).toBeVisible();
      await expect(pageB.locator('.cm-content')).toBeVisible();

      // A types — B receives it live over Supabase Realtime (no reload, no save).
      await page.locator('.cm-content').click();
      await page.keyboard.type('HELLO123', { delay: 40 });
      await expect(pageB.locator('.cm-content')).toContainText('HELLO123', { timeout: 15000 });

      // …and the reverse direction.
      await pageB.locator('.cm-content').click();
      await pageB.keyboard.press('Control+End');
      await pageB.keyboard.type('WORLD456', { delay: 40 });
      await expect(page.locator('.cm-content')).toContainText('WORLD456', { timeout: 15000 });
    } finally {
      await ctxB.close();
      await cleanup(page, tree.collectionId);
    }
  });
});
