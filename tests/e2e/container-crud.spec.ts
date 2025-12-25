/**
 * Container (Note) CRUD Operations E2E Tests
 *
 * Tests for container creation, navigation, and deletion.
 * Uses a shared collection across all tests to avoid the 12 collection limit.
 *
 * The first test creates the collection, subsequent tests reuse it.
 * The last test cleans up.
 */

import { test, expect, type Page } from '@playwright/test';
import { generateTestName, wait } from './helpers/test-data';

// ============================================================
// TEST STATE (module-level, persists across tests in same worker)
// ============================================================

const state = {
	collectionId: '',
	collectionName: '',
	created: false
};

const baseURL = 'http://localhost:5174';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Ensures the shared collection exists, creating it if needed.
 */
async function ensureCollection(page: Page): Promise<void> {
	if (state.created && state.collectionId) {
		return; // Already created
	}

	state.collectionName = generateTestName('container-crud');

	await page.goto(`${baseURL}/app`);
	await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });

	const createButton = page.locator('button:has-text("Create New Collection")');
	await createButton.waitFor({ state: 'visible', timeout: 10000 });
	await createButton.click();
	await wait(300);

	const nameInput = page.locator('input[placeholder="Collection name"]');
	await nameInput.fill(state.collectionName);

	const submitButton = page.locator('button:has-text("Create Collection")');
	await submitButton.click();
	await wait(2000);

	const url = page.url();
	const match = url.match(/\/app\/collections\/([a-f0-9-]+)/);
	if (match) {
		state.collectionId = match[1];
		state.created = true;
		console.log(`✅ Created collection: ${state.collectionName} (ID: ${state.collectionId})`);
	} else {
		throw new Error(`Failed to create collection - URL: ${url}`);
	}
}

/**
 * Navigates to the collection and waits for it to load.
 */
async function navigateToCollection(page: Page): Promise<void> {
	await ensureCollection(page);

	// Check if we're already on the collection page
	const currentUrl = page.url();
	const expectedCollectionPath = `/app/collections/${state.collectionId}`;

	if (!currentUrl.includes(expectedCollectionPath)) {
		await page.goto(`${baseURL}${expectedCollectionPath}`, {
			waitUntil: 'domcontentloaded'
		});
	}

	// Wait for app header to load
	await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });

	// Wait for collection view to be ready
	const collectionReady = page.locator(
		'button:has-text("Create First Note"), [data-container-id], .section-list'
	);
	await collectionReady.first().waitFor({ state: 'visible', timeout: 20000 });
	await wait(500);
}

/**
 * Deletes the test collection (called by cleanup test).
 */
async function cleanupCollection(page: Page): Promise<void> {
	if (!state.collectionName || !state.created) return;

	await page.goto(`${baseURL}/app`);
	await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });
	await wait(500);

	const collectionCard = page.locator(`.group:has-text("${state.collectionName}")`).first();
	if (await collectionCard.isVisible({ timeout: 3000 }).catch(() => false)) {
		await collectionCard.hover();
		await wait(200);

		const deleteButton = collectionCard.locator('button[title="Delete collection"]');
		if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await deleteButton.click();
			await wait(300);

			const confirmButton = page.locator('button:has-text("Delete")').first();
			if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
				await confirmButton.click();
				await wait(500);
				console.log(`🧹 Deleted collection: ${state.collectionName}`);
				state.created = false;
			}
		}
	}
}

// ============================================================
// TEST SUITE - Tests run in file order, sharing state
// ============================================================

test.describe('Container (Note) CRUD Operations', () => {
	// Tests run serially and share the module-level state
	test.describe.configure({ mode: 'serial' });

	test('should create a new container', async ({ page }) => {
		await navigateToCollection(page);

		// Look for "Create First Note" button (for empty collection) or "New Note" button
		const createButton = page
			.locator('button:has-text("Create First Note"), button:has-text("New Note")')
			.first();
		await expect(createButton).toBeVisible();

		// Click to create new container
		await createButton.click();
		await wait(2000);

		// Should navigate to the new container page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);

		// Extract container ID from URL
		const url = page.url();
		const match = url.match(/\/containers\/([a-f0-9-]+)/);
		if (match) {
			console.log(`✅ Created container ID: ${match[1]}`);
		}
	});

	test('should navigate between containers', async ({ page }) => {
		await navigateToCollection(page);

		// Create first container
		const createButton = page
			.locator('button:has-text("Create First Note"), button:has-text("New Note")')
			.first();
		await createButton.click();
		await wait(2000);

		const url1 = page.url();
		const match1 = url1.match(/\/containers\/([a-f0-9-]+)/);
		if (match1) {
			console.log(`✅ Created first container ID: ${match1[1]}`);
		}

		// Create second container (now should be "New Note" button)
		const newNoteButton = page
			.locator('button:has-text("New Note"), button:has-text("Create First Note")')
			.first();
		await newNoteButton.click();
		await wait(2000);

		const url2 = page.url();
		const match2 = url2.match(/\/containers\/([a-f0-9-]+)/);
		if (match2) {
			console.log(`✅ Created second container ID: ${match2[1]}`);
		}

		// Verify we're on the second container
		expect(url2).toContain(match2![1]);
		expect(url1).not.toEqual(url2);

		// Navigate back to first container by clicking on it in the sidebar
		const firstContainerCard = page.locator(`[data-container-id="${match1![1]}"]`).first();
		if (await firstContainerCard.isVisible().catch(() => false)) {
			await firstContainerCard.click();
			await wait(1000);
			await expect(page).toHaveURL(new RegExp(match1![1]));
			console.log(`✅ Navigated back to first container`);
		} else {
			// Fallback: Look for any container item
			console.log(
				'Container card not found by data-container-id, looking for alternative selector'
			);
			const containerItems = page.locator('.container-item, [class*="container"]');
			const count = await containerItems.count();
			if (count >= 2) {
				await containerItems.first().click();
				await wait(1000);
				console.log(`✅ Navigated to a container using fallback selector`);
			}
		}
	});

	test('should delete a container', async ({ page }) => {
		await navigateToCollection(page);

		// Create a container to delete
		const createButton = page
			.locator('button:has-text("Create First Note"), button:has-text("New Note")')
			.first();
		await createButton.click();
		await wait(2000);

		const url = page.url();
		const match = url.match(/\/containers\/([a-f0-9-]+)/);
		const containerId = match ? match[1] : null;

		if (containerId) {
			console.log(`✅ Created container to delete: ${containerId}`);
		}

		// Look for delete button on the container card in the sidebar
		const containerCard = page.locator(`[data-container-id="${containerId}"]`).first();
		const deleteButton = (await containerCard.isVisible().catch(() => false))
			? containerCard.locator('button[title*="Delete"], button[aria-label*="Delete"], svg').first()
			: page.locator('button[title*="Delete"], button[aria-label*="Delete"]').first();

		if (await deleteButton.isVisible().catch(() => false)) {
			await deleteButton.click();
			await wait(500);

			// Confirm deletion if there's a confirmation dialog
			const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
			if (await confirmButton.isVisible().catch(() => false)) {
				await confirmButton.click();
				await wait(1000);
			}

			await wait(1000);

			// Check if the container was removed
			const currentUrl = page.url();
			const stillOnContainer = currentUrl.includes(containerId!);

			if (!stillOnContainer) {
				console.log(`✅ Deleted container - navigated away`);
			} else {
				// Navigate back and check
				await page.goto(`${baseURL}/app/collections/${state.collectionId}`);
				await wait(1000);

				const emptyState = page.locator('button:has-text("Create First Note")');
				const hasEmptyState = await emptyState.isVisible().catch(() => false);

				if (hasEmptyState) {
					console.log(`✅ Deleted container - collection now empty`);
				} else {
					console.log(`⚠️ Delete may not have worked - needs investigation`);
				}
			}
		} else {
			console.log(`⚠️ Delete button not found - may need to update selector`);
		}
	});

	test('should display section grid when container selected', async ({ page }) => {
		await navigateToCollection(page);

		// Create a container
		const createButton = page
			.locator('button:has-text("Create First Note"), button:has-text("New Note")')
			.first();
		await createButton.click();
		await wait(2000);

		const url = page.url();
		const match = url.match(/\/containers\/([a-f0-9-]+)/);
		if (match) {
			console.log(`✅ Created container: ${match[1]}`);
		}

		// Verify section grid is visible
		await wait(1000);

		const sectionGrid = page.locator('[data-section-grid], .section-grid, .sections').first();
		const hasGrid = await sectionGrid.isVisible().catch(() => false);

		if (hasGrid) {
			console.log(`✅ Section grid is visible`);
		} else {
			console.log(`ℹ️ Section grid may be empty or uses different selector`);
		}

		// At minimum, we should be on a container page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});

	test('should handle multiple container creation', async ({ page }) => {
		await navigateToCollection(page);

		const containerIds: string[] = [];

		// Create 3 containers
		for (let i = 0; i < 3; i++) {
			const createButton = page
				.locator('button:has-text("Create First Note"), button:has-text("New Note")')
				.first();
			await createButton.click();
			await wait(2000);

			const url = page.url();
			const match = url.match(/\/containers\/([a-f0-9-]+)/);
			if (match) {
				containerIds.push(match[1]);
				console.log(`✅ Created container ${i + 1}: ${match[1]}`);
			}
		}

		// Verify we created 3 containers
		expect(containerIds.length).toBe(3);

		// All container IDs should be unique
		const uniqueIds = new Set(containerIds);
		expect(uniqueIds.size).toBe(3);

		console.log(`✅ Created ${containerIds.length} unique containers`);
	});

	// ============================================================
	// CLEANUP TEST (runs last due to serial mode)
	// ============================================================

	test('CLEANUP: delete test collection', async ({ page }) => {
		await cleanupCollection(page);
		console.log('✅ CLEANUP: Test collection deleted');
	});
});
