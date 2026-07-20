import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionContent, gotoAppForSeeding, seedTree } from './helpers';

// Text color + highlight (the "Word-like" upgrades from wysiwyg-upgrade.md): applied from
// the toolbar swatch pickers, they must materialize into the saved HTML and survive reopen.
test.describe('wysiwyg color and highlight', () => {
  test('color + highlight apply, save, and survive reopen', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-wys-format',
      sections: [{ type: 'wysiwyg', content: '<p>paint me</p>', sequence: 10 }]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      const editor = page.getByTestId('wysiwyg-content');
      await expect(editor).toContainText('paint me');

      // Select all the text, then apply a text color and a highlight.
      await editor.click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.getByTestId('picker-color').click();
      await page.getByRole('button', { name: 'Text color: Red' }).click();
      await expect(editor.locator('span[style*="color"]')).toContainText('paint me');

      await page.keyboard.press('ControlOrMeta+a');
      await page.getByTestId('picker-highlight').click();
      await page.getByRole('button', { name: 'Highlight: Yellow' }).click();
      await expect(editor.locator('mark')).toContainText('paint me');

      // Save → the materialized HTML carries both.
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('<mark');
      const saved = (await fetchSectionContent(page, sectionId)) ?? '';
      expect(saved).toContain('color');

      // Reopen → formatting still renders (from the CRDT doc, not just the HTML).
      await page.goto(`/app/sections/${sectionId}`);
      const editor2 = page.getByTestId('wysiwyg-content');
      await expect(editor2.locator('mark')).toContainText('paint me');
      await expect(editor2.locator('span[style*="color"]')).toContainText('paint me');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('tables and inline code survive the HTML parse (paste parity) and save', async ({
    page
  }) => {
    // Regression: without the Table schema, <table> HTML (pasted from a rendered markdown
    // preview) silently flattened to paragraphs; inline <code> had no toolbar control.
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      collectionName: 'e2e-wys-table',
      sections: [
        {
          type: 'wysiwyg',
          content:
            '<p>above</p><table><tbody><tr><th>Col A</th><th>Col B</th></tr><tr><td>cell1</td><td>cell2</td></tr></tbody></table><p>codeword here</p>',
          sequence: 10
        }
      ]
    });
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/sections/${sectionId}`);
      const editor = page.getByTestId('wysiwyg-content');
      await expect(editor).toContainText('cell1');

      // The table parsed as a real table, not flattened paragraphs.
      await expect(editor.locator('table')).toHaveCount(1);
      await expect(editor.locator('th')).toHaveCount(2);
      await expect(editor.locator('td', { hasText: 'cell2' })).toBeVisible();

      // Toggle inline code on a word via the toolbar button.
      const word = editor.locator('p', { hasText: 'codeword here' });
      await word.click();
      await page.keyboard.press('Home');
      for (let i = 0; i < 'codeword'.length; i++) await page.keyboard.press('Shift+ArrowRight');
      await page.getByTestId('tool-inline-code').click();
      await expect(editor.locator('code', { hasText: 'codeword' })).toBeVisible();

      // Save → both materialize into the stored HTML.
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchSectionContent(page, sectionId), { timeout: 10000 })
        .toContain('<table');
      expect((await fetchSectionContent(page, sectionId)) ?? '').toContain('<code>codeword</code>');
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });
});
