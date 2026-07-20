import { test, expect, type Page } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

// Mobile-viewport regressions: the container-page sidebar collapses to an icon rail
// below the desktop breakpoint (restoring the pre-React behavior), and the screens
// that overflowed at phone width in the 2026-07 audit stay inside the viewport.

const MOBILE = { width: 390, height: 844 };

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.describe('mobile layout', () => {
  test.use({ viewport: MOBILE, hasTouch: true });

  test('sidebar starts collapsed on mobile and toggles to the full list', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-mobile-sidebar',
      containerTitle: 'e2e-mobile note with a long enough title'
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const sidebar = page.getByTestId('container-sidebar');
      await expect(sidebar).toHaveAttribute('data-collapsed', 'true');

      // Collapsed rail: the item shows only its avatar initial, no title text.
      const item = page.getByTestId('container-item').first();
      await expect(item).toBeVisible();
      await expect(item).not.toContainText('long enough title');

      // Expand → full list with titles; collapse again → rail.
      await page.getByTestId('sidebar-toggle').click();
      await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
      await expect(item).toContainText('e2e-mobile note');
      await page.getByTestId('sidebar-toggle').click();
      await expect(sidebar).toHaveAttribute('data-collapsed', 'true');

      await expectNoHorizontalOverflow(page);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('home and section editor fit the phone viewport', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-mobile-fit-collection-with-a-long-name',
      containerTitle: 'e2e-mobile fit note with a fairly long title',
      sections: [{ type: 'wysiwyg', content: '<p>fit check</p>', sequence: 10 }]
    });
    try {
      await page.goto('/app');
      await expect(page.getByText(/\d+ collection\(s\)/)).toBeVisible();
      await expectNoHorizontalOverflow(page);

      // Editor: long collection/note names must truncate in the filing breadcrumb
      // instead of pushing the header (title, controls) past the right edge.
      await page.goto(`/app/sections/${tree.sections[0].id}`);
      const editor = page.getByTestId('wysiwyg-content');
      await expect(editor).toContainText('fit check');
      for (const testId of ['filing-collection', 'filing-note']) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width);
      }
      await expectNoHorizontalOverflow(page);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});

test.describe('desktop layout', () => {
  test('sidebar starts expanded at desktop width', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { collectionName: 'e2e-desktop-sidebar' });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await expect(page.getByTestId('container-sidebar')).toHaveAttribute(
        'data-collapsed',
        'false'
      );
      await expect(page.getByTestId('container-item').first()).toContainText('e2e-note');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
