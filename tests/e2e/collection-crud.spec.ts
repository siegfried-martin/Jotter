/**
 * Collection CRUD Operations E2E Tests
 *
 * Tests for collection creation, navigation, editing, and deletion.
 * Each test that creates a collection also cleans it up.
 * The tests run serially to avoid race conditions.
 *
 * @see tests/TEST_COVERAGE_PLAN.md
 */

import { test, expect, type Page } from '@playwright/test';
import { generateTestName, wait } from './helpers/test-data';

const baseURL = 'http://localhost:5174';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Navigate to the collections page.
 */
async function goToCollections(page: Page): Promise<void> {
	await page.goto(`${baseURL}/app`);
	await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });
	await wait(500);
}

/**
 * Creates a collection and returns its ID and name.
 */
async function createCollection(page: Page, suffix: string): Promise<{ id: string; name: string }> {
	const collectionName = generateTestName(suffix);

	await goToCollections(page);

	const createButton = page.locator('button:has-text("Create New Collection")');
	await createButton.waitFor({ state: 'visible', timeout: 10000 });
	await createButton.click();
	await wait(300);

	const nameInput = page.locator('input[placeholder="Collection name"]');
	await nameInput.fill(collectionName);

	const descriptionInput = page.locator('textarea[placeholder*="What will you store"]');
	if (await descriptionInput.isVisible().catch(() => false)) {
		await descriptionInput.fill('E2E test collection description');
	}

	const submitButton = page.locator('button:has-text("Create Collection")');
	await submitButton.click();
	await wait(2000);

	const url = page.url();
	const match = url.match(/\/app\/collections\/([a-f0-9-]+)/);
	if (match) {
		console.log(`✅ Created collection: ${collectionName} (ID: ${match[1]})`);
		return { id: match[1], name: collectionName };
	} else {
		throw new Error(`Failed to create collection - URL: ${url}`);
	}
}

/**
 * Deletes a collection by name.
 */
async function deleteCollection(page: Page, collectionName: string): Promise<void> {
	await goToCollections(page);

	const collectionCard = page.locator(`.group:has-text("${collectionName}")`).first();
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
				console.log(`🧹 Deleted collection: ${collectionName}`);
			}
		}
	}
}

// ============================================================
// TEST SUITE
// ============================================================

test.describe('Collection CRUD Operations', () => {
	// Track collections created during tests for cleanup
	const createdCollections: string[] = [];

	test.describe.configure({ mode: 'serial' });

	test('should create a new collection', async ({ page }) => {
		const { name } = await createCollection(page, 'crud-create');
		createdCollections.push(name);

		// Verify we're on a collection page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+/);

		// Navigate back to collections page to verify it's there
		await goToCollections(page);

		// Verify collection appears in the grid
		const collectionCard = page.locator(`.group:has-text("${name}")`);
		await expect(collectionCard).toBeVisible();

		console.log('✅ Collection created and visible in grid');
	});

	test('should navigate to created collection', async ({ page }) => {
		// Create a collection
		const { id, name } = await createCollection(page, 'crud-navigate');
		createdCollections.push(name);

		// Navigate back to collections
		await goToCollections(page);

		// Click on the collection card
		const collectionCard = page.locator(`.group:has-text("${name}")`).first();
		await collectionCard.click();

		// Verify URL changed to collection page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+/);
		await wait(1000);

		console.log(`✅ Navigated to collection: ${name}`);
	});

	test.skip('should edit collection name and description', async ({ page }) => {
		// Create a collection
		const { id, name } = await createCollection(page, 'crud-edit');
		createdCollections.push(name);

		// Navigate back to collections page
		await goToCollections(page);

		// Find the collection card and scroll into view
		const collectionCard = page.locator(`.group:has-text("${name}")`).first();
		await collectionCard.scrollIntoViewIfNeeded();
		await collectionCard.hover();

		// Click edit button
		const editButton = collectionCard.locator('button[title="Edit collection"]');
		await editButton.click();
		await wait(1000);

		// After clicking edit, look for the edit form inputs that appear
		// Find inputs by their placeholder text and context
		const editNameInput = page.locator('input[placeholder="Collection name"]').first();
		await editNameInput.waitFor({ state: 'visible', timeout: 5000 });

		const updatedName = name + '-edited';
		await editNameInput.fill(updatedName);

		// Find the description textarea
		const editDescriptionInput = page.locator('textarea[placeholder*="What will you store"]').first();
		await editDescriptionInput.waitFor({ state: 'visible', timeout: 5000 });
		await editDescriptionInput.fill('Updated description');

		// Find and click Save Changes button
		const saveButton = page.locator('button:has-text("Save Changes")').first();
		await saveButton.scrollIntoViewIfNeeded();
		await saveButton.click();
		await wait(1000);

		// Verify updated name is visible
		const updatedCard = page.locator(`.group:has-text("${updatedName}")`);
		await expect(updatedCard).toBeVisible();

		console.log(`✅ Edited collection: ${name} → ${updatedName}`);

		// Update tracking for cleanup
		createdCollections.pop();
		createdCollections.push(updatedName);
	});

	test('should delete collection', async ({ page }) => {
		// Create a collection to delete
		const { id, name } = await createCollection(page, 'crud-delete');
		// Note: Don't add to createdCollections since we're deleting it in this test

		// Navigate back to collections page
		await goToCollections(page);

		// Find the collection card and hover to reveal delete button
		const collectionCard = page.locator(`.group:has-text("${name}")`).first();
		await collectionCard.hover();

		// Click delete button
		const deleteButton = collectionCard.locator('button[title="Delete collection"]');
		await deleteButton.click();
		await wait(500);

		// Wait for any loading overlay to disappear
		const overlay = page.locator('.absolute.inset-0.bg-white.bg-opacity-95');
		await overlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
			// Overlay might not appear, that's okay
		});
		await wait(300);

		// Confirm deletion - use force:true to bypass any remaining overlay issues
		const confirmButton = page.locator('button:has-text("Delete")').last();
		await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
		await confirmButton.click({ force: true });
		await wait(1000);

		// Verify collection is no longer visible
		const deletedCard = page.locator(`.group:has-text("${name}")`);
		await expect(deletedCard).not.toBeVisible();

		console.log(`✅ Deleted collection: ${name}`);
	});

	// ============================================================
	// CLEANUP TEST (runs last due to serial mode)
	// ============================================================

	test('CLEANUP: delete test collections', async ({ page }) => {
		for (const collectionName of createdCollections) {
			await deleteCollection(page, collectionName);
		}
		console.log('✅ CLEANUP: Test collections deleted');
	});
});
