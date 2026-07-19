import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

// Keyword search over accessible sections, from the home page. The search box lives in
// the Recent Notes header; typing swaps the recent feed for membership-scoped results
// from the search_sections RPC (migration 0013). Title matches for all types; content
// matches only for the plain-text types (code/markdown, plus tag-stripped wysiwyg) —
// JSON-blob types (diagram, table, …) must NOT match on their content internals.

test.describe('section keyword search', () => {
  test('matches titles and text content; JSON content stays opaque; clearing restores the feed', async ({
    page
  }) => {
    // Unique needle so results are immune to leftover data from other runs.
    const needle = `needle${Date.now()}`;
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-search',
      sections: [
        { type: 'markdown', title: 'md-hit', content: `alpha ${needle} omega`, sequence: 10 },
        {
          type: 'wysiwyg',
          title: 'wys-hit',
          content: `<p>Hello&nbsp;<b>${needle}</b> world</p>`,
          sequence: 20
        },
        { type: 'code', title: 'code-hit', content: `const x = "${needle}";`, sequence: 30 },
        // Title match for a structured type…
        { type: 'checklist', title: `list-${needle}`, checklistData: [], sequence: 40 },
        // …but JSON content must not match (keys/values inside blobs are not user text).
        { type: 'diagram', title: 'diagram-miss', content: `{"foo":"${needle}"}`, sequence: 50 }
      ]
    });
    try {
      await page.goto('/app');
      const search = page.getByTestId('section-search');
      await expect(search).toBeVisible();

      await search.fill(needle);
      const results = page.getByTestId('search-results');
      await expect(results).toBeVisible();
      await expect(results.getByTestId('section-card')).toHaveCount(4);
      await expect(results.getByText('md-hit')).toBeVisible();
      await expect(results.getByText('wys-hit')).toBeVisible();
      await expect(results.getByText('code-hit')).toBeVisible();
      await expect(results.getByText(`list-${needle}`)).toBeVisible();
      await expect(results.getByText('diagram-miss')).toHaveCount(0);

      // No matches → empty state, not stale results.
      await search.fill(`zzz-${needle}`);
      await expect(page.getByTestId('search-empty')).toBeVisible();

      // Clearing restores the recent feed.
      await search.fill('');
      await expect(page.getByTestId('recent-notes')).toBeVisible();
      await expect(page.getByTestId('search-results')).toHaveCount(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('a search hit opens in the section editor', async ({ page }) => {
    const needle = `openme${Date.now()}`;
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-search-open',
      sections: [{ type: 'markdown', title: 'find-and-open', content: needle, sequence: 10 }]
    });
    try {
      await page.goto('/app');
      await page.getByTestId('section-search').fill(needle);
      const results = page.getByTestId('search-results');
      await expect(results.getByTestId('section-card')).toHaveCount(1);
      await results.getByTestId('section-card').click();
      await expect(page).toHaveURL(new RegExp(`/app/sections/${tree.sections[0].id}`));
      await expect(page.getByTestId('editor-body')).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
