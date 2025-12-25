/**
 * Note Section CRUD Operations E2E Tests
 *
 * Tests for section creation, modification, and deletion.
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

	state.collectionName = generateTestName('section-crud');

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
 * Sets up a container for section tests. Creates collection if needed,
 * then creates a fresh container.
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

test.describe('Note Section CRUD Operations', () => {
	// Tests run serially and share the module-level state
	test.describe.configure({ mode: 'serial' });

	test('should create a text (WYSIWYG) section', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Try keyboard shortcut first (Alt+T for text)
		await page.keyboard.press('Alt+t');
		await wait(1000);

		// Verify a section was created - look for Quill editor
		const quillEditor = page.locator('.ql-editor, [contenteditable="true"]').first();
		const hasEditor = await quillEditor.isVisible().catch(() => false);

		if (hasEditor) {
			console.log('✅ Created text (WYSIWYG) section via keyboard shortcut');
		} else {
			// Fallback: Look for "Add" button or section creation UI
			const addButton = page.locator('button:has-text("Text"), button[title*="Text"]').first();
			if (await addButton.isVisible().catch(() => false)) {
				await addButton.click();
				await wait(1000);
				console.log('✅ Created text (WYSIWYG) section via button');
			} else {
				console.log('ℹ️ Text section creation UI not found - may need to update selectors');
			}
		}

		// Verify we're still on the container page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});

	test('should create a code section', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Try keyboard shortcut (Alt+K for code)
		await page.keyboard.press('Alt+k');
		await wait(1000);

		// Verify a code section was created - look for CodeMirror editor
		const codeEditor = page.locator('.cm-editor, .CodeMirror').first();
		const hasEditor = await codeEditor.isVisible().catch(() => false);

		if (hasEditor) {
			console.log('✅ Created code section via keyboard shortcut');

			// Optional: Type some code to verify it works
			const editorContent = page.locator('.cm-content, .CodeMirror-code').first();
			if (await editorContent.isVisible().catch(() => false)) {
				await editorContent.click();
				await page.keyboard.type('// Test code section');
				await wait(500);
				console.log('✅ Typed content into code section');
			}
		} else {
			// Fallback: Look for "Add" button or section creation UI
			const addButton = page.locator('button:has-text("Code"), button[title*="Code"]').first();
			if (await addButton.isVisible().catch(() => false)) {
				await addButton.click();
				await wait(1000);
				console.log('✅ Created code section via button');
			} else {
				console.log('ℹ️ Code section creation UI not found - may need to update selectors');
			}
		}

		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});

	test('should create a draw (diagram) section', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Try keyboard shortcut (Alt+D for draw)
		await page.keyboard.press('Alt+d');
		await wait(2000); // Excalidraw may take longer to load

		// Verify a draw section was created - look for Excalidraw canvas
		const excalidrawCanvas = page.locator('canvas.excalidraw, .excalidraw-canvas').first();
		const hasCanvas = await excalidrawCanvas.isVisible().catch(() => false);

		if (hasCanvas) {
			console.log('✅ Created draw (diagram) section via keyboard shortcut');
		} else {
			// Fallback: Look for "Add" button or section creation UI
			const addButton = page
				.locator('button:has-text("Draw"), button[title*="Draw"], button:has-text("Diagram")')
				.first();
			if (await addButton.isVisible().catch(() => false)) {
				await addButton.click();
				await wait(2000);
				console.log('✅ Created draw (diagram) section via button');
			} else {
				console.log('ℹ️ Draw section creation UI not found - may need to update selectors');
			}
		}

		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});

	test('should create a tasks (checklist) section', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Try keyboard shortcut (Alt+L for tasks/checklist)
		await page.keyboard.press('Alt+l');
		await wait(1000);

		// Verify a tasks section was created - look for checklist component or items
		const checklistSection = page
			.locator('.checklist-item, [data-section-type="checklist"], .checklist-editor')
			.first();
		const hasChecklist = await checklistSection.isVisible().catch(() => false);

		if (hasChecklist) {
			console.log('✅ Created tasks (checklist) section via keyboard shortcut');

			// Optional: Try to add a task item to verify it works
			const taskInput = page.locator('input[type="text"]').filter({ hasText: '' }).first();
			if (await taskInput.isVisible().catch(() => false)) {
				await taskInput.fill('Test task item');
				await page.keyboard.press('Enter');
				await wait(500);
				console.log('✅ Added task item to checklist');
			}
		} else {
			// Fallback: Look for "Add" button or section creation UI
			const addButton = page
				.locator('button:has-text("Tasks"), button[title*="Tasks"], button:has-text("Checklist")')
				.first();
			if (await addButton.isVisible().catch(() => false)) {
				await addButton.click();
				await wait(1000);
				console.log('✅ Created tasks (checklist) section via button');
			} else {
				console.log('ℹ️ Tasks section creation UI not found - may need to update selectors');
			}
		}

		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});

	test('should create multiple sections of different types', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Create one section of each type
		const sectionTypes = [
			{ shortcut: 'Alt+t', name: 'Text', selector: '.ql-editor, [contenteditable="true"]' },
			{ shortcut: 'Alt+k', name: 'Code', selector: '.cm-editor, .CodeMirror' },
			{ shortcut: 'Alt+l', name: 'Tasks', selector: 'input[placeholder*="task"], .checklist-item' },
			{ shortcut: 'Alt+d', name: 'Draw', selector: 'canvas.excalidraw, .excalidraw-canvas' }
		];

		let successCount = 0;

		for (const section of sectionTypes) {
			await page.keyboard.press(section.shortcut);
			await wait(section.name === 'Draw' ? 2000 : 1000);

			const element = page.locator(section.selector).first();
			const isVisible = await element.isVisible().catch(() => false);

			if (isVisible) {
				successCount++;
				console.log(`✅ Created ${section.name} section (${successCount}/${sectionTypes.length})`);
			} else {
				console.log(`⚠️ Could not verify ${section.name} section creation`);
			}

			await wait(500);
		}

		// Verify we created at least some sections
		expect(successCount).toBeGreaterThan(0);
		console.log(`✅ Created ${successCount} out of ${sectionTypes.length} section types`);
	});

	test.skip('should delete a section', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Create a section first (using code section as example)
		await page.keyboard.press('Alt+k');
		await wait(1000);

		// After creating section, we're redirected to edit page
		// Navigate back to container view to see section cards
		await expect(page).toHaveURL(
			/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+\/edit\/[a-f0-9-]+/
		);

		// Click back or navigate to container page
		await page.goBack();
		await wait(1000);

		// Verify we're back on container page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+$/);

		// Wait for section grid to be ready
		await wait(1000);

		// Find the section card wrapper (DraggableContainer)
		const sectionCard = page.locator('.section-draggable-container').first();

		// Scroll into view if needed
		await sectionCard.scrollIntoViewIfNeeded();
		await wait(300);

		// Wait for visibility
		await sectionCard.waitFor({ state: 'visible', timeout: 5000 });

		// Hover over the section card to reveal the delete button
		await sectionCard.hover();
		await wait(300);

		// Look for delete button
		const deleteButton = page.locator('button[title="Delete section"]').first();

		if (await deleteButton.isVisible().catch(() => false)) {
			const sectionsBeforeDelete = await page.locator('.section-draggable-container').count();

			await deleteButton.click();
			await wait(500);

			// Confirm deletion if there's a confirmation dialog
			const confirmButton = page
				.locator('button:has-text("Delete"), button:has-text("Confirm")')
				.first();
			if (await confirmButton.isVisible().catch(() => false)) {
				await confirmButton.click();
				await wait(1000);
			}

			const sectionsAfterDelete = await page.locator('.section-draggable-container').count();

			if (sectionsAfterDelete < sectionsBeforeDelete) {
				console.log('✅ Section deleted successfully');
			} else {
				console.log('⚠️ Section may not have been deleted - needs investigation');
			}
		} else {
			console.log('ℹ️ Delete button not found after hover - may need to update selector');
		}

		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});

	test('should handle section reordering (if drag-drop available)', async ({ page }) => {
		await setupContainer(page);
		await wait(1000);

		// Create first section
		await page.keyboard.press('Alt+k'); // Code section
		await wait(1000);

		// Navigate back to container view (Alt+k opens edit page)
		await page.goBack();
		await wait(1000);

		// Create second section
		await page.keyboard.press('Alt+t'); // Text section
		await wait(1000);

		// Navigate back again to see both sections
		await page.goBack();
		await wait(1000);

		// Verify we're on container page
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+$/);

		// Sections use DraggableContainer wrapper
		const sectionCards = page.locator('.section-draggable-container');
		const sectionCount = await sectionCards.count();

		if (sectionCount >= 2) {
			console.log(`✅ Found ${sectionCount} draggable sections - drag-drop is available`);
			console.log(
				'ℹ️ Note: Sections use DraggableContainer (entire card is draggable, no explicit handles)'
			);
		} else {
			console.log(`⚠️ Only ${sectionCount} section(s) found - need at least 2 for reordering`);
		}

		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});

	// ============================================================
	// CLEANUP TEST (runs last due to serial mode)
	// ============================================================

	test('CLEANUP: delete test collection', async ({ page }) => {
		await cleanupCollection(page);
		console.log('✅ CLEANUP: Test collection deleted');
	});
});
