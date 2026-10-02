import { test, expect, type Page } from '@playwright/test';
import * as Y from 'yjs';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

// An edit that reaches the server's shared snapshot WITHOUT going through the live Realtime
// channel (another user's save while we weren't connected, or an MCP connector write) must
// survive our next save. The editor writes its whole doc as the new snapshot, so it has to
// merge the server's current snapshot first (docs/initiatives/mcp-connector.md, slice 0).

async function readRow(page: Page, sectionId: string) {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb
      .from('note_section')
      .select('content, ydoc')
      .eq('id', sid)
      .maybeSingle();
    return data as { content: string; ydoc: string | null };
  }, sectionId);
}

/** Append text to the section's shared Yjs snapshot out-of-band (REST only, no broadcast). */
async function appendExternally(page: Page, sectionId: string, text: string) {
  const row = await readRow(page, sectionId);
  const doc = new Y.Doc();
  if (row.ydoc) Y.applyUpdate(doc, new Uint8Array(Buffer.from(row.ydoc, 'base64')));
  const ytext = doc.getText('content');
  ytext.insert(ytext.length, text);
  const ydoc = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64');
  const content = ytext.toString();
  await page.evaluate(
    async ({ sid, ydoc, content }) => {
      const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
      const { error } = await sb
        .from('note_section')
        .update({ ydoc, content, updated_at: new Date().toISOString() })
        .eq('id', sid);
      if (error) throw new Error(error.message);
    },
    { sid: sectionId, ydoc, content }
  );
}

test.describe('CRDT external writes', () => {
  test('an out-of-band snapshot edit is merged, not overwritten, by the next save', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-crdt-ext',
      sections: [{ type: 'code', content: 'seed', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    try {
      // First save establishes the shared snapshot.
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.locator('.cm-content')).toContainText('seed');
      await page.locator('.cm-content').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' LOCAL1', { delay: 30 });
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(async () => (await readRow(page, sectionId)).ydoc).not.toBeNull();

      // Reopen the editor, then land a write on the server that this editor never sees live.
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.locator('.cm-content')).toContainText('LOCAL1');
      await appendExternally(page, sectionId, ' REMOTE1');

      // Keep editing and save: the remote text must be merged in, not dropped.
      await page.locator('.cm-content').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' LOCAL2', { delay: 30 });
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect
        .poll(async () => (await readRow(page, sectionId)).content, { timeout: 10000 })
        .toContain('LOCAL2');
      const { content } = await readRow(page, sectionId);
      expect(content).toContain('REMOTE1');
      expect(content.match(/seed/g)).toHaveLength(1); // merged, not re-seeded/duplicated

      // A fresh open shows the merged document.
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.locator('.cm-content')).toContainText('REMOTE1');
      await expect(page.locator('.cm-content')).toContainText('LOCAL2');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
