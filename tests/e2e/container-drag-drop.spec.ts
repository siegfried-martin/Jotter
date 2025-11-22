import { test, expect } from '@playwright/test';

// This test verifies BUG-DRAG-001 fix: Container drag & drop persistence
test.describe('Container Drag & Drop', () => {
  test.skip('should persist container reorder after drag and drop', async ({ page }) => {
    // TODO: This test requires authentication setup
    // Navigate to app
    await page.goto('/app');

    // Wait for containers to load
    await page.waitForSelector('[data-container-id]');

    // Get initial container order
    const initialContainers = await page.$$('[data-container-id]');
    const initialIds = await Promise.all(
      initialContainers.map(el => el.getAttribute('data-container-id'))
    );

    // Drag first container to third position
    const firstContainer = initialContainers[0];
    const thirdContainer = initialContainers[2];

    await firstContainer.hover();
    await page.mouse.down();
    await thirdContainer.hover();
    await page.mouse.up();

    // Wait for API call to complete
    await page.waitForResponse(response =>
      response.url().includes('note_container') && response.request().method() === 'PATCH'
    );

    // Verify new order in UI
    const reorderedContainers = await page.$$('[data-container-id]');
    const reorderedIds = await Promise.all(
      reorderedContainers.map(el => el.getAttribute('data-container-id'))
    );

    // First container should now be at index 2
    expect(reorderedIds[2]).toBe(initialIds[0]);

    // Refresh page
    await page.reload();

    // Wait for containers to load again
    await page.waitForSelector('[data-container-id]');

    // Verify order persists after refresh
    const persistedContainers = await page.$$('[data-container-id]');
    const persistedIds = await Promise.all(
      persistedContainers.map(el => el.getAttribute('data-container-id'))
    );

    expect(persistedIds).toEqual(reorderedIds);
  });
});
