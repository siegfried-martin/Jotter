import { test, expect } from '@playwright/test';
import {
  SECOND_EMAIL,
  cleanup,
  e2ePassword,
  gotoAppForSeeding,
  seedTree,
  signInAs
} from './helpers';

test.describe('section sharing', () => {
  test('a section shared by one user is readable and joinable by another', async ({
    page,
    browser
  }) => {
    // User A (default authed context) creates a section inside a collection.
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-share-src',
      sections: [{ type: 'code', content: 'shared secret content', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    // User B in a fresh context — not a member of A's collection.
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await signInAs(pageB, SECOND_EMAIL, e2ePassword());
    try {
      // B opens the share link: can read it (public SELECT) and is auto-joined.
      await pageB.goto(`/app/sections/${sectionId}`);
      await expect(pageB.locator('.cm-content')).toContainText('shared secret content');
      await expect(pageB.getByText('Added to your notes')).toBeVisible();

      // The section now appears in B's accessible recent feed.
      const inFeed = await pageB.evaluate(async (sid) => {
        const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
        const { data } = await sb.rpc('get_recent_sections', { p_limit: 50 });
        return (data as { id: string }[]).some((s) => s.id === sid);
      }, sectionId);
      expect(inFeed).toBe(true);

      // Re-opening is a no-op (already a member).
      const addedAgain = await pageB.evaluate(async (sid) => {
        const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
        const { data } = await sb.rpc('open_shared_section', { p_section_id: sid });
        return Boolean(data);
      }, sectionId);
      expect(addedAgain).toBe(false);
    } finally {
      await ctxB.close();
      await cleanup(page, tree.collectionId); // cascade removes the section + B's membership
    }
  });
});
