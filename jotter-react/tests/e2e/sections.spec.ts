import { test, expect } from '@playwright/test';
import { cleanup, fetchSectionTitle, gotoAppForSeeding, readDomOrder, seedTree } from './helpers';

test.describe('sections', () => {
  test('the type pill doubles as an editable title', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [{ type: 'code', content: 'x', sequence: 10 }]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const card = page.getByTestId('section-card');
      // Untitled → the pill shows the type name.
      await expect(card.getByText('Code', { exact: true })).toBeVisible();

      // Click the pill → edit, type a title (persists, shows instead of the type).
      await card.getByText('Code', { exact: true }).click();
      const input = card.getByRole('textbox');
      await input.fill('Auth flow');
      await input.press('Enter');
      await expect(card.getByText('Auth flow')).toBeVisible();
      await expect.poll(() => fetchSectionTitle(page, tree.sections[0].id)).toBe('Auth flow');

      // Clearing the title falls back to the type again.
      await card.getByText('Auth flow').click();
      await card.getByRole('textbox').fill('');
      await card.getByRole('textbox').press('Enter');
      await expect(card.getByText('Code', { exact: true })).toBeVisible();
      await expect.poll(() => fetchSectionTitle(page, tree.sections[0].id)).toBeNull();
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('render in ascending sequence order', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [
        { type: 'code', content: 'first by id, last by seq', sequence: 30 },
        { type: 'wysiwyg', content: '<p>second</p>', sequence: 10 },
        { type: 'checklist', checklistData: [{ text: 'a task', checked: false }], sequence: 20 }
      ]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await expect(page.getByTestId('section-card').first()).toBeVisible();

      const order = await readDomOrder(page, 'data-section-id');
      const bySeq = [...tree.sections].sort((a, b) => a.sequence - b.sequence).map((s) => s.id);
      expect(order).toEqual(bySeq);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  for (const label of ['Text', 'Code', 'Draw', 'Tasks', 'Table']) {
    test(`create a ${label} section opens the editor and persists a card`, async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page);
      try {
        await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
        await page.getByRole('button', { name: label, exact: true }).click();

        const titleInput = page.getByPlaceholder('Untitled section');
        await expect(titleInput).toBeVisible();
        await titleInput.fill(`e2e ${label} title`);
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await expect(page.getByTestId('section-card')).toHaveCount(1);
        await expect(page.getByText(`e2e ${label} title`)).toBeVisible();
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });
  }

  test('delete a section via the ⋮ menu (confirm dialog)', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [{ type: 'code', content: 'content worth confirming', sequence: 10 }]
    });
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      const card = page.getByTestId('section-card');
      await expect(card).toHaveCount(1);

      await card.getByRole('button', { name: 'More actions' }).click();
      page.once('dialog', (d) => d.accept()); // has content → confirm
      await page.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page.getByTestId('section-card')).toHaveCount(0);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test.describe('clipboard', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    const readClipboard = (page: import('@playwright/test').Page) =>
      page.evaluate(() => navigator.clipboard.readText());

    const openCardMenu = (page: import('@playwright/test').Page) =>
      page.getByTestId('section-card').getByRole('button', { name: 'More actions' }).click();

    test('code: "Copy" puts the raw code on the clipboard', async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page, {
        sections: [{ type: 'code', content: 'copy this code', sequence: 10 }]
      });
      try {
        await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
        await openCardMenu(page);
        // Code has no markdown variant — only the native "Copy".
        await expect(page.getByRole('button', { name: 'Copy as Markdown' })).toHaveCount(0);
        await page.getByRole('button', { name: 'Copy', exact: true }).click();
        await expect(page.getByText('Copied to clipboard')).toBeVisible();
        expect(await readClipboard(page)).toBe('copy this code');
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });

    test('checklist: "Copy as Markdown" produces a GFM task list', async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page, {
        sections: [
          {
            type: 'checklist',
            checklistData: [
              { text: 'first', checked: true },
              { text: 'second', checked: false }
            ],
            sequence: 10
          }
        ]
      });
      try {
        await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
        await openCardMenu(page);
        await page.getByRole('button', { name: 'Copy as Markdown' }).click();
        await expect(page.getByText('Copied as Markdown')).toBeVisible();
        expect(await readClipboard(page)).toBe('- [x] first\n- [ ] second');
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });

    test('markdown: "Copy as Markdown" copies the raw source', async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page, {
        sections: [{ type: 'markdown', content: '# Hi\n\n- a\n- b', sequence: 10 }]
      });
      try {
        await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
        await openCardMenu(page);
        // Markdown offers both; assert the raw-source ("Copy as Markdown") path.
        await page.getByRole('button', { name: 'Copy as Markdown' }).click();
        await expect(page.getByText('Copied as Markdown')).toBeVisible();
        expect(await readClipboard(page)).toBe('# Hi\n\n- a\n- b');
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });

    test('editor modal: copy grabs live, unsaved edits', async ({ page }) => {
      await gotoAppForSeeding(page);
      const tree = await seedTree(page, {
        sections: [{ type: 'markdown', content: 'seed', sequence: 10 }]
      });
      try {
        await page.goto(`/app/sections/${tree.sections[0].id}`);
        await expect(page.locator('.cm-content')).toContainText('seed');
        // Edit without saving, then copy from the modal footer — it must reflect the
        // on-screen (live Y.Text) content, not the last-saved version.
        await page.locator('.cm-content').click();
        await page.keyboard.press('Control+End');
        await page.keyboard.type(' EXTRA', { delay: 30 });
        await page.getByRole('button', { name: 'Copy as Markdown' }).click();
        await expect(page.getByText('Copied as Markdown')).toBeVisible();
        expect(await readClipboard(page)).toBe('seed EXTRA');
      } finally {
        await cleanup(page, tree.collectionId);
      }
    });
  });
});
