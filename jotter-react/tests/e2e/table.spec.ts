import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionContent, gotoAppForSeeding, seedTree } from './helpers';

// A minimal valid Univer workbook snapshot with a single cell (A1) value.
function workbook(a1: string): string {
  return JSON.stringify({
    id: 'wb-e2e',
    name: 'e2e',
    sheetOrder: ['s1'],
    sheets: {
      s1: { id: 's1', name: 'Sheet1', cellData: { 0: { 0: { v: a1 } } } }
    }
  });
}

test.describe('table section', () => {
  test('create a Table section mounts the spreadsheet editor', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { collectionName: 'e2e-table-create' });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await page.getByRole('button', { name: 'Table', exact: true }).click();

      // The code-split Univer editor mounts and finishes loading.
      await expect(page.getByTestId('table-editor')).toBeVisible();
      await expect(page.getByText('Loading spreadsheet…')).toHaveCount(0, { timeout: 15000 });
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('the card preview renders the workbook cells', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-table-preview',
      sections: [
        {
          type: 'table',
          content: JSON.stringify({
            sheetOrder: ['s1'],
            sheets: {
              s1: {
                id: 's1',
                name: 'Sheet1',
                cellData: { 0: { 0: { v: 'Region' }, 1: { v: 'Sales' } }, 1: { 0: { v: 'West' } } }
              }
            }
          }),
          sequence: 10
        }
      ]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const card = page.getByTestId('section-card');
      // The preview is a plain HTML table (no Univer) showing the cell values.
      await expect(card.locator('table')).toBeVisible();
      await expect(card.getByText('Region', { exact: true })).toBeVisible();
      await expect(card.getByText('Sales', { exact: true })).toBeVisible();
      await expect(card.getByText('West', { exact: true })).toBeVisible();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('edits round-trip through the workbook snapshot on save', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-table-edit',
      sections: [{ type: 'table', content: workbook('seeded'), sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      await expect(page.getByTestId('table-editor')).toBeVisible();
      await expect(page.getByText('Loading spreadsheet…')).toHaveCount(0, { timeout: 15000 });

      // Drive a real edit through the Univer Facade (the grid is canvas-rendered, so simulated
      // keystrokes are racy). Set B2 — this dispatches a MUTATION, which the editor serializes
      // to the section's `content` via onChange.
      await expect
        .poll(() => page.evaluate(() => '__UNIVER_TABLE_API__' in window), { timeout: 10000 })
        .toBe(true);
      await page.evaluate(() => {
        const api = (window as unknown as { __UNIVER_TABLE_API__: any }).__UNIVER_TABLE_API__;
        api.getActiveWorkbook().getActiveSheet().getRange(1, 1).setValue('e2e_typed');
      });

      // The editor debounces onChange; wait for the edit to land in the draft before saving so
      // buildUpdates() reads the live snapshot (not the pre-edit content).
      await expect
        .poll(() => page.evaluate((id) => localStorage.getItem(`draft_${id}`) ?? '', sectionId), {
          timeout: 10000
        })
        .toContain('e2e_typed');

      await page.getByRole('button', { name: 'Save', exact: true }).click();

      // Persisted content is the normalized Univer snapshot JSON, with both the seeded and the
      // newly-edited cell — proving the load → mutate → save() round-trip end to end.
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('e2e_typed');
      expect(await fetchSectionContent(page, sectionId)).toContain('seeded');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
