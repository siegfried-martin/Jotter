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
