import { Page, expect } from '@playwright/test';

/**
 * Authentication is handled globally via auth.setup.ts
 * All tests automatically use the saved Google OAuth session
 *
 * If you need to re-authenticate:
 * 1. Delete playwright/.auth/user.json
 * 2. Run: npx playwright test --project=setup
 * 3. Complete Google OAuth flow in the browser
 */

/**
 * Helper to verify user is authenticated (useful for test assertions)
 */
export async function expectAuthenticated(page: Page) {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app/);
  // Verify user-specific content is visible
  await expect(page.locator('[data-collection-id], .collection-card, .container-list')).toBeVisible({ timeout: 10000 });
}

/**
 * Helper to wait for app to fully load after navigation
 */
export async function waitForAppReady(page: Page) {
  // Wait for collections to load
  await page.waitForSelector('[data-collection-id], .collection-card', { timeout: 10000 });
  // Wait for any loading spinners to disappear
  await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 5000 }).catch(() => {
    // Spinner might not exist, that's fine
  });
}
