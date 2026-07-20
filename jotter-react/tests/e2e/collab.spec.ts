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

  test('two users in the same wysiwyg section: live text + remote caret with name label', async ({
    page,
    browser
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-collab-wys',
      sections: [{ type: 'wysiwyg', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await signInAs(pageB, SECOND_EMAIL, e2ePassword());
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await pageB.goto(`/app/sections/${sectionId}`);
      const editorA = page.getByTestId('wysiwyg-content');
      const editorB = pageB.getByTestId('wysiwyg-content');
      await expect(editorA).toBeVisible();
      await expect(editorB).toBeVisible();

      // A types — B receives it live over Supabase Realtime (no reload, no save)…
      await editorA.click();
      await page.keyboard.type('HELLO123', { delay: 40 });
      await expect(editorB).toContainText('HELLO123', { timeout: 15000 });

      // …and B sees A's caret with a name label (CollaborationCaret presence).
      await expect(editorB.locator('.collaboration-carets__label').first()).toBeVisible({
        timeout: 15000
      });

      // Reverse direction.
      await editorB.click();
      await pageB.keyboard.press('Control+End');
      await pageB.keyboard.type('WORLD456', { delay: 40 });
      await expect(editorA).toContainText('WORLD456', { timeout: 15000 });
    } finally {
      await ctxB.close();
      await cleanup(page, tree.collectionId);
    }
  });
});
