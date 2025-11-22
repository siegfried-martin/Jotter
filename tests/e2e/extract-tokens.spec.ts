import { test } from '@playwright/test';
import { extractRealAuthTokens } from './helpers/mock-auth';

/**
 * One-time helper to extract real auth tokens for testing
 *
 * Usage:
 * 1. Make sure you're logged in to the app manually in your browser
 * 2. Run: npx playwright test tests/e2e/extract-tokens.spec.ts --headed
 * 3. Copy the tokens from console output to .env.test
 */

test.skip('extract auth tokens from real session', async ({ page }) => {
  console.log('🔐 Extracting real auth tokens...');
  console.log('Please log in manually when the browser opens');

  await page.goto('/');

  // Wait for user to log in
  await page.waitForURL('/app/**', { timeout: 120000 });

  // Extract tokens
  await extractRealAuthTokens(page);

  // Keep browser open so user can see the output
  await page.pause();
});
