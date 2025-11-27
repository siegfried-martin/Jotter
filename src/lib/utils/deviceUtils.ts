// Device detection utilities

import { readable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Detects if the device is a touch-primary device (mobile/tablet).
 * Uses multiple signals for reliable detection:
 * 1. Touch points available
 * 2. Coarse pointer (finger vs mouse)
 * 3. No hover capability (touch screens)
 */
function detectTouchDevice(): boolean {
	if (!browser) return false;

	// Check for touch capability
	const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

	// Check for coarse pointer (finger) as primary input
	const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

	// Check for no hover capability (touch-only devices)
	const noHover = window.matchMedia('(hover: none)').matches;

	// Device is considered touch-primary if it has touch AND (coarse pointer OR no hover)
	// This avoids false positives on laptops with touchscreens that primarily use mouse
	return hasTouch && (hasCoarsePointer || noHover);
}

/**
 * Svelte store that indicates if the current device is touch-primary.
 * Value is `true` on mobile/tablet, `false` on desktop.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { isTouchDevice } from '$lib/utils/deviceUtils';
 * </script>
 *
 * {#if !$isTouchDevice}
 *   <!-- Desktop-only features -->
 * {/if}
 * ```
 */
export const isTouchDevice = readable<boolean>(false, (set) => {
	if (!browser) {
		set(false);
		return;
	}

	// Initial detection
	set(detectTouchDevice());

	// Listen for media query changes (e.g., browser DevTools device toggle)
	const mediaQuery = window.matchMedia('(pointer: coarse)');
	const handleChange = () => set(detectTouchDevice());

	mediaQuery.addEventListener('change', handleChange);

	return () => {
		mediaQuery.removeEventListener('change', handleChange);
	};
});
