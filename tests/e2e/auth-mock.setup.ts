import { test as setup } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth';

const authFile = 'playwright/.auth/mock-user.json';

/**
 * Mock auth setup - bypasses Google OAuth for automated testing
 *
 * This injects real Supabase session tokens from .env.test into localStorage,
 * bypassing the Google OAuth login flow while maintaining real Supabase auth.
 *
 * No manual login required - fully automated and fast.
 */

setup('mock authentication', async ({ page }) => {
  console.log('🔐 Setting up mock authentication...');

  // Use mock auth helper (sets test mode flag)
  await mockAuth(page);

  // Verify we can access the app by checking for the Jotter header (exists on all authenticated pages)
  try {
    // Wait for network to settle first
    await page.waitForLoadState('networkidle');

    // Look for Jotter header which exists on any authenticated page
    const jotterHeader = page.locator('h1:has-text("Jotter")');
    await jotterHeader.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✓ Mock authentication successful - app loaded');
  } catch (error) {
    console.error('❌ Mock auth failed - app did not load');
    console.error('Check that TEST_ACCESS_TOKEN and TEST_REFRESH_TOKEN are valid in .env.test');
    throw error;
  }

  // Save the mock authenticated state
  await page.context().storageState({ path: authFile });
  console.log(`✓ Mock auth state saved to ${authFile}`);
});
