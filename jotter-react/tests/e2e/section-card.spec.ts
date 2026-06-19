import { test, expect, type Page } from '@playwright/test';

// Seeds a collection + note + a code section with long content via the authed
// Supabase client (window.__SUPABASE_CLIENT__), so we don't click through the editor.
async function seed(page: Page) {
  return page.evaluate(async () => {
    const sb = (window as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const {
      data: { user }
    } = await sb.auth.getUser();
    const uid = user.id;

    const { data: col, error: ce } = await sb
      .from('collections')
      .insert({ name: 'e2e-scroll', color: '#3B82F6', user_id: uid })
      .select()
      .single();
    if (ce) throw new Error('collection insert: ' + ce.message);

    const { data: cont, error: ne } = await sb
      .from('note_container')
      .insert({ title: 'e2e-scroll-note', collection_id: col.id, user_id: uid })
      .select()
      .single();
    if (ne) throw new Error('container insert: ' + ne.message);

    const content = Array.from({ length: 60 }, (_, i) => `line ${i} of long code content`).join(
      '\n'
    );
    const { error: se } = await sb
      .from('note_section')
      .insert({ note_container_id: cont.id, type: 'code', content, sequence: 10, user_id: uid });
    if (se) throw new Error('section insert: ' + se.message);

    return { collectionId: col.id, containerId: cont.id };
  });
}

async function cleanup(page: Page, collectionId: string) {
  await page.evaluate(async (id) => {
    const sb = (window as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    await sb.from('collections').delete().eq('id', id);
  }, collectionId);
}

test('section card content scrolls when it overflows the fixed-height tile', async ({ page }) => {
  await page.goto('/app'); // load app so __SUPABASE_CLIENT__ exists
  const { collectionId, containerId } = await seed(page);
  try {
    await page.goto(`/app/collections/${collectionId}/containers/${containerId}`);

    const content = page.getByTestId('section-card-content').first();
    await expect(content).toBeVisible();

    // Fixed-height tile: long code overflows the content area.
    const overflows = await content.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    expect(overflows).toBe(true);

    // And it can actually scroll vertically.
    const scrollTop = await content.evaluate((el) => {
      el.scrollTop = 100;
      return el.scrollTop;
    });
    expect(scrollTop).toBeGreaterThan(0);
  } finally {
    await cleanup(page, collectionId);
  }
});
