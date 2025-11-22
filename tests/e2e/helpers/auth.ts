import { Page } from '@playwright/test';

/**
 * Helper to login with test credentials
 * TODO: Set up test account in Supabase and add credentials
 */
export async function login(page: Page, email?: string, password?: string) {
  const testEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = password || process.env.TEST_USER_PASSWORD || 'testpassword';

  await page.goto('/');
  // TODO: Implement actual login flow when auth UI is identified
  await page.fill('[name="email"]', testEmail);
  await page.fill('[name="password"]', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('/app/**');
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/app');
  const url = page.url();
  return url.includes('/app');
}
