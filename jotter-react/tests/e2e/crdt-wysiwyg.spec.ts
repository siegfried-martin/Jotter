import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

async function fetchSectionContent(page: import('@playwright/test').Page, sectionId: string) {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb.from('note_section').select('content').eq('id', sid).maybeSingle();
    return (data?.content as string) ?? null;
  }, sectionId);
}

const editorText = (page: import('@playwright/test').Page) =>
  page
    .locator('.ql-editor')
    .innerText()
    .then((t) => t.trim());

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

      // Edit the document; y-quill writes it into the Y.Text, which y-indexeddb persists
      // immediately. Do NOT save. (We don't assert the exact typed string — the binding can
      // reorder rapid keystrokes in tests — only that an edit registered and is durable.)
      await page.locator('.ql-editor').click();
      await page.keyboard.press('End');
      await page.keyboard.type('MARKER', { delay: 80 });
      const before = await editorText(page);
      expect(before).not.toBe('seed'); // an edit registered
      expect(before.length).toBeGreaterThan('seed'.length);

      // The edit hasn't been published to the server.
      expect(await fetchSectionContent(page, sectionId)).toBe('<p>seed</p>');

      // Durability: after a reload (no save), the local CRDT store rehydrates the exact doc.
      await page.reload();
      await expect.poll(() => editorText(page)).toBe(before);

      // Saving materializes the live HTML into Postgres `content`.
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .not.toBe('<p>seed</p>');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
