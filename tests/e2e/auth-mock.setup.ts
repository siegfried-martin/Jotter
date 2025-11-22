import { test as setup } from '@playwright/test';
import { mockAuth } from './helpers/mock-auth';

const authFile = 'playwright/.auth/mock-user.json';

/**
 * Mock auth setup - bypasses Google OAuth for automated testing
 *
 * This uses environment variables or mock tokens to create a fake session.
 * Much faster than real OAuth and doesn't require manual interaction.
 *
 * To use real tokens:
 * 1. Log in manually once
 * 2. Run: npx playwright test tests/e2e/extract-tokens.spec.ts
 * 3. Copy tokens to .env.test
 */

setup('mock authentication', async ({ page }) => {
  console.log('🔐 Setting up mock authentication...');

  // Use mock auth helper
  await mockAuth(page);

  // Verify we can access the app
  try {
    await page.waitForSelector('[data-collection-id], .collection-card, .container-list', {
      timeout: 10000
    });
    console.log('✓ Mock authentication successful');
  } catch (error) {
    console.error('❌ Mock auth failed - app did not load user content');
    console.error('Make sure TEST_ACCESS_TOKEN and TEST_REFRESH_TOKEN are set in .env.test');
    throw error;
  }

  // Save the mock authenticated state
  await page.context().storageState({ path: authFile });
  console.log(`✓ Mock auth state saved to ${authFile}`);
});
