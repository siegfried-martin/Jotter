import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

// Skip this test by default - it requires manual OAuth login
// Run manually with: npx playwright test --project=oauth-setup
setup.skip('authenticate with Google', async ({ page }) => {
  console.log('🔐 Starting Google OAuth authentication...');

  // Navigate to login page
  await page.goto('/');

  // Click the Google sign-in button
  const signInButton = page.locator('button:has-text("Continue with Google")');

  await expect(signInButton).toBeVisible({ timeout: 10000 });
  console.log('✓ Found sign-in button');

  // Note: This will open Google's OAuth page
  // You'll need to complete the login manually on FIRST run
  // After that, the auth state will be saved and reused

  await signInButton.click();

  // Wait for Google OAuth redirect and successful login
  // Adjust timeout if needed (Google OAuth can be slow)
  await page.waitForURL('**/app/**', { timeout: 60000 });
  console.log('✓ Successfully authenticated and redirected to app');

  // Verify we're actually logged in by checking for user-specific content
  await expect(page.locator('[data-collection-id], .collection-card, .container-list')).toBeVisible({ timeout: 10000 });
  console.log('✓ User content loaded - authentication successful');

  // Save signed-in state to reuse in all tests
  await page.context().storageState({ path: authFile });
  console.log(`✓ Authentication state saved to ${authFile}`);
});
