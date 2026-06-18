import { test, expect } from '@playwright/test';

test.describe('authenticated header', () => {
  test('user menu opens, links to settings, and back', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/app');
    await page.locator('button[aria-haspopup="true"]').click();
    await expect(page.getByText('Manage Collections')).toBeVisible();

    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/app\/settings/);
    await expect(page.getByText('User preferences coming soon.')).toBeVisible();

    await page.getByRole('link', { name: '← Back to Notes' }).click();
    await expect(page).toHaveURL(/\/app$/);
  });
});

test.describe('logged out', () => {
  // Drop the authenticated storage state for this group → the app shows the landing page.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('landing page shows the sign-in options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try Without Account' })).toBeVisible();
    await expect(page.getByText('Built for developers')).toBeVisible();
  });

  test('demo mode enters the app without an account', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try Without Account' }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByText(/\d+ collection\(s\)/)).toBeVisible();
  });
});
