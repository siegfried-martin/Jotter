/**
 * Playwright Test Fixtures
 *
 * Custom fixtures that extend Playwright's base test to provide
 * shared test resources like collections, containers, and sections.
 *
 * Worker-scoped fixtures run once per worker process:
 * - Setup runs before any tests in the worker
 * - Teardown runs after all tests in the worker complete
 *
 * This avoids the 12 collection limit by sharing collections across tests.
 *
 * @example
 * // In your test file:
 * import { test, expect } from '../fixtures';
 *
 * test('my test', async ({ page, sharedCollection }) => {
 *   // sharedCollection.id and sharedCollection.name are available
 *   await page.goto(`/app/collections/${sharedCollection.id}`);
 * });
 */

import { test as base, expect, type Page, type Browser } from '@playwright/test';
import { generateTestName, wait, cleanupTestCollection } from './helpers/test-data';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * Represents a test collection with its ID and name
 */
export interface TestCollection {
	id: string;
	name: string;
}

/**
 * Represents a test container within a collection
 */
export interface TestContainer {
	id: string;
	collectionId: string;
}

/**
 * Represents a test section within a container
 */
export interface TestSection {
	id: string;
	containerId: string;
	type: 'note' | 'code' | 'checklist';
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Creates a new collection via the UI and returns its ID and name.
 */
export async function createCollection(page: Page, suffix?: string): Promise<TestCollection> {
	const collectionName = generateTestName(suffix || 'collection');

	// Navigate to collections page (use full URL for worker fixture pages)
	const baseURL = 'http://localhost:5174';
	await page.goto(`${baseURL}/app`);
	await page.waitForLoadState('networkidle');

	// Wait for page to load
	await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });

	// Click create button
	const createButton = page.locator('button:has-text("Create New Collection")');
	await createButton.waitFor({ state: 'visible', timeout: 10000 });
	await createButton.click();
	await wait(300);

	// Fill in collection name
	const nameInput = page.locator('input[placeholder="Collection name"]');
	await nameInput.fill(collectionName);

	// Submit
	const submitButton = page.locator('button:has-text("Create Collection")');
	await submitButton.click();
	await wait(2000);

	// Extract collection ID from URL
	const url = page.url();
	const collectionMatch = url.match(/\/app\/collections\/([a-f0-9-]+)/);
	if (!collectionMatch) {
		throw new Error(`Failed to create collection - URL: ${url}`);
	}

	const collectionId = collectionMatch[1];
	console.log(`✅ Created collection: ${collectionName} (ID: ${collectionId})`);

	return { id: collectionId, name: collectionName };
}

/**
 * Deletes a collection via the UI.
 */
export async function deleteCollection(page: Page, collection: TestCollection): Promise<void> {
	// Navigate to collections page first (use full URL for worker fixture pages)
	const baseURL = 'http://localhost:5174';
	await page.goto(`${baseURL}/app`);
	await page.waitForLoadState('networkidle');
	await cleanupTestCollection(page, collection.name);
}

/**
 * Creates a new container within a collection using keyboard shortcut.
 */
export async function createContainer(page: Page, collectionId: string): Promise<TestContainer> {
	const baseURL = 'http://localhost:5174';

	// Navigate to collection if not already there
	if (!page.url().includes(`/collections/${collectionId}`)) {
		await page.goto(`${baseURL}/app/collections/${collectionId}`);
		await page.waitForLoadState('networkidle');
		await wait(500);
	}

	// Create container using keyboard shortcut
	await page.keyboard.press('Alt+n');
	await wait(2000);

	// Extract container ID from URL
	const containerUrl = page.url();
	const containerMatch = containerUrl.match(/\/containers\/([a-f0-9-]+)/);
	if (!containerMatch) {
		throw new Error(`Failed to create container - URL: ${containerUrl}`);
	}

	const containerId = containerMatch[1];
	console.log(`✅ Created container: ${containerId}`);

	return { id: containerId, collectionId };
}

/**
 * Creates a new section within a container using keyboard shortcut.
 */
export async function createSection(
	page: Page,
	containerId: string,
	type: 'note' | 'code' | 'checklist' = 'note'
): Promise<TestSection> {
	// Navigate to container if not already there
	if (!page.url().includes(`/containers/${containerId}`)) {
		// We need to find the collection ID first or navigate differently
		// For now, assume we're already on the container page
	}

	// Create section using keyboard shortcut based on type
	const shortcuts: Record<string, string> = {
		note: 'Alt+t', // Text/Note section
		code: 'Alt+c', // Code section
		checklist: 'Alt+l' // Checklist section
	};

	await page.keyboard.press(shortcuts[type]);
	await wait(1500);

	// Extract section ID from URL
	const sectionUrl = page.url();
	const sectionMatch = sectionUrl.match(/\/edit\/([a-f0-9-]+)/);
	if (!sectionMatch) {
		throw new Error(`Failed to create section - URL: ${sectionUrl}`);
	}

	const sectionId = sectionMatch[1];
	console.log(`✅ Created ${type} section: ${sectionId}`);

	return { id: sectionId, containerId, type };
}

// ============================================================
// WORKER-SCOPED FIXTURES
// ============================================================

/**
 * Extended test with worker-scoped fixtures for shared test data.
 *
 * Worker fixtures:
 * - sharedCollection: A collection shared across all tests in the worker
 *
 * Test fixtures:
 * - testContainer: Creates a fresh container for each test (optional)
 */
export const test = base.extend<
	// Test-scoped fixtures (per test)
	{
		testContainer: TestContainer;
		testChecklistSection: TestSection;
	},
	// Worker-scoped fixtures (per worker)
	{
		sharedCollection: TestCollection;
	}
>({
	// Worker-scoped: One collection per worker, shared across all tests
	sharedCollection: [
		async ({ browser }, use, workerInfo) => {
			// Setup: Create a collection for this worker
			// Create a new context with the auth state
			const authFile = 'playwright/.auth/mock-user.json';
			const context = await browser.newContext({
				storageState: authFile
			});
			const page = await context.newPage();

			const collection = await createCollection(page, `worker${workerInfo.workerIndex}`);
			await page.close();
			await context.close();

			// Provide the collection to all tests in this worker
			await use(collection);

			// Teardown: Delete the collection after all tests complete
			const cleanupContext = await browser.newContext({
				storageState: authFile
			});
			const cleanupPage = await cleanupContext.newPage();
			await deleteCollection(cleanupPage, collection);
			await cleanupPage.close();
			await cleanupContext.close();
		},
		{ scope: 'worker' }
	],

	// Test-scoped: Fresh container for each test that requests it
	testContainer: async ({ page, sharedCollection }, use) => {
		const container = await createContainer(page, sharedCollection.id);
		await use(container);
		// No cleanup needed - container is deleted with collection
	},

	// Test-scoped: Fresh checklist section for each test that requests it
	testChecklistSection: async ({ page, testContainer }, use) => {
		const section = await createSection(page, testContainer.id, 'checklist');
		await use(section);
		// No cleanup needed - section is deleted with container/collection
	}
});

// Re-export expect for convenience
export { expect };

// ============================================================
// ADDITIONAL TEST UTILITIES
// ============================================================

/**
 * Waits for the app to be fully loaded after navigation.
 */
export async function waitForAppLoaded(page: Page): Promise<void> {
	await page.waitForLoadState('networkidle');
	await wait(500);
}

/**
 * Navigates to a collection and waits for it to load.
 */
export async function navigateToCollection(page: Page, collectionId: string): Promise<void> {
	await page.goto(`/app/collections/${collectionId}`);
	await waitForAppLoaded(page);
}

/**
 * Navigates to a container and waits for it to load.
 */
export async function navigateToContainer(
	page: Page,
	collectionId: string,
	containerId: string
): Promise<void> {
	await page.goto(`/app/collections/${collectionId}/containers/${containerId}`);
	await waitForAppLoaded(page);
}
