import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionTitle, gotoAppForSeeding, seedTree } from './helpers';

test.describe('LWW conflict detection', () => {
  test('saving a checklist that changed underneath you offers to keep both', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-conflict',
      sections: [{ type: 'checklist', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    const containerId = tree.containerId;

    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByPlaceholder('Untitled section')).toBeVisible();

      // Simulate another user saving the section after we opened it (bumps updated_at).
      await page.evaluate(async (sid) => {
        const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
        await sb
          .from('note_section')
          .update({ title: 'theirs', updated_at: '2030-01-01T00:00:00Z' })
          .eq('id', sid);
      }, sectionId);

      // Make our edit and save → the change is detected.
      await page.getByPlaceholder('Untitled section').fill('mine');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByTestId('conflict-dialog')).toBeVisible();

      // Keep both: our edit becomes a copy; theirs is left intact.
      await page.getByRole('button', { name: 'Save as a copy' }).click();

      await expect.poll(() => fetchSectionTitle(page, sectionId)).toBe('theirs');
      await expect
        .poll(
          () =>
            page.evaluate(
              async ({ cid, sid }) => {
                const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
                const { data } = await sb
                  .from('note_section')
                  .select('id,title')
                  .eq('note_container_id', cid);
                return (data as { id: string; title: string }[]).some(
                  (r) => r.title === 'mine' && r.id !== sid
                );
              },
              { cid: containerId, sid: sectionId }
            ),
          { timeout: 10000 }
        )
        .toBe(true);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
