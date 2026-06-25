import { test, expect } from '@playwright/test';
import { cleanup, gotoAppForSeeding, seedTree } from './helpers';

// Desktop-only fullscreen / focus mode for the section editor: the modal expands to the
// viewport and the header+footer collapse into one auto-hiding "chrome" overlay, revealed by
// the edge tabs and dismissed by a body click or Escape. The default Playwright project runs
// a desktop viewport (1280px), so the toggle is available.

test.describe('fullscreen focus mode', () => {
  async function openSection(page: import('@playwright/test').Page) {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-fullscreen',
      sections: [{ type: 'markdown', content: 'Hello', title: 'Doc', sequence: 10 }]
    });
    await page.goto(`/app/sections/${tree.sections[0].id}`);
    await expect(page.getByTestId('editor-body')).toBeVisible();
    await expect(page.getByTestId('fullscreen-toggle')).toBeVisible();
    return tree;
  }

  test('toggling enters fullscreen with chrome hidden; edge tabs reveal it', async ({ page }) => {
    const tree = await openSection(page);
    try {
      // Windowed by default — no fullscreen box, no edge tabs.
      await expect(page.locator('[data-fullscreen="true"]')).toHaveCount(0);
      await expect(page.getByTestId('chrome-tab-top')).toHaveCount(0);

      await page.getByTestId('fullscreen-toggle').click();

      // Fullscreen on, chrome auto-hidden → both edge tabs show.
      await expect(page.locator('[data-fullscreen="true"]')).toBeVisible();
      await expect(page.getByTestId('chrome-tab-top')).toBeVisible();
      await expect(page.getByTestId('chrome-tab-bottom')).toBeVisible();

      // Reveal the chrome via the top tab → tabs disappear and the title is editable again.
      await page.getByTestId('chrome-tab-top').click();
      await expect(page.getByTestId('chrome-tab-top')).toHaveCount(0);
      await page.getByPlaceholder('Untitled section').fill('Renamed');
      await expect(page.getByPlaceholder('Untitled section')).toHaveValue('Renamed');

      // Clicking back on the body dismisses the chrome → the tabs return.
      await page.getByTestId('editor-body').click();
      await expect(page.getByTestId('chrome-tab-top')).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('Escape steps down: chrome → fullscreen → close', async ({ page }) => {
    const tree = await openSection(page);
    try {
      await page.getByTestId('fullscreen-toggle').click();
      await page.getByTestId('chrome-tab-top').click(); // reveal chrome
      await expect(page.getByTestId('chrome-tab-top')).toHaveCount(0);

      // First Escape only hides the chrome (still fullscreen).
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('chrome-tab-top')).toBeVisible();
      await expect(page.locator('[data-fullscreen="true"]')).toBeVisible();

      // Second Escape exits fullscreen back to the windowed modal (still open).
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-fullscreen="true"]')).toHaveCount(0);
      await expect(page.getByTestId('editor-body')).toBeVisible();

      // Third Escape closes the modal.
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('editor-body')).toHaveCount(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('Ctrl+S saves and closes even with the chrome hidden', async ({ page }) => {
    const tree = await openSection(page);
    try {
      await page.getByTestId('fullscreen-toggle').click();
      await expect(page.getByTestId('chrome-tab-top')).toBeVisible(); // chrome hidden

      await page.keyboard.press('Control+s');
      await expect(page.getByTestId('editor-body')).toHaveCount(0); // modal closed
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
