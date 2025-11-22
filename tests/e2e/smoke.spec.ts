import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Jotter/i);
  });

  test('should redirect to login when accessing /app without auth', async ({ page }) => {
    await page.goto('/app');
    // Should redirect to landing page (/)
    await expect(page).toHaveURL('/');
  });
});
