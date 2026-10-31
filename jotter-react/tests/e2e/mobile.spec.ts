import { test, expect, type Page } from '@playwright/test';
import { cleanup, fetchSectionTitle, gotoAppForSeeding, seedTree } from './helpers';

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

/** The Univer grid canvas (the largest one), once it has laid out. */
async function tableGridBox(page: Page) {
  const largest = () =>
    page
      .getByTestId('table-editor')
      .locator('canvas')
      .evaluateAll(
        (cs) =>
          cs
            .map((c) => c.getBoundingClientRect())
            .map((r) => ({ x: r.x, y: r.y, area: r.width * r.height }))
            .sort((a, b) => b.area - a.area)[0]
      );
  await expect.poll(async () => (await largest())?.area ?? 0).toBeGreaterThan(100_000);
  return largest();
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

  test('add-section toolbar stays one row, overflow types open from More menu', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { collectionName: 'e2e-mobile-addbar' });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);

      // At phone width not all 8 types fit — the trailing ones fold into "More ▾".
      const more = page.getByTestId('add-overflow');
      await expect(more).toBeVisible();
      // Draw is last in the order, so it must be in the overflow, not inline.
      await expect(page.getByRole('button', { name: 'Draw', exact: true })).toHaveCount(0);

      await more.click();
      const menu = page.getByTestId('add-overflow-menu');
      await expect(menu).toBeVisible();
      await menu.getByRole('button', { name: 'Draw', exact: true }).click();

      // Creates the section and opens its editor.
      await expect(page.getByPlaceholder('Untitled section')).toBeVisible();
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

      // Editor: long collection/note names must truncate in the filing breadcrumb (in the
      // ⋮ menu on mobile) instead of pushing the menu past the right edge.
      await page.goto(`/app/sections/${tree.sections[0].id}`);
      const editor = page.getByTestId('wysiwyg-content');
      await expect(editor).toContainText('fit check');
      await page.getByTestId('editor-menu').click();
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

test.describe('mobile section editor', () => {
  test.use({ viewport: MOBILE, hasTouch: true });

  test('full-screen shell: back saves & closes, actions live in the ⋮ menu', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-mobile-shell',
      sections: [{ type: 'wysiwyg', content: '<p>shell check</p>', sequence: 10 }]
    });
    try {
      await page.goto(`/app/sections/${tree.sections[0].id}`);
      await expect(page.getByTestId('editor-shell')).toBeVisible();
      await expect(page.getByTestId('wysiwyg-content')).toContainText('shell check');

      // No footer: Save is the back button, Cancel lives in the ⋮ menu.
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);

      // The editor body fills the viewport below the slim top bar.
      const body = await page.getByTestId('editor-body').boundingBox();
      expect(body!.width).toBeGreaterThanOrEqual(MOBILE.width - 1);
      expect(body!.y + body!.height).toBeGreaterThanOrEqual(MOBILE.height - 1);

      const menu = page.getByTestId('editor-menu');
      await menu.click();
      const panel = page.getByTestId('editor-menu-panel');
      await expect(panel.getByTestId('filing-collection')).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Copy as Markdown' })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Close without saving' })).toBeVisible();
      await menu.click();
      await expect(panel).toHaveCount(0);

      await page.getByPlaceholder('Untitled section').fill('e2e mobile titled');
      await page.getByTestId('editor-back').click();
      await expect(page.getByTestId('editor-shell')).toHaveCount(0);
      await expect
        .poll(() => fetchSectionTitle(page, tree.sections[0].id))
        .toBe('e2e mobile titled');
      await expectNoHorizontalOverflow(page);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('table: a tap selects a cell without the keyboard; tapping it again edits', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-mobile-table-tap',
      sections: [{ type: 'table', content: '', sequence: 10 }]
    });
    try {
      await page.goto(`/app/sections/${tree.sections[0].id}`);
      await page.waitForFunction(() => Boolean((window as any).__UNIVER_TABLE_API__));
      const cellEditor = page.locator('[id^="__editor___INTERNAL_EDITOR__DOCS_NORMAL"]');
      await expect(cellEditor).toHaveAttribute('inputmode', 'none');

      // A real touch (pointer + touch events), on the grid canvas.
      const box = await tableGridBox(page);
      const cdp = await page.context().newCDPSession(page);
      const tap = async () => {
        const pt = { x: box.x + 120, y: box.y + 70 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
      const editing = () =>
        page.evaluate(() =>
          (window as any).__UNIVER_TABLE_API__.getActiveWorkbook().isCellEditing()
        );

      await tap();
      await expect.poll(editing).toBe(false);
      await expect(cellEditor).toHaveAttribute('inputmode', 'none');

      await tap();
      await expect.poll(editing).toBe(true);
      await expect(cellEditor).toHaveAttribute('inputmode', 'text');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('table: two fingers pan (and pinch-zoom) the grid without selecting or editing', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-mobile-table-pan',
      sections: [{ type: 'table', content: '', sequence: 10 }]
    });
    try {
      await page.goto(`/app/sections/${tree.sections[0].id}`);
      await page.waitForFunction(() => Boolean((window as any).__UNIVER_TABLE_API__));
      const box = await tableGridBox(page);
      // Record the scroll operations Univer applies (sheetViewStartRow = top visible row).
      await page.evaluate(() => {
        const api = (window as any).__UNIVER_TABLE_API__;
        (window as any).__scrolls = [];
        api.onCommandExecuted((c: any) => {
          if (c.id === 'sheet.operation.set-scroll') (window as any).__scrolls.push(c.params);
        });
      });
      const state = () =>
        page.evaluate(() => {
          const wb = (window as any).__UNIVER_TABLE_API__.getActiveWorkbook();
          const scrolls = (window as any).__scrolls;
          return {
            scroll: scrolls[scrolls.length - 1] ?? {
              sheetViewStartRow: 0,
              sheetViewStartColumn: 0
            },
            range: wb.getActiveRange()?.getA1Notation() ?? null,
            editing: wb.isCellEditing()
          };
        });
      const before = await state();

      // Two fingers drag up-left together → the grid scrolls down-right.
      const cdp = await page.context().newCDPSession(page);
      const at = (dx: number, dy: number) => [
        { x: box.x + 200 + dx, y: box.y + 300 + dy, id: 1 },
        { x: box.x + 260 + dx, y: box.y + 300 + dy, id: 2 }
      ];
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [at(0, 0)[0]]
      });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0, 0) });
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: at(-10 * i, -20 * i)
        });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

      await expect
        .poll(async () => (await state()).scroll.sheetViewStartRow)
        .toBeGreaterThan(before.scroll.sheetViewStartRow);
      const after = await state();
      expect(after.scroll.sheetViewStartColumn).toBeGreaterThanOrEqual(
        before.scroll.sheetViewStartColumn
      );
      expect(after.editing).toBe(false);
      // A single cell, not a range dragged out by the first finger.
      expect(after.range).toMatch(/^[A-Z]+\d+$/);

      // Spreading the two fingers zooms the grid in.
      const pinch = (spread: number) => [
        { x: box.x + 190 - spread, y: box.y + 300, id: 1 },
        { x: box.x + 190 + spread, y: box.y + 300, id: 2 }
      ];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pinch(40) });
      for (let spread = 50; spread <= 120; spread += 10) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: pinch(spread)
        });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect
        .poll(() =>
          page.evaluate(() =>
            (window as any).__UNIVER_TABLE_API__.getActiveWorkbook().getActiveSheet().getZoom()
          )
        )
        .toBeGreaterThan(1.5);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('desktop uses the same full-screen shell', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-shell-desktop',
      sections: [{ type: 'wysiwyg', content: '<p>desk</p>', sequence: 10 }]
    });
    try {
      await page.goto(`/app/sections/${tree.sections[0].id}`);
      await expect(page.getByTestId('wysiwyg-content')).toContainText('desk');
      await expect(page.getByTestId('editor-shell')).toBeVisible();
      const body = await page.getByTestId('editor-body').boundingBox();
      expect(body!.width).toBeGreaterThanOrEqual(1279);
      // Escape still saves & closes on desktop.
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('editor-shell')).toHaveCount(0);
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
