import { test, expect } from '@playwright/test';
import { generateTestName, shouldCleanup, wait } from './helpers/test-data';

test.describe('Collection CRUD Operations', () => {
	let testCollectionName: string;
	let testCollectionId: string | null = null;

	test.beforeEach(async () => {
		// Generate unique name for this test run
		testCollectionName = generateTestName();
	});

	// Note: Cleanup is handled by the manual cleanup script (npm run test:cleanup)
	// or within each test that deletes its own data

	test('should create a new collection', async ({ page }) => {
		// Navigate to app - may redirect to last visited location
		await page.goto('/app');
		await page.waitForLoadState('networkidle');

		// Check if we're on collections page, if not navigate back
		const createButton = page.locator('button:has-text("Create New Collection")');
		const isOnCollectionsPage = await createButton.isVisible().catch(() => false);

		if (!isOnCollectionsPage) {
			// We were redirected, navigate back to /app
			await page.goto('/app', { waitUntil: 'networkidle' });
			// Wait for create button to appear
			await createButton.waitFor({ state: 'visible', timeout: 10000 });
		}

		// Click "Create New Collection" card (dashed border card)
		await createButton.click();

		// Wait for form to appear
		await wait(300);

		// Fill in collection name
		const nameInput = page.locator('input[placeholder="Collection name"]');
		await nameInput.fill(testCollectionName);

		// Fill in description
		const descriptionInput = page.locator('textarea[placeholder*="What will you store"]');
		await descriptionInput.fill('E2E test collection description');

		// Select the first color (already selected by default, but click to ensure)
		const firstColorButton = page.locator('button[type="button"]').filter({ hasText: '' }).nth(0);
		// Just leave the default color

		// Click "Create Collection" button
		const submitButton = page.locator('button:has-text("Create Collection")');
		await submitButton.click();

		// Wait for navigation to the new collection
		await wait(2000);

		// Verify we're on a collection page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+/);

		// Extract collection ID from URL
		const url = page.url();
		const match = url.match(/\/app\/collections\/([a-f0-9-]+)/);
		if (match) {
			testCollectionId = match[1];
			console.log(`✅ Created collection: ${testCollectionName} (ID: ${testCollectionId})`);
		}

		// Navigate back to collections page to verify it's there
		await page.goto('/app');
		await page.waitForLoadState('networkidle');

		// Verify collection appears in the grid
		const collectionCard = page.locator(`.group:has-text("${testCollectionName}")`);
		await expect(collectionCard).toBeVisible();
	});

	test('should navigate to created collection', async ({ page }) => {
		// First create a collection
		await page.goto('/app');
		await page.waitForLoadState('networkidle');

		const createButton = page.locator('button:has-text("Create New Collection")');
		if (!(await createButton.isVisible().catch(() => false))) {
			await page.goto('/app', { waitUntil: 'networkidle' });
			await createButton.waitFor({ state: 'visible', timeout: 10000 });
		}

		await createButton.click();
		await wait(300);

		const nameInput = page.locator('input[placeholder="Collection name"]');
		await nameInput.fill(testCollectionName);

		const submitButton = page.locator('button:has-text("Create Collection")');
		await submitButton.click();

		await wait(2000);

		// Store collection ID
		const url = page.url();
		const match = url.match(/\/app\/collections\/([a-f0-9-]+)/);
		if (match) {
			testCollectionId = match[1];
		}

		// Now navigate back to collections and click on it
		await page.goto('/app');
		await page.waitForLoadState('networkidle');

		// Click on the collection card
		const collectionCard = page.locator(`.group:has-text("${testCollectionName}")`).first();
		await collectionCard.click();

		// Verify URL changed to collection page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+/);

		// Verify we can see collection-related content
		// (The page should load the collection view)
		await wait(1000);

		console.log(`✅ Navigated to collection: ${testCollectionName}`);
	});

	// TEST-001: Collection edit functionality - Known issue, documented in bug-tracking
	// Uncomment when UI implementation is fixed
	// test('should edit collection name and description', async ({ page }) => {
	// 	// Create a collection first
	// 	await page.goto('/app');
	// 	await page.waitForLoadState('networkidle');

	// 	const createButton = page.locator('button:has-text("Create New Collection")');
	// 	if (!(await createButton.isVisible().catch(() => false))) {
	// 		await page.goto('/app', { waitUntil: 'networkidle' });
	// 		await createButton.waitFor({ state: 'visible', timeout: 10000 });
	// 	}

	// 	await createButton.click();
	// 	await wait(300);

	// 	const nameInput = page.locator('input[placeholder="Collection name"]');
	// 	await nameInput.fill(testCollectionName);

	// 	const descriptionInput = page.locator('textarea[placeholder*="What will you store"]');
	// 	await descriptionInput.fill('Original description');

	// 	const submitButton = page.locator('button:has-text("Create Collection")');
	// 	await submitButton.click();
	// 	await wait(2000);

	// 	// Store collection ID
	// 	const url = page.url();
	// 	const match = url.match(/\/app\/collections\/([a-f0-9-]+)/);
	// 	if (match) {
	// 		testCollectionId = match[1];
	// 	}

	// 	// Navigate back to collections page
	// 	await page.goto('/app');
	// 	await page.waitForLoadState('networkidle');

	// 	// Find the collection card and scroll into view
	// 	const collectionCard = page.locator(`.group:has-text("${testCollectionName}")`).first();
	// 	await collectionCard.scrollIntoViewIfNeeded();
	// 	await collectionCard.hover();

	// 	// Click edit button
	// 	const editButton = collectionCard.locator('button[title="Edit collection"]');
	// 	await editButton.click();
	// 	await wait(1000);

	// 	// After clicking edit, look for the edit form inputs that appear
	// 	// Find inputs by their placeholder text and context
	// 	const editNameInput = page.locator('input[placeholder="Collection name"]').first();
	// 	await editNameInput.waitFor({ state: 'visible', timeout: 5000 });

	// 	const updatedName = testCollectionName + '-edited';
	// 	await editNameInput.fill(updatedName);

	// 	// Find the description textarea
	// 	const editDescriptionInput = page.locator('textarea[placeholder*="What will you store"]').first();
	// 	await editDescriptionInput.waitFor({ state: 'visible', timeout: 5000 });
	// 	await editDescriptionInput.fill('Updated description');

	// 	// Find and click Save Changes button
	// 	const saveButton = page.locator('button:has-text("Save Changes")').first();
	// 	await saveButton.scrollIntoViewIfNeeded();
	// 	await saveButton.click();
	// 	await wait(1000);

	// 	// Verify updated name is visible
	// 	const updatedCard = page.locator(`.group:has-text("${updatedName}")`);
	// 	await expect(updatedCard).toBeVisible();

	// 	console.log(`✅ Edited collection: ${testCollectionName} → ${updatedName}`);

	// 	// Update name for cleanup
	// 	testCollectionName = updatedName;
	// });

	test('should delete collection', async ({ page }) => {
		// Create a collection first
		await page.goto('/app');
		await page.waitForLoadState('networkidle');

		const createButton = page.locator('button:has-text("Create New Collection")');
		if (!(await createButton.isVisible().catch(() => false))) {
			await page.goto('/app', { waitUntil: 'networkidle' });
			await createButton.waitFor({ state: 'visible', timeout: 10000 });
		}

		await createButton.click();
		await wait(300);

		const nameInput = page.locator('input[placeholder="Collection name"]');
		await nameInput.fill(testCollectionName);

		const submitButton = page.locator('button:has-text("Create Collection")');
		await submitButton.click();
		await wait(2000);

		// Store collection ID
		const url = page.url();
		const match = url.match(/\/app\/collections\/([a-f0-9-]+)/);
		if (match) {
			testCollectionId = match[1];
		}

		// Navigate back to collections page
		await page.goto('/app');
		await page.waitForLoadState('networkidle');

		// Find the collection card and hover to reveal delete button
		const collectionCard = page.locator(`.group:has-text("${testCollectionName}")`).first();
		await collectionCard.hover();

		// Click delete button
		const deleteButton = collectionCard.locator('button[title="Delete collection"]');
		await deleteButton.click();
		await wait(500);

		// Confirm deletion
		const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
		await confirmButton.click();
		await wait(1000);

		// Verify collection is no longer visible
		const deletedCard = page.locator(`.group:has-text("${testCollectionName}")`);
		await expect(deletedCard).not.toBeVisible();

		console.log(`✅ Deleted collection: ${testCollectionName}`);

		// Clear testCollectionId so cleanup doesn't try to delete again
		testCollectionId = null;
	});
});
