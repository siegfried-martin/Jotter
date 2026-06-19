import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

async function fetchSectionContent(page: import('@playwright/test').Page, sectionId: string) {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb.from('note_section').select('content').eq('id', sid).maybeSingle();
    return (data?.content as string) ?? null;
  }, sectionId);
}

test.describe('CRDT wysiwyg editor', () => {
  test('an unsaved rich-text edit survives a reload (y-indexeddb), then materializes on save', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-crdt-wys',
      sections: [{ type: 'wysiwyg', content: '<p>seed</p>', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    try {
      await page.goto(`/app/sections/${sectionId}`);
      // Quill mounts and is seeded from the legacy HTML once the local store loads.
      await expect(page.locator('.ql-editor')).toContainText('seed');

      // Type into the document; y-quill writes it into the Y.Text, which y-indexeddb
      // persists immediately. Do NOT save.
      await page.locator('.ql-editor').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' WYS123');
      await expect(page.locator('.ql-editor')).toContainText('WYS123');

      // Server still has only the seed.
      expect(await fetchSectionContent(page, sectionId)).toContain('seed');
      expect(await fetchSectionContent(page, sectionId)).not.toContain('WYS123');

      // Reload without saving: the edit must rehydrate from the local CRDT store.
      await page.reload();
      await expect(page.locator('.ql-editor')).toContainText('WYS123');
      await expect(page.locator('.ql-editor')).toContainText('seed');

      // Saving materializes the live HTML into Postgres `content`.
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('WYS123');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
