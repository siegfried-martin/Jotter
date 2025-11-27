/**
 * Drag & Drop Test Helpers
 *
 * Utilities for testing the three DnD systems in Jotter:
 * 1. Custom Pointer-Based DnD - Sections (8px threshold)
 * 2. svelte-dnd-action - Container reorder
 * 3. HTML5 DnD - Cross-collection container moves
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Performs a pointer-based drag for section DnD.
 * Includes the 8px threshold movement required to trigger drag phase.
 *
 * @param page - Playwright page object
 * @param source - Source element locator
 * @param target - Target element locator
 * @param options - Additional options for the drag operation
 */
export async function dragSectionTo(
	page: Page,
	source: Locator,
	target: Locator,
	options: { steps?: number; waitAfter?: number } = {}
): Promise<void> {
	const { steps = 10, waitAfter = 500 } = options;

	const sourceBox = await source.boundingBox();
	const targetBox = await target.boundingBox();

	if (!sourceBox || !targetBox) {
		throw new Error('Could not get bounding boxes for drag operation');
	}

	// Move to center of source
	await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);

	await page.mouse.down();

	// Move 12px to trigger drag phase (threshold is 8px, use 12 for safety)
	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2 + 12,
		sourceBox.y + sourceBox.height / 2 + 12,
		{ steps: 3 }
	);

	// Wait for drag state transition
	await page.waitForTimeout(150);

	// Move to target
	await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
		steps
	});

	await page.waitForTimeout(100);
	await page.mouse.up();
	await page.waitForTimeout(waitAfter);
}

/**
 * Performs a mouse-based drag for svelte-dnd-action (containers).
 *
 * svelte-dnd-action requires specific timing and event sequence to work with Playwright.
 * Key findings from testing:
 * - Hover first to let element register
 * - Add delays between mouse events
 * - Use many steps (20) for the move
 *
 * @param page - Playwright page object
 * @param source - Source element locator
 * @param target - Target element locator
 * @param options - Additional options for the drag operation
 */
export async function dragContainerTo(
	page: Page,
	source: Locator,
	target: Locator,
	options: { steps?: number; waitAfter?: number } = {}
): Promise<void> {
	const { steps = 20, waitAfter = 500 } = options;

	const targetBox = await target.boundingBox();

	if (!targetBox) {
		throw new Error('Could not get bounding box for target');
	}

	// svelte-dnd-action requires specific timing to work with Playwright
	// 1. Hover first to let the element register
	await source.hover();
	await page.waitForTimeout(200);

	// 2. Mouse down with delay
	await page.mouse.down();
	await page.waitForTimeout(100);

	// 3. Move with many steps (important for svelte-dnd-action)
	await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
		steps
	});

	// 4. Small delay before releasing
	await page.waitForTimeout(100);
	await page.mouse.up();
	await page.waitForTimeout(waitAfter);
}

/**
 * Gets the current order of sections by their data-item-id attribute.
 *
 * @param page - Playwright page object
 * @returns Array of section IDs in current order
 */
export async function getSectionOrder(page: Page): Promise<string[]> {
	return page.locator('.section-draggable-container').evaluateAll((cards) =>
		cards
			.map((c) => c.getAttribute('data-item-id'))
			.filter((id): id is string => id !== null)
	);
}

/**
 * Gets the current order of containers by their data-container-id attribute.
 *
 * @param page - Playwright page object
 * @returns Array of container IDs in current order
 */
export async function getContainerOrder(page: Page): Promise<string[]> {
	return page.locator('[data-container-id]').evaluateAll((items) =>
		items
			.map((i) => i.getAttribute('data-container-id'))
			.filter((id): id is string => id !== null)
	);
}

/**
 * Creates multiple sections in the current container using keyboard shortcuts.
 * Returns to container view after each creation.
 *
 * @param page - Playwright page object
 * @param types - Array of section types to create
 */
export async function createSections(
	page: Page,
	types: ('code' | 'text' | 'checklist' | 'diagram')[]
): Promise<void> {
	const shortcuts: Record<string, string> = {
		code: 'Alt+k',
		text: 'Alt+t',
		checklist: 'Alt+l',
		diagram: 'Alt+d'
	};

	for (const type of types) {
		await page.keyboard.press(shortcuts[type]);
		await page.waitForTimeout(type === 'diagram' ? 2500 : 1000);

		// Return to container view (keyboard shortcuts open edit page)
		await page.goBack();
		await page.waitForTimeout(500);
	}
}

/**
 * Creates multiple containers in the current collection using keyboard shortcut.
 *
 * @param page - Playwright page object
 * @param count - Number of containers to create
 */
export async function createContainers(page: Page, count: number): Promise<void> {
	for (let i = 0; i < count; i++) {
		await page.keyboard.press('Alt+n');
		await page.waitForTimeout(1000);
	}
}

/**
 * Waits for a specific API response pattern.
 *
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match
 * @param method - HTTP method to match
 * @param timeout - Maximum time to wait
 */
export async function waitForApiResponse(
	page: Page,
	urlPattern: string | RegExp,
	method: string = 'PATCH',
	timeout: number = 5000
): Promise<void> {
	await page.waitForResponse(
		(response) => {
			const urlMatch =
				typeof urlPattern === 'string'
					? response.url().includes(urlPattern)
					: urlPattern.test(response.url());
			return urlMatch && response.request().method() === method;
		},
		{ timeout }
	);
}

/**
 * Verifies that an element has a specific CSS class.
 *
 * @param locator - Element locator
 * @param className - Class name to check (can be partial match)
 * @returns true if element has the class
 */
export async function hasClass(locator: Locator, className: string): Promise<boolean> {
	const classes = await locator.getAttribute('class');
	return classes ? classes.includes(className) : false;
}

/**
 * Gets the bounding box center coordinates.
 *
 * @param locator - Element locator
 * @returns Center coordinates {x, y}
 */
export async function getCenter(locator: Locator): Promise<{ x: number; y: number }> {
	const box = await locator.boundingBox();
	if (!box) {
		throw new Error('Could not get bounding box');
	}
	return {
		x: box.x + box.width / 2,
		y: box.y + box.height / 2
	};
}

/**
 * Bypasses drag UI to move a section to a different container via direct API call.
 * Uses the app's Supabase client to update the section's container.
 *
 * @param page - Playwright page object
 * @param sectionId - ID of the section to move
 * @param toContainerId - Target container ID
 */
export async function moveSectionToContainer(
	page: Page,
	sectionId: string,
	toContainerId: string
): Promise<boolean> {
	// Use the app's Supabase client directly
	const result = await page.evaluate(
		async ({ sectionId, toContainerId }) => {
			try {
				// Access the Supabase client from the app's window context
				// @ts-ignore - window.__SUPABASE_CLIENT__ is set by the app
				const supabase = window.__SUPABASE_CLIENT__;
				if (!supabase) {
					console.error('Supabase client not found on window');
					return { success: false, error: 'Supabase client not found' };
				}

				const { data, error } = await supabase
					.from('note_section')
					.update({
						note_container_id: toContainerId,
						updated_at: new Date().toISOString()
					})
					.eq('id', sectionId)
					.select()
					.single();

				if (error) {
					console.error('Error moving section:', error);
					return { success: false, error: error.message };
				}

				console.log('Section moved successfully:', data);
				return { success: true, data };
			} catch (e: any) {
				console.error('Exception moving section:', e);
				return { success: false, error: e.message };
			}
		},
		{ sectionId, toContainerId }
	);

	await page.waitForTimeout(500);
	return result.success;
}

/**
 * Bypasses drag UI to move a container to a different collection via direct API call.
 * Uses the app's Supabase client to update the container's collection.
 *
 * @param page - Playwright page object
 * @param containerId - ID of the container to move
 * @param targetCollectionId - Target collection ID
 */
export async function moveContainerToCollection(
	page: Page,
	containerId: string,
	targetCollectionId: string
): Promise<boolean> {
	// Use the app's Supabase client directly
	const result = await page.evaluate(
		async ({ containerId, targetCollectionId }) => {
			try {
				// Access the Supabase client from the app's window context
				// @ts-ignore - window.__SUPABASE_CLIENT__ is set by the app
				const supabase = window.__SUPABASE_CLIENT__;
				if (!supabase) {
					console.error('Supabase client not found on window');
					return { success: false, error: 'Supabase client not found' };
				}

				const { data, error } = await supabase
					.from('note_container')
					.update({
						collection_id: targetCollectionId,
						updated_at: new Date().toISOString()
					})
					.eq('id', containerId)
					.select()
					.single();

				if (error) {
					console.error('Error moving container:', error);
					return { success: false, error: error.message };
				}

				console.log('Container moved successfully:', data);
				return { success: true, data };
			} catch (e: any) {
				console.error('Exception moving container:', e);
				return { success: false, error: e.message };
			}
		},
		{ containerId, targetCollectionId }
	);

	await page.waitForTimeout(500);
	return result.success;
}

/**
 * Waits for the app to be fully loaded after a page reload or navigation.
 * Checks for the Jotter header which exists on all authenticated pages.
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait (default 15000ms)
 * @returns true if app loaded successfully, false if auth error detected
 */
export async function waitForAppLoaded(page: Page, timeout: number = 15000): Promise<boolean> {
	try {
		// Wait for the Jotter header text which exists on all authenticated pages
		await page.locator('h1:has-text("Jotter")').waitFor({ state: 'visible', timeout });
		return true;
	} catch {
		// Check if there's an auth error
		const authError = await page.locator('text=User not authenticated').isVisible().catch(() => false);
		if (authError) {
			return false;
		}
		// Check if still loading
		const isLoading = await page.locator('text=Loading').isVisible().catch(() => false);
		if (isLoading) {
			// Wait a bit more and check again
			await page.waitForTimeout(2000);
			const stillLoading = await page.locator('text=Loading').isVisible().catch(() => false);
			if (stillLoading) {
				return false;
			}
			// Loading finished, check for header again
			const headerVisible = await page.locator('h1:has-text("Jotter")').isVisible().catch(() => false);
			return headerVisible;
		}
		return false;
	}
}
