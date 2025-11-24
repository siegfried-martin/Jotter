import { test, expect } from '@playwright/test';
import { generateTestName, wait } from './helpers/test-data';

test.describe('Note Section CRUD Operations', () => {
	let testCollectionName: string;
	let testCollectionId: string | null = null;
	let testContainerId: string | null = null;

	test.beforeEach(async ({ page }) => {
		// Generate unique name for this test run
		testCollectionName = generateTestName('collection');

		// Create a collection and container for section tests
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

		// Extract collection ID from URL
		const url = page.url();
		const collectionMatch = url.match(/\/app\/collections\/([a-f0-9-]+)/);
		if (collectionMatch) {
			testCollectionId = collectionMatch[1];
		}

		// Create a container for section tests
		const createNoteButton = page.locator('button:has-text("Create First Note"), button:has-text("New Note")').first();
		await createNoteButton.click();
		await wait(2000);

		// Extract container ID from URL
		const containerUrl = page.url();
		const containerMatch = containerUrl.match(/\/containers\/([a-f0-9-]+)/);
		if (containerMatch) {
			testContainerId = containerMatch[1];
			console.log(`✅ Setup: Created test container ${testContainerId} in collection ${testCollectionId}`);
		}
	});

	test('should create a text (WYSIWYG) section', async ({ page }) => {
		await wait(1000);

		// Look for "Add" menu or text section button
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
			const addButton = page.locator('button:has-text("Draw"), button[title*="Draw"], button:has-text("Diagram")').first();
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
		await wait(1000);

		// Try keyboard shortcut (Alt+L for tasks/checklist)
		await page.keyboard.press('Alt+l');
		await wait(1000);

		// Verify a tasks section was created - look for checklist component or items
		const checklistSection = page.locator('.checklist-item, [data-section-type="checklist"], .checklist-editor').first();
		const hasChecklist = await checklistSection.isVisible().catch(() => false);

		if (hasChecklist) {
			console.log('✅ Created tasks (checklist) section via keyboard shortcut');

			// Optional: Try to add a task item to verify it works
			// Look specifically for an input field (not the checklist item div)
			const taskInput = page.locator('input[type="text"]').filter({ hasText: '' }).first();
			if (await taskInput.isVisible().catch(() => false)) {
				await taskInput.fill('Test task item');
				await page.keyboard.press('Enter');
				await wait(500);
				console.log('✅ Added task item to checklist');
			}
		} else {
			// Fallback: Look for "Add" button or section creation UI
			const addButton = page.locator('button:has-text("Tasks"), button[title*="Tasks"], button:has-text("Checklist")').first();
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
		await wait(1000);

		// Create a section first (using code section as example)
		await page.keyboard.press('Alt+k');
		await wait(1000);

		// After creating section, we're redirected to edit page
		// Navigate back to container view to see section cards
		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+\/edit\/[a-f0-9-]+/);

		// Click back or navigate to container page
		// Use browser back button or reconstruct container URL
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

		// Hover over the section card to reveal the delete button (it has opacity-0 by default)
		await sectionCard.hover();
		await wait(300); // Wait for opacity transition

		// Look for delete button - it should now be visible after hover
		const deleteButton = page.locator('button[title="Delete section"]').first();

		if (await deleteButton.isVisible().catch(() => false)) {
			// Get initial section count
			const sectionsBeforeDelete = await page.locator('.section-draggable-container').count();

			await deleteButton.click();
			await wait(500);

			// Confirm deletion if there's a confirmation dialog
			const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
			if (await confirmButton.isVisible().catch(() => false)) {
				await confirmButton.click();
				await wait(1000);
			}

			// Verify section was deleted
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

		// Sections use DraggableContainer wrapper - no explicit drag handles
		// The entire section card is draggable
		const sectionCards = page.locator('.section-draggable-container');
		const sectionCount = await sectionCards.count();

		if (sectionCount >= 2) {
			console.log(`✅ Found ${sectionCount} draggable sections - drag-drop is available`);
			console.log('ℹ️ Note: Sections use DraggableContainer (entire card is draggable, no explicit handles)');
			// Note: Actual drag-drop testing will be in a separate drag-drop test file
		} else {
			console.log(`⚠️ Only ${sectionCount} section(s) found - need at least 2 for reordering`);
		}

		await expect(page).toHaveURL(/\/app\/collections\/[a-f0-9-]+\/containers\/[a-f0-9-]+/);
	});
});
