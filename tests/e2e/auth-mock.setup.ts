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

  // Verify we can access the app by checking for collections heading or create button
  try {
    await page.waitForSelector('h1:has-text("My Collections"), button:has-text("Create New Collection")', {
      timeout: 10000
    });
    console.log('✓ Mock authentication successful - collections page loaded');
  } catch (error) {
    console.error('❌ Mock auth failed - app did not load collections page');
    console.error('Check that TEST_ACCESS_TOKEN and TEST_REFRESH_TOKEN are valid in .env.test');
    throw error;
  }

  // Save the mock authenticated state
  await page.context().storageState({ path: authFile });
  console.log(`✓ Mock auth state saved to ${authFile}`);
});
