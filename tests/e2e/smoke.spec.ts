import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should redirect authenticated user from landing to app', async ({ page }) => {
    await page.goto('/');
    // Authenticated users should be redirected to /app
    await expect(page).toHaveURL(/\/app/);
  });

  test('should load app page when authenticated', async ({ page }) => {
    await page.goto('/app');
    // Should stay on /app and show collections
    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('h1:has-text("My Collections")')).toBeVisible();
  });
});
