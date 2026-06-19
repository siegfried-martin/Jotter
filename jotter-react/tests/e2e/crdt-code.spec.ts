import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

/** Read a section's materialized `content` from the server. */
async function fetchSectionContent(page: import('@playwright/test').Page, sectionId: string) {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb.from('note_section').select('content').eq('id', sid).maybeSingle();
    return (data?.content as string) ?? null;
  }, sectionId);
}

test.describe('CRDT code editor', () => {
  test('an unsaved code edit survives a reload (y-indexeddb), then materializes on save', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-crdt',
      sections: [{ type: 'code', content: 'seed', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    try {
      await page.goto(`/app/sections/${sectionId}`);
      // The Yjs editor mounts after the local store loads + seeds.
      await expect(page.locator('.cm-content')).toContainText('seed');

      // Type into the document — yCollab writes it into the Y.Text, which y-indexeddb
      // persists immediately. Do NOT save.
      await page.locator('.cm-content').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type('XYZ123', { delay: 60 });
      await expect(page.locator('.cm-content')).toContainText('XYZ123');

      // Server still has only the seed — the edit hasn't been published.
      expect(await fetchSectionContent(page, sectionId)).toBe('seed');

      // Reload without saving: the edit must rehydrate from the local CRDT store.
      await page.reload();
      await expect(page.locator('.cm-content')).toContainText('XYZ123');
      await expect(page.locator('.cm-content')).toContainText('seed');

      // Saving now materializes the CRDT doc into Postgres `content`.
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('XYZ123');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
