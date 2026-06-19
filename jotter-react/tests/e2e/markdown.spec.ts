import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

/** Read a section's materialized `content` (the Markdown source) from the server. */
async function fetchSectionContent(page: import('@playwright/test').Page, sectionId: string) {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb.from('note_section').select('content').eq('id', sid).maybeSingle();
    return (data?.content as string) ?? null;
  }, sectionId);
}

test.describe('Markdown section', () => {
  test('renders Markdown source to HTML in the preview', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-md-render',
      sections: [
        { type: 'markdown', content: '# Title123\n\n- alpha\n- beta\n\n**bold99**', sequence: 10 }
      ]
    });
    const sectionId = tree.sections[0].id;

    try {
      await page.goto(`/app/sections/${sectionId}`);
      // Desktop viewport (1280px) opens in Split, so the preview is visible immediately.
      const preview = page.getByTestId('markdown-preview');
      await expect(preview.locator('h1')).toHaveText('Title123');
      await expect(preview.locator('li')).toHaveCount(2);
      await expect(preview.locator('li').first()).toHaveText('alpha');
      await expect(preview.locator('strong')).toHaveText('bold99');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('preview updates live as the source is edited', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-md-live',
      sections: [{ type: 'markdown', content: '', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    try {
      await page.goto(`/app/sections/${sectionId}`);
      // Type a heading into the source (code) pane; the preview re-renders off the Y.Text.
      await page.locator('.cm-content').click();
      await page.keyboard.type('# Heading42', { delay: 30 });
      await expect(page.getByTestId('markdown-preview').locator('h1')).toHaveText('Heading42');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('an unsaved source edit survives a reload (y-indexeddb), then materializes on save', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-md-crdt',
      sections: [{ type: 'markdown', content: 'seed', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.locator('.cm-content')).toContainText('seed');

      // Edit the source; yCollab writes into the Y.Text, which y-indexeddb persists. No save.
      await page.locator('.cm-content').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type('XYZ123', { delay: 50 });
      await expect(page.locator('.cm-content')).toContainText('XYZ123');

      // Server still holds only the seed — the edit hasn't been published.
      expect(await fetchSectionContent(page, sectionId)).toBe('seed');

      // Reload without saving: the edit rehydrates from the local CRDT store.
      await page.reload();
      await expect(page.locator('.cm-content')).toContainText('XYZ123');
      await expect(page.locator('.cm-content')).toContainText('seed');

      // Save materializes the CRDT doc into Postgres `content` (the Markdown source).
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('XYZ123');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('split view is desktop-only', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-md-split',
      sections: [{ type: 'markdown', content: '# Hi', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;

    try {
      await page.goto(`/app/sections/${sectionId}`);

      // Desktop: Split is offered and active by default — source AND preview both visible.
      await expect(page.getByTestId('md-view-split')).toBeVisible();
      await expect(page.locator('.cm-content')).toBeVisible();
      await expect(page.getByTestId('markdown-preview')).toBeVisible();

      // Shrink below the lg breakpoint: Split disappears and the view falls back to a
      // single pane (Code), so the preview is no longer shown alongside the source.
      await page.setViewportSize({ width: 600, height: 900 });
      await expect(page.getByTestId('md-view-split')).toBeHidden();
      await expect(page.locator('.cm-content')).toBeVisible();
      await expect(page.getByTestId('markdown-preview')).toBeHidden();

      // The Code/Preview toggle still works on mobile (one pane at a time).
      await page.getByTestId('md-view-preview').click();
      await expect(page.getByTestId('markdown-preview')).toBeVisible();
      await expect(page.locator('.cm-content')).toBeHidden();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
