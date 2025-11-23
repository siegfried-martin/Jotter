import { test, expect } from '@playwright/test';

// This test verifies BUG-DRAG-001 fix: Container drag & drop persistence
test.describe('Container Drag & Drop', () => {
  test('should persist container reorder after drag and drop', async ({ page }) => {
    // Authentication is handled by setup project
    // Navigate to app
    await page.goto('/app');
    console.log('📍 On /app page');

    // Wait for collections to load and click the first one
    await page.waitForSelector('h1:has-text("My Collections")');
    console.log('✓ Collections page loaded');

    // Find and log all collection buttons
    const collectionButtons = await page.$$('button:has-text("Click to open collection")');
    console.log(`📋 Found ${collectionButtons.length} collection button(s)`);

    if (collectionButtons.length === 0) {
      console.log('❌ No collection buttons found - skipping test');
      test.skip();
      return;
    }

    const firstCollection = page.locator('button:has-text("Click to open collection")').first();
    await firstCollection.click();
    console.log('🖱️  Clicked first collection');

    // Wait for navigation and log URL
    await page.waitForURL(/\/app\/collections\/.+/, { timeout: 10000 });
    console.log(`📍 Navigated to: ${page.url()}`);

    // Wait for collection page to load and containers sidebar to appear
    await page.waitForSelector('[data-container-id]', { timeout: 10000 });
    console.log('✓ Containers loaded');

    // Get initial container order
    const initialContainers = await page.$$('[data-container-id]');
    const initialIds = await Promise.all(
      initialContainers.map(el => el.getAttribute('data-container-id'))
    );

    // Skip test if there aren't enough containers
    if (initialContainers.length < 3) {
      console.log(`⚠️ Skipping test - only ${initialContainers.length} container(s), need at least 3`);
      test.skip();
      return;
    }

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
