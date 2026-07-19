import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  cleanup,
  fetchChecklistTexts,
  fetchContainerCollectionId,
  fetchContainerOrder,
  fetchSectionContainerId,
  fetchSectionOrder,
  gotoAppForSeeding,
  readDomOrder,
  seedContainer,
  seedTree
} from './helpers';

// DnD reorders are driven through the KeyboardSensor (Space = pick up / drop, Arrow =
// move): deterministic and reliable in CI, and it doubles as the accessibility path.
// Cross-zone moves (onto a note / a collection tab) need real pointer movement.
//
// Viewport is 900px: ≥ md (768) so DnD is enabled and grip handles show, but < lg
// (1024) so the section grid is a single column — making ArrowDown deterministic.
test.use({ viewport: { width: 900, height: 800 } });

/** Mouse-drag the handle's element onto the target element (dnd-kit PointerSensor). */
async function pointerDrag(page: Page, handle: Locator, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await handle.scrollIntoViewIfNeeded();
  const h = await handle.boundingBox();
  const t = await target.boundingBox();
  if (!h || !t) throw new Error('missing bounding box for drag');

  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  // Exceed the 8px activation distance, then travel to the target in steps.
  await page.mouse.move(h.x + h.width / 2 + 15, h.y + h.height / 2 + 15, { steps: 5 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 3 });
  await page.mouse.up();
}

test.describe('drag-and-drop', () => {
  test('checklist items reorder via keyboard drag', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [
        {
          type: 'checklist',
          checklistData: [
            { text: 'Alpha', checked: false },
            { text: 'Beta', checked: false },
            { text: 'Gamma', checked: false }
          ],
          sequence: 10
        }
      ]
    });
    try {
      await page.goto(
        `/app/collections/${tree.collectionId}/containers/${tree.containerId}/sections/${tree.sections[0].id}`
      );
      const handles = page.getByRole('button', { name: 'Drag to reorder' });
      await expect(handles.first()).toBeVisible();

      await handles.first().focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(150);
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);

      await expect(page.locator('input[placeholder="Enter task..."]').first()).toHaveValue('Beta');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() => fetchChecklistTexts(page, tree.sections[0].id))
        .toEqual(['Beta', 'Alpha', 'Gamma']);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('section cards reorder within a container via pointer drag', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [
        { type: 'code', content: 'one', sequence: 10 },
        { type: 'code', content: 'two', sequence: 20 },
        { type: 'code', content: 'three', sequence: 30 }
      ]
    });
    const [s1, s2, s3] = tree.sections.map((s) => s.id);
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await expect(page.getByTestId('section-card')).toHaveCount(3);

      // Drag the first card onto the second → first lands after it: [s2, s1, s3].
      const cards = page.getByTestId('section-card');
      await pointerDrag(page, cards.nth(0), cards.nth(1));

      await expect.poll(() => readDomOrder(page, 'data-section-id')).toEqual([s2, s1, s3]);
      await expect.poll(() => fetchSectionOrder(page, tree.containerId)).toEqual([s2, s1, s3]);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('typing Space while renaming a section card does not start a drag', async ({ page }) => {
    // Regression: the card root carries dnd-kit's listeners, so Space in the inline
    // rename input used to bubble to the KeyboardSensor activator and pick the card up.
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      sections: [
        { type: 'code', content: 'one', title: 'first', sequence: 10 },
        { type: 'code', content: 'two', title: 'second', sequence: 20 }
      ]
    });
    const [s1, s2] = tree.sections.map((s) => s.id);
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await expect(page.getByTestId('section-card')).toHaveCount(2);

      // Open the rename input on the first card and type a title containing spaces.
      await page.getByText('first', { exact: true }).click();
      const input = page.getByTestId('section-card').first().locator('input');
      await expect(input).toBeVisible();
      await input.pressSequentially('my new title', { delay: 20 });
      await input.press('Enter');

      // The rename stuck (spaces included) and the card order never changed.
      await expect(page.getByText('my new title', { exact: true })).toBeVisible();
      await expect.poll(() => readDomOrder(page, 'data-section-id')).toEqual([s1, s2]);
      await expect.poll(() => fetchSectionOrder(page, tree.containerId)).toEqual([s1, s2]);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('containers reorder in the sidebar via keyboard', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, { containerTitle: 'e2e-c1', containerSequence: 10 });
    const c2 = await seedContainer(page, tree.collectionId, 'e2e-c2', 20);
    const c3 = await seedContainer(page, tree.collectionId, 'e2e-c3', 30);
    try {
      await page.goto(`/app/collections/${tree.collectionId}`);
      await expect(page.getByTestId('container-item')).toHaveCount(3);

      const handle = page.getByRole('button', { name: 'Drag note' }).first();
      await handle.focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(150);
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);

      await expect
        .poll(() => fetchContainerOrder(page, tree.collectionId))
        .toEqual([c2, tree.containerId, c3]);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('drag a section onto another note moves it there', async ({ page }) => {
    await gotoAppForSeeding(page);
    const tree = await seedTree(page, {
      containerTitle: 'e2e-src',
      sections: [{ type: 'code', content: 'movable', sequence: 10 }]
    });
    const dest = await seedContainer(page, tree.collectionId, 'e2e-dest', 20);
    const sectionId = tree.sections[0].id;
    try {
      await page.goto(`/app/collections/${tree.collectionId}/containers/${tree.containerId}`);
      await expect(page.getByTestId('section-card')).toHaveCount(1);

      await pointerDrag(
        page,
        page.getByTestId('section-card').first(),
        page.locator(`[data-container-id="${dest}"]`)
      );

      await expect.poll(() => fetchSectionContainerId(page, sectionId)).toBe(dest);
    } finally {
      await cleanup(page, tree.collectionId);
    }
  });

  test('drag a section onto a collection tab moves it to that collection top note', async ({
    page
  }) => {
    await gotoAppForSeeding(page);
    const a = await seedTree(page, {
      collectionName: 'e2e-dndA',
      containerTitle: 'a1',
      sections: [{ type: 'code', content: 'x', sequence: 10 }]
    });
    const b = await seedTree(page, { collectionName: 'e2e-dndB', containerTitle: 'b1' });
    const sectionId = a.sections[0].id;
    try {
      await page.goto(`/app/collections/${a.collectionId}/containers/${a.containerId}`);
      await pointerDrag(
        page,
        page.getByTestId('section-card').first(),
        page.getByRole('link', { name: 'e2e-dndB', exact: true })
      );

      await expect.poll(() => fetchSectionContainerId(page, sectionId)).toBe(b.containerId);
    } finally {
      await cleanup(page, a.collectionId);
      await cleanup(page, b.collectionId);
    }
  });

  test('drag a note onto a collection tab moves it to that collection', async ({ page }) => {
    await gotoAppForSeeding(page);
    const a = await seedTree(page, { collectionName: 'e2e-dndA2', containerTitle: 'a1' });
    const b = await seedTree(page, { collectionName: 'e2e-dndB2', containerTitle: 'b1' });
    try {
      await page.goto(`/app/collections/${a.collectionId}/containers/${a.containerId}`);
      const handle = page.getByRole('button', { name: 'Drag note' }).first();
      await pointerDrag(page, handle, page.getByRole('link', { name: 'e2e-dndB2', exact: true }));

      await expect.poll(() => fetchContainerCollectionId(page, a.containerId)).toBe(b.collectionId);
    } finally {
      await cleanup(page, a.collectionId);
      await cleanup(page, b.collectionId);
    }
  });
});
