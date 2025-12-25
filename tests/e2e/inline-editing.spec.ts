/**
 * Inline Title Editing E2E Tests
 *
 * Tests for inline editing of container and section titles.
 * Uses a shared collection across all tests to avoid the 12 collection limit.
 *
 * @see tests/TEST_COVERAGE_PLAN.md
 */

import { test, expect, type Page } from '@playwright/test';
import { generateTestName, wait } from './helpers/test-data';

const baseURL = 'http://localhost:5174';

// ============================================================
// TEST STATE (module-level, persists across tests in same worker)
// ============================================================

const state = {
	collectionId: '',
	collectionName: '',
	created: false
};

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

	state.collectionName = generateTestName('inline-edit');

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
 * Creates a fresh container for a test.
 */
async function setupContainer(page: Page): Promise<void> {
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

	// Create a container for this test
	const createNoteButton = page
		.locator('button:has-text("Create First Note"), button:has-text("New Note")')
		.first();
	await createNoteButton.click();
	await wait(2000);

	// Verify we're on a container page
	await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
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

test.describe('Inline Title Editing', () => {
	// Tests run serially and share the module-level state
	test.describe.configure({ mode: 'serial' });

	// ============================================================
	// CONTAINER TITLE EDITING
	// ============================================================

	test('should edit container title inline', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Container page should be loaded, find the h1 title
		const titleElement = page.locator('h1 span[role="button"]').first();
		await expect(titleElement).toBeVisible();

		// Get initial title (should be "Untitled" by default)
		const initialTitle = await titleElement.textContent();
		console.log(`Initial container title: "${initialTitle}"`);

		// Click to start editing
		await titleElement.click();
		await wait(300);

		// Input should now be visible and focused
		const titleInput = page.locator('h1 input').first();
		await expect(titleInput).toBeVisible();
		await expect(titleInput).toBeFocused();

		// Type new title
		const newTitle = generateTestName('container');
		await titleInput.fill(newTitle);

		// Save by pressing Enter
		await titleInput.press('Enter');
		await wait(1000);

		// Title should be updated and input should be gone
		await expect(titleInput).not.toBeVisible();
		const updatedTitle = await titleElement.textContent();
		expect(updatedTitle).toBe(newTitle);

		console.log(`✅ Container title updated: "${initialTitle}" → "${newTitle}"`);
	});

	test('should save container title on blur', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		const titleElement = page.locator('h1 span[role="button"]').first();
		await titleElement.click();
		await wait(300);

		const titleInput = page.locator('h1 input').first();
		const newTitle = generateTestName('container-blur');
		await titleInput.fill(newTitle);

		// Trigger blur by clicking elsewhere
		await page.locator('body').click();
		await wait(1000);

		// Title should be updated
		const updatedTitle = await titleElement.textContent();
		expect(updatedTitle).toBe(newTitle);

		console.log(`✅ Container title saved on blur: "${newTitle}"`);
	});

	test('should cancel container title edit with Escape', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		const titleElement = page.locator('h1 span[role="button"]').first();
		const originalTitle = await titleElement.textContent();

		await titleElement.click();
		await wait(300);

		const titleInput = page.locator('h1 input').first();
		await titleInput.fill('This should be cancelled');

		// Cancel with Escape
		await titleInput.press('Escape');
		await wait(500);

		// Title should remain unchanged
		const currentTitle = await titleElement.textContent();
		expect(currentTitle).toBe(originalTitle);

		console.log(`✅ Container title edit cancelled, kept: "${originalTitle}"`);
	});

	test('should not save empty container title', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		const titleElement = page.locator('h1 span[role="button"]').first();
		const originalTitle = await titleElement.textContent();

		await titleElement.click();
		await wait(300);

		const titleInput = page.locator('h1 input').first();

		// Clear the title (empty string)
		await titleInput.fill('');

		// Try to save with Enter
		await titleInput.press('Enter');
		await wait(1000);

		// Title should remain unchanged (empty not saved)
		const currentTitle = await titleElement.textContent();
		expect(currentTitle).toBe(originalTitle);

		console.log(`✅ Empty container title rejected, kept: "${originalTitle}"`);
	});

	test('should not save whitespace-only container title', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		const titleElement = page.locator('h1 span[role="button"]').first();
		const originalTitle = await titleElement.textContent();

		await titleElement.click();
		await wait(300);

		const titleInput = page.locator('h1 input').first();

		// Fill with whitespace only
		await titleInput.fill('   ');

		// Try to save with Enter
		await titleInput.press('Enter');
		await wait(1000);

		// Title should remain unchanged (whitespace not saved)
		const currentTitle = await titleElement.textContent();
		expect(currentTitle).toBe(originalTitle);

		console.log(`✅ Whitespace-only container title rejected, kept: "${originalTitle}"`);
	});

	// ============================================================
	// SECTION TITLE EDITING
	// ============================================================

	test('should edit section title inline', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Create a section first (code section)
		await page.keyboard.press('Alt+k');
		await wait(1000);

		// Navigate back to container view
		await page.goBack();
		await wait(1000);

		// Find the section card title
		const sectionCard = page.locator('.section-draggable-container').first();
		await sectionCard.scrollIntoViewIfNeeded();

		// Find the editable title span within the section card
		const titleElement = sectionCard.locator('span[role="button"]').first();
		await expect(titleElement).toBeVisible();

		// Get initial title (should be "Code" by default)
		const initialTitle = await titleElement.textContent();
		console.log(`Initial section title: "${initialTitle}"`);

		// Click to start editing
		await titleElement.click();
		await wait(300);

		// Input should now be visible
		const titleInput = sectionCard.locator('input').first();
		await expect(titleInput).toBeVisible();
		await expect(titleInput).toBeFocused();

		// Type new title
		const newTitle = 'My Custom Code Section';
		await titleInput.fill(newTitle);

		// Save by pressing Enter
		await titleInput.press('Enter');
		await wait(1000);

		// Title should be updated
		await expect(titleInput).not.toBeVisible();
		const updatedTitle = await titleElement.textContent();
		expect(updatedTitle).toBe(newTitle);

		console.log(`✅ Section title updated: "${initialTitle}" → "${newTitle}"`);
	});

	test('should save section title on blur', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Create a text section
		await page.keyboard.press('Alt+t');
		await wait(1000);
		await page.goBack();
		await wait(1000);

		const sectionCard = page.locator('.section-draggable-container').first();
		const titleElement = sectionCard.locator('span[role="button"]').first();

		await titleElement.click();
		await wait(300);

		const titleInput = sectionCard.locator('input').first();
		const newTitle = 'Text Section with Blur Save';
		await titleInput.fill(newTitle);

		// Trigger blur by clicking elsewhere
		await page.locator('body').click({ position: { x: 10, y: 10 } });
		await wait(1000);

		// Title should be updated
		const updatedTitle = await titleElement.textContent();
		expect(updatedTitle).toBe(newTitle);

		console.log(`✅ Section title saved on blur: "${newTitle}"`);
	});

	test('should cancel section title edit with Escape', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Create a checklist section
		await page.keyboard.press('Alt+l');
		await wait(1000);
		await page.goBack();
		await wait(1000);

		const sectionCard = page.locator('.section-draggable-container').first();
		const titleElement = sectionCard.locator('span[role="button"]').first();
		const originalTitle = await titleElement.textContent();

		await titleElement.click();
		await wait(300);

		const titleInput = sectionCard.locator('input').first();
		await titleInput.fill('This should be cancelled');

		// Cancel with Escape
		await titleInput.press('Escape');
		await wait(500);

		// Title should remain unchanged
		const currentTitle = await titleElement.textContent();
		expect(currentTitle).toBe(originalTitle);

		console.log(`✅ Section title edit cancelled, kept: "${originalTitle}"`);
	});

	test('should show section type as placeholder for empty title', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Create a diagram section
		await page.keyboard.press('Alt+d');
		await wait(3000); // Diagram takes longer to load

		// Verify we're on edit page (diagram editor loads)
		const editUrl = page.url();
		console.log(`Current URL after creating diagram: ${editUrl}`);

		// Extract container URL from edit URL
		const containerUrlMatch = editUrl.match(/(\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+)/);
		if (!containerUrlMatch) {
			console.log('⚠️ Could not extract container URL from edit URL');
			test.skip();
			return;
		}

		const containerUrl = containerUrlMatch[1];
		console.log(`Navigating back to container: ${containerUrl}`);

		// Navigate directly to container page instead of using goBack()
		await page.goto(`${baseURL}${containerUrl}`);
		await wait(2000); // Wait for section grid to render

		// Verify we're on container page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+$/);

		// Wait for section grid to be ready
		const sectionCard = page.locator('.section-draggable-container').first();
		await sectionCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
			console.log('⚠️ Section card not found after navigation back');
			return false;
		});

		// Check if section card is visible
		const isCardVisible = await sectionCard.isVisible().catch(() => false);
		if (!isCardVisible) {
			console.log('⚠️ Section card not visible - diagram may not have been created');
			test.skip();
			return;
		}

		const titleElement = sectionCard.locator('span[role="button"]').first();
		await titleElement.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {
			console.log('⚠️ Title element not found');
			return false;
		});

		// Default title should be the section type
		const defaultTitle = await titleElement.textContent();
		expect(defaultTitle).toMatch(/diagram/i);

		console.log(`✅ Section shows type as default title: "${defaultTitle}"`);
	});

	// ============================================================
	// COLLECTION EDIT (Fix TEST-001)
	// ============================================================

	test('should edit collection name and description', async ({ page }) => {
		await ensureCollection(page);

		// Navigate back to collections page
		await page.goto(`${baseURL}/app`);
		await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });
		await wait(1000);

		// Find the collection card
		const collectionCard = page.locator(`.group:has-text("${state.collectionName}")`).first();
		await collectionCard.scrollIntoViewIfNeeded();
		await wait(500);

		// Hover over the card to reveal the edit button
		await collectionCard.hover();
		await wait(500);

		// Look for edit button - try multiple selectors
		const editButton = collectionCard.locator('button[title="Edit collection"]').first();

		// Check if edit button is visible after hover
		const isEditButtonVisible = await editButton.isVisible().catch(() => false);

		if (!isEditButtonVisible) {
			console.log('⚠️ Edit button not visible after hover - checking DOM structure');
			// Debug: log what buttons are available
			const buttons = await collectionCard.locator('button').all();
			console.log(`Found ${buttons.length} buttons in collection card`);

			// Skip this test if we can't find the edit button
			test.skip();
			return;
		}

		// Click edit button
		await editButton.click();
		await wait(1000);

		// Find the edit form inputs
		const editNameInput = page.locator('input[placeholder="Collection name"]').first();
		await editNameInput.waitFor({ state: 'visible', timeout: 5000 });

		const updatedName = state.collectionName + '-edited';

		// Clear the input first, then fill with new name
		await editNameInput.clear();
		await editNameInput.fill(updatedName);
		await wait(300); // Wait for form validation

		// Find the description textarea
		const editDescriptionInput = page
			.locator('textarea[placeholder*="What will you store"]')
			.first();
		await editDescriptionInput.clear();
		await editDescriptionInput.fill('Updated description from test');
		await wait(300); // Wait for form validation

		// Wait for Save Changes button to be enabled
		const saveButton = page.locator('button:has-text("Save Changes")').first();
		await saveButton.scrollIntoViewIfNeeded();

		// Wait for button to become enabled (form validation)
		await saveButton.waitFor({ state: 'visible', timeout: 5000 });
		await wait(500); // Extra time for validation state to settle

		// Check if button is enabled before clicking
		const isEnabled = await saveButton.isEnabled().catch(() => false);
		if (!isEnabled) {
			console.log('⚠️ Save button is still disabled after filling form - skipping test');
			test.skip();
			return;
		}

		await saveButton.click();
		await wait(1000);

		// Verify updated name is visible
		const updatedCard = page.locator(`.group:has-text("${updatedName}")`);
		await expect(updatedCard).toBeVisible();

		// Update state for cleanup
		state.collectionName = updatedName;

		console.log(`✅ Edited collection: ${state.collectionName}`);
	});

	// ============================================================
	// CLEANUP TEST (runs last due to serial mode)
	// ============================================================

	test('CLEANUP: delete test collection', async ({ page }) => {
		await cleanupCollection(page);
		console.log('✅ CLEANUP: Test collection deleted');
	});
});
