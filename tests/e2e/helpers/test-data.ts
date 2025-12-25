/**
 * Test Data Utilities
 *
 * Provides helper functions for creating and managing test data in E2E tests.
 * All test resources follow the naming convention: e2e-test-{timestamp}-{random6digit}
 */

/**
 * Generates a unique test resource name following the e2e-test- naming convention.
 *
 * Format: e2e-test-{timestamp}-{random6digit}
 *
 * @param suffix - Optional suffix to append to the name for identification
 * @returns A unique test resource name
 *
 * @example
 * generateTestName('collection') // "e2e-test-1700000000000-847392-collection"
 * generateTestName() // "e2e-test-1700000000000-847392"
 */
export function generateTestName(suffix?: string): string {
	const timestamp = Date.now();
	const random = Math.floor(Math.random() * 1000000)
		.toString()
		.padStart(6, '0');

	const baseName = `e2e-test-${timestamp}-${random}`;
	return suffix ? `${baseName}-${suffix}` : baseName;
}

/**
 * Checks whether test cleanup should be performed.
 *
 * Reads the SKIP_TEST_CLEANUP environment variable.
 * When set to "1", test resources are preserved for debugging.
 *
 * @returns true if cleanup should be performed, false if it should be skipped
 *
 * @example
 * test.afterAll(async () => {
 *   if (shouldCleanup()) {
 *     await deleteTestCollection(testCollectionId);
 *   }
 * });
 */
export function shouldCleanup(): boolean {
	return process.env.SKIP_TEST_CLEANUP !== '1';
}

/**
 * Checks if a resource name is a test resource.
 *
 * @param name - The resource name to check
 * @returns true if the name starts with "e2e-test-"
 *
 * @example
 * isTestResource('e2e-test-1700000000000-847392') // true
 * isTestResource('My Collection') // false
 */
export function isTestResource(name: string): boolean {
	return name.startsWith('e2e-test-');
}

/**
 * Waits for a specified duration.
 * Useful for waiting after actions that trigger async operations.
 *
 * @param ms - Milliseconds to wait
 *
 * @example
 * await wait(1000); // Wait 1 second
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deletes a test collection by navigating to the collections page and using the UI.
 * This ensures proper cleanup between tests to avoid hitting the 12 collection limit.
 *
 * @param page - Playwright page object
 * @param collectionName - The name of the collection to delete
 *
 * @example
 * test.afterAll(async ({ page }) => {
 *   await cleanupTestCollection(page, testCollectionName);
 * });
 */
export async function cleanupTestCollection(
	page: import('@playwright/test').Page,
	collectionName: string
): Promise<void> {
	if (!collectionName || !isTestResource(collectionName)) {
		return;
	}

	try {
		// Use full URL to handle worker fixture pages that don't have baseURL
		const baseURL = 'http://localhost:5174';
		const currentUrl = page.url();

		// Only navigate if not already on collections page
		if (!currentUrl.includes('/app') || currentUrl === 'about:blank') {
			await page.goto(`${baseURL}/app`);
			await page.waitForLoadState('networkidle');
		}
		await wait(500);

		// Find the collection card
		const collectionCard = page.locator(`.group:has-text("${collectionName}")`).first();

		if (await collectionCard.isVisible({ timeout: 3000 }).catch(() => false)) {
			await collectionCard.hover();
			await wait(200);

			// Click delete button
			const deleteButton = collectionCard.locator('button[title="Delete collection"]');
			if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
				await deleteButton.click();
				await wait(300);

				// Confirm deletion
				const confirmButton = page.locator('button:has-text("Delete")').first();
				if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
					await confirmButton.click();
					await wait(500);
					console.log(`🧹 Cleaned up collection: ${collectionName}`);
				}
			}
		}
	} catch (error) {
		// Silently ignore cleanup errors - collection may already be deleted
		console.log(`⚠️ Could not cleanup collection ${collectionName}: ${error}`);
	}
}
