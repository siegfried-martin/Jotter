/**
 * Error Toast UI E2E Tests
 *
 * Tests for error toast display and dismissal.
 * These tests trigger errors (e.g., long collection names) to verify
 * the error toast functionality.
 *
 * Tests run serially and don't need cleanup since they trigger
 * validation errors that prevent collection creation.
 *
 * @see tests/TEST_COVERAGE_PLAN.md
 */

import { test, expect, type Page } from '@playwright/test';
import { wait } from './helpers/test-data';

const baseURL = 'http://localhost:5174';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Navigate to the collections page and open the create dialog.
 */
async function openCreateCollectionDialog(page: Page): Promise<void> {
	await page.goto(`${baseURL}/app`);
	await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });

	const createButton = page.locator('button:has-text("Create New Collection")');
	await createButton.waitFor({ state: 'visible', timeout: 10000 });
	await createButton.click();
	await wait(300);
}

// ============================================================
// TEST SUITE
// ============================================================

test.describe('Error Toast UI', () => {
	test.describe.configure({ mode: 'serial' });

	test('should show error toast when collection name is too long', async ({ page }) => {
		await openCreateCollectionDialog(page);

		// Create a name that exceeds the 100 character limit
		const longName = 'e2e-test-' + 'a'.repeat(150); // 159 characters, exceeds 100 char limit

		// Fill in the overly long name
		const nameInput = page.locator('input[placeholder="Collection name"]');
		await nameInput.fill(longName);

		// Submit the form
		const submitButton = page.locator('button:has-text("Create Collection")');
		await submitButton.click();

		// Wait for error toast to appear
		await wait(1000);

		// Check for error toast - it should appear with an error message
		const errorToast = page.locator('[role="alert"]');
		await expect(errorToast).toBeVisible({ timeout: 5000 });

		// Verify it contains error-related content (red styling or error message)
		const toastText = await errorToast.textContent();
		expect(toastText).toBeTruthy();

		console.log(`✅ Error toast displayed for long collection name: "${toastText?.substring(0, 50)}..."`);
	});

	test('should dismiss error toast when clicking X button', async ({ page }) => {
		await openCreateCollectionDialog(page);

		// Create a name that exceeds the limit to trigger an error
		const longName = 'e2e-test-' + 'a'.repeat(150);
		const nameInput = page.locator('input[placeholder="Collection name"]');
		await nameInput.fill(longName);

		// Submit the form
		const submitButton = page.locator('button:has-text("Create Collection")');
		await submitButton.click();

		// Wait for error toast to appear
		await wait(1000);

		const errorToast = page.locator('[role="alert"]');
		await expect(errorToast).toBeVisible({ timeout: 5000 });

		// Find and click the dismiss button (X button inside the toast)
		const dismissButton = errorToast.locator('button[aria-label="Dismiss"]');
		await dismissButton.click();

		// Verify toast is dismissed
		await expect(errorToast).not.toBeVisible({ timeout: 3000 });

		console.log('✅ Error toast dismissed successfully');
	});

	test('should auto-dismiss error toast after timeout', async ({ page }) => {
		await openCreateCollectionDialog(page);

		// Create a name that exceeds the limit
		const longName = 'e2e-test-' + 'a'.repeat(150);
		const nameInput = page.locator('input[placeholder="Collection name"]');
		await nameInput.fill(longName);

		// Submit the form
		const submitButton = page.locator('button:has-text("Create Collection")');
		await submitButton.click();

		// Wait for error toast to appear
		await wait(1000);

		const errorToast = page.locator('[role="alert"]');
		await expect(errorToast).toBeVisible({ timeout: 5000 });

		// Wait for auto-dismiss (default is 5 seconds)
		await wait(6000);

		// Verify toast is auto-dismissed
		await expect(errorToast).not.toBeVisible({ timeout: 3000 });

		console.log('✅ Error toast auto-dismissed after timeout');
	});
});
