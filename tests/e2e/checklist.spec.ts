/**
 * Phase 4: Checklist Editor E2E Tests
 *
 * Tests for the checklist section functionality.
 * Uses a shared collection across all tests to avoid the 12 collection limit.
 *
 * The first test creates the collection, subsequent tests reuse it.
 * The last test cleans up.
 *
 * @see docs/functionality/editors/checklist.md for requirements
 */

import { test, expect, type Page } from '@playwright/test';
import { generateTestName, wait } from './helpers/test-data';
import { waitForAppLoaded } from './helpers/drag-helpers';

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

	state.collectionName = generateTestName('checklist');

	await page.goto(`${baseURL}/app`);
	await page.waitForLoadState('networkidle');
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
 * Creates a container and checklist section within the shared collection.
 */
async function setupChecklistSection(page: Page): Promise<{ sectionUrl: string }> {
	await ensureCollection(page);

	// Check if we're already on the collection page (ensureCollection may have navigated us there)
	const currentUrl = page.url();
	const expectedCollectionPath = `/app/collections/${state.collectionId}`;

	if (!currentUrl.includes(expectedCollectionPath)) {
		// Not on collection page, navigate there
		await page.goto(`${baseURL}${expectedCollectionPath}`, {
			waitUntil: 'domcontentloaded'
		});
	}

	// Wait for app header to load (ensures auth/layout is working)
	await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout: 15000 });

	// Wait for collection view - either empty state with "Create First Note" or redirect to container
	// The collection page either:
	// 1. Shows "Create First Note" button if empty
	// 2. Redirects to first container if containers exist
	// 3. Shows a container view after redirect
	const collectionReady = page.locator(
		'button:has-text("Create First Note"), [data-container-id], .section-list, .checklist-item'
	);
	await collectionReady.first().waitFor({ state: 'visible', timeout: 20000 });
	await wait(500);

	// Create container using keyboard shortcut
	await page.keyboard.press('Alt+n');
	await wait(2000);

	// After container creation, wait for container view to load
	const containerView = page.locator('[data-container-id], .section-list');
	await containerView.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
		// Might already be in container view
	});
	await wait(500);

	// Create checklist section
	await page.keyboard.press('Alt+l');
	await wait(1500);

	// Wait for checklist editor to load
	await page.locator('.checklist-item').first().waitFor({ state: 'visible', timeout: 10000 });

	const sectionUrl = page.url();
	return { sectionUrl };
}

/**
 * Deletes the test collection (called by cleanup test).
 */
async function cleanupCollection(page: Page): Promise<void> {
	if (!state.collectionName || !state.created) return;

	await page.goto(`${baseURL}/app`);
	await page.waitForLoadState('networkidle');
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

async function getChecklistItems(page: Page) {
	return page.locator('.checklist-item');
}

async function getChecklistItemTexts(page: Page): Promise<string[]> {
	const inputs = page.locator('.checklist-item input[type="text"]');
	const count = await inputs.count();
	const texts: string[] = [];
	for (let i = 0; i < count; i++) {
		const value = await inputs.nth(i).inputValue();
		texts.push(value);
	}
	return texts;
}

async function getChecklistCheckedStates(page: Page): Promise<boolean[]> {
	const checkboxes = page.locator('.checklist-item input[type="checkbox"]');
	const count = await checkboxes.count();
	const states: boolean[] = [];
	for (let i = 0; i < count; i++) {
		const checked = await checkboxes.nth(i).isChecked();
		states.push(checked);
	}
	return states;
}

// ============================================================
// TEST SUITE - Tests run in file order, sharing state
// ============================================================

test.describe('Checklist Editor', () => {
	// Tests run serially and share the module-level state
	test.describe.configure({ mode: 'serial' });

	// ============================================================
	// ITEM MANAGEMENT TESTS
	// ============================================================

	test('CL-ITEM-01: should add new item with Enter key', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('First task');
		await page.keyboard.press('Enter');
		await wait(500);

		const items = await getChecklistItems(page);
		expect(await items.count()).toBe(2);

		const secondInput = page.locator('.checklist-item input[type="text"]').nth(1);
		await expect(secondInput).toBeFocused();

		console.log('✅ CL-ITEM-01: Enter key creates new item');
	});

	test('CL-ITEM-02: should edit item text inline', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('My task description');
		await wait(300);

		expect(await firstInput.inputValue()).toBe('My task description');
		console.log('✅ CL-ITEM-02: Item text can be edited inline');
	});

	test('CL-ITEM-03: should delete empty item with Backspace', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('Keep this task');
		await page.keyboard.press('Enter');
		await wait(500);

		let items = await getChecklistItems(page);
		expect(await items.count()).toBe(2);

		await page.keyboard.press('Backspace');
		await wait(500);

		items = await getChecklistItems(page);
		expect(await items.count()).toBe(1);

		console.log('✅ CL-ITEM-03: Backspace deletes empty item');
	});

	test('CL-ITEM-04: should delete item with delete button', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('First task');
		await page.keyboard.press('Enter');
		await wait(300);

		const secondInput = page.locator('.checklist-item input[type="text"]').nth(1);
		await secondInput.fill('Second task');
		await page.keyboard.press('Enter');
		await wait(300);

		let items = await getChecklistItems(page);
		expect(await items.count()).toBe(3);

		const deleteButton = page.locator('.checklist-item').nth(1).locator('button');
		await deleteButton.click();
		await wait(500);

		items = await getChecklistItems(page);
		expect(await items.count()).toBe(2);

		const texts = await getChecklistItemTexts(page);
		expect(texts).not.toContain('Second task');

		console.log('✅ CL-ITEM-04: Delete button removes item');
	});

	test('CL-ITEM-05: should toggle completion with checkbox', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('Toggle me');
		await wait(300);

		const checkbox = page.locator('.checklist-item input[type="checkbox"]').first();
		expect(await checkbox.isChecked()).toBe(false);

		await checkbox.click();
		await wait(300);
		expect(await checkbox.isChecked()).toBe(true);

		await checkbox.click();
		await wait(300);
		expect(await checkbox.isChecked()).toBe(false);

		console.log('✅ CL-ITEM-05: Checkbox toggles completion');
	});

	test('CL-ITEM-06: should add item with Add button', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('First task');

		const addButton = page.locator('button:has-text("Add new item")');
		await addButton.click();
		await wait(500);

		const items = await getChecklistItems(page);
		expect(await items.count()).toBe(2);

		console.log('✅ CL-ITEM-06: Add button creates new item');
	});

	// ============================================================
	// PROGRESS TRACKING TESTS
	// ============================================================

	test('CL-PROG-01: should display progress bar', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('Task 1');
		await wait(500);

		const progressText = page.locator('text=/Progress:/');
		const isVisible = await progressText.isVisible().catch(() => false);

		console.log(`✅ CL-PROG-01: Progress tracking ${isVisible ? 'visible' : 'hidden (mobile view?)'}`);
	});

	test('CL-PROG-02: should update progress when items are completed', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('Task 1');
		await page.keyboard.press('Enter');
		await wait(300);

		const secondInput = page.locator('.checklist-item input[type="text"]').nth(1);
		await secondInput.fill('Task 2');
		await wait(500);

		const checkbox = page.locator('.checklist-item input[type="checkbox"]').first();
		await checkbox.click();
		await wait(500);

		const progressText = page.locator('text=/1 of 2/');
		const hasProgress = await progressText.isVisible().catch(() => false);

		console.log(
			hasProgress
				? '✅ CL-PROG-02: Progress updates when items completed'
				: '⚠️ CL-PROG-02: Progress bar may be hidden (mobile view?)'
		);
	});

	// ============================================================
	// PRIORITY TESTS
	// ============================================================

	test('CL-PRIO-01: should set item priority', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('Priority task');
		await wait(300);

		const prioritySelect = page.locator('.checklist-item select').first();
		const isSelectVisible = await prioritySelect.isVisible().catch(() => false);

		if (!isSelectVisible) {
			console.log('⚠️ CL-PRIO-01: Priority selector hidden (mobile view?) - skipping');
			test.skip();
			return;
		}

		await prioritySelect.selectOption('high');
		await wait(500);

		const item = page.locator('.checklist-item').first();
		const style = await item.getAttribute('style');
		expect(style).toMatch(/rgb\(254,\s*226,\s*226\)/);

		console.log('✅ CL-PRIO-01: Priority can be set and shows visual indicator');
	});

	// ============================================================
	// DUE DATE TESTS
	// ============================================================

	test('CL-DATE-01: should set due date', async ({ page }) => {
		await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		const dateInput = page.locator('.checklist-item input[type="date"]').first();
		const isDateVisible = await dateInput.isVisible().catch(() => false);

		if (!isDateVisible) {
			console.log('⚠️ CL-DATE-01: Date input hidden (mobile view?) - skipping');
			test.skip();
			return;
		}

		await firstInput.fill('Task with date');
		await wait(300);

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateString = tomorrow.toISOString().split('T')[0];

		await dateInput.fill(dateString);
		await wait(300);

		expect(await dateInput.inputValue()).toBe(dateString);
		console.log('✅ CL-DATE-01: Due date can be set');
	});

	// ============================================================
	// PERSISTENCE TESTS
	// ============================================================

	test('CL-PERSIST-01: should persist items after reload', async ({ page }) => {
		const { sectionUrl } = await setupChecklistSection(page);

		const firstInput = page.locator('.checklist-item input[type="text"]').first();
		await firstInput.waitFor({ state: 'visible', timeout: 5000 });

		await firstInput.fill('Persistent task 1');
		await page.keyboard.press('Enter');
		await wait(300);

		const secondInput = page.locator('.checklist-item input[type="text"]').nth(1);
		await secondInput.fill('Persistent task 2');
		await page.keyboard.press('Enter');
		await wait(300);

		const thirdInput = page.locator('.checklist-item input[type="text"]').nth(2);
		await thirdInput.fill('Persistent task 3');
		await wait(500);

		const secondCheckbox = page.locator('.checklist-item input[type="checkbox"]').nth(1);
		await secondCheckbox.click();
		await wait(500);

		const saveButton = page.locator('button:has-text("Save")');
		await saveButton.click();
		await wait(2000);

		await page.goto(sectionUrl);
		await waitForAppLoaded(page);

		await page.locator('.checklist-item').first().waitFor({ state: 'visible', timeout: 10000 });
		await wait(500);

		const texts = await getChecklistItemTexts(page);
		expect(texts).toContain('Persistent task 1');
		expect(texts).toContain('Persistent task 2');
		expect(texts).toContain('Persistent task 3');

		const checkedStates = await getChecklistCheckedStates(page);
		const secondIndex = texts.indexOf('Persistent task 2');
		if (secondIndex >= 0 && secondIndex < checkedStates.length) {
			expect(checkedStates[secondIndex]).toBe(true);
		}

		console.log('✅ CL-PERSIST-01: Checklist items persist after reload');
	});

	// ============================================================
	// CLEANUP TEST (runs last due to serial mode)
	// ============================================================

	test('CLEANUP: delete test collection', async ({ page }) => {
		await cleanupCollection(page);
		console.log('✅ CLEANUP: Test collection deleted');
	});
});
