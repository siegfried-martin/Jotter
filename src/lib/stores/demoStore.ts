// src/lib/stores/demoStore.ts
// Demo mode state management - allows users to try Jotter without signing in

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const DEMO_MODE_KEY = 'jotter_demo_mode';
const DEMO_DATA_KEY = 'jotter_demo_data';
export const DEMO_USER_ID = 'demo-user-local';

// Demo mode flag - persisted to localStorage
function createDemoStore() {
	// Initialize from localStorage if in browser
	const initialValue = browser ? localStorage.getItem(DEMO_MODE_KEY) === 'true' : false;
	const { subscribe, set } = writable<boolean>(initialValue);

	return {
		subscribe,
		set: (value: boolean) => {
			if (browser) {
				if (value) {
					localStorage.setItem(DEMO_MODE_KEY, 'true');
				} else {
					localStorage.removeItem(DEMO_MODE_KEY);
				}
			}
			set(value);
		}
	};
}

export const isDemo = createDemoStore();

/**
 * Check if demo mode is active (synchronous helper)
 */
export function isDemoMode(): boolean {
	return get(isDemo);
}

/**
 * Initialize demo mode with starter data
 */
export function initDemoMode(): void {
	if (!browser) return;

	console.log('🎮 Initializing demo mode...');

	// Set demo mode flag
	isDemo.set(true);

	// Check if demo data already exists
	const existingData = localStorage.getItem(DEMO_DATA_KEY);
	if (existingData) {
		console.log('🎮 Demo data already exists, preserving it');
		return;
	}

	// Create starter demo data
	const now = new Date().toISOString();
	const starterCollection = {
		id: crypto.randomUUID(),
		name: 'My Notes',
		description: 'Your demo collection',
		user_id: DEMO_USER_ID,
		color: '#3B82F6',
		is_default: true,
		sequence: 0,
		created_at: now,
		updated_at: now
	};

	const starterContainer = {
		id: crypto.randomUUID(),
		title: 'Welcome to Jotter',
		user_id: DEMO_USER_ID,
		collection_id: starterCollection.id,
		sequence: 0,
		created_at: now,
		updated_at: now
	};

	const starterSection = {
		id: crypto.randomUUID(),
		note_container_id: starterContainer.id,
		user_id: DEMO_USER_ID,
		type: 'wysiwyg',
		title: 'Getting Started',
		content: '<h2>Welcome to Jotter!</h2><p>This is your demo workspace. Your notes are saved locally in your browser.</p><p><strong>Try it out:</strong></p><ul><li>Create new notes with the + button</li><li>Drag sections to reorder them</li><li>Use code blocks, checklists, and diagrams</li></ul><p>When you\'re ready, sign in to sync your notes across devices.</p>',
		sequence: 0,
		meta: {},
		checklist_data: null,
		created_at: now,
		updated_at: now
	};

	const demoData: DemoData = {
		collections: [starterCollection],
		containers: [starterContainer],
		sections: [starterSection],
		preferences: {
			id: crypto.randomUUID(),
			user_id: DEMO_USER_ID,
			theme: 'light',
			default_editor: 'wysiwyg',
			auto_save_delay: 2000,
			keyboard_shortcuts: {},
			last_visited_collection_id: starterCollection.id,
			last_visited_container_id: starterContainer.id,
			created_at: now,
			updated_at: now
		},
		meta: {
			createdAt: now,
			lastModified: now,
			version: 1
		}
	};

	localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
	console.log('🎮 Demo mode initialized with starter data');
}

/**
 * Exit demo mode and optionally clear data
 */
export function exitDemoMode(clearData: boolean = false): void {
	if (!browser) return;

	console.log('🎮 Exiting demo mode, clearData:', clearData);

	isDemo.set(false);

	if (clearData) {
		localStorage.removeItem(DEMO_DATA_KEY);
		console.log('🎮 Demo data cleared');
	}
}

/**
 * Check if demo data exists in localStorage
 */
export function hasDemoData(): boolean {
	if (!browser) return false;
	return localStorage.getItem(DEMO_DATA_KEY) !== null;
}

/**
 * Get raw demo data from localStorage
 */
export function getDemoData(): DemoData | null {
	if (!browser) return null;

	const data = localStorage.getItem(DEMO_DATA_KEY);
	if (!data) return null;

	try {
		return JSON.parse(data);
	} catch (e) {
		console.error('Failed to parse demo data:', e);
		return null;
	}
}

/**
 * Save demo data to localStorage
 */
export function saveDemoData(data: DemoData): void {
	if (!browser) return;

	data.meta.lastModified = new Date().toISOString();
	localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
}

// Type definitions
export interface DemoData {
	collections: DemoCollection[];
	containers: DemoContainer[];
	sections: DemoSection[];
	preferences: DemoPreferences;
	meta: {
		createdAt: string;
		lastModified: string;
		version: number;
	};
}

export interface DemoCollection {
	id: string;
	name: string;
	description: string | null;
	user_id: string;
	color: string;
	is_default: boolean;
	sequence: number;
	created_at: string;
	updated_at: string;
}

export interface DemoContainer {
	id: string;
	title: string;
	user_id: string;
	collection_id: string;
	sequence: number;
	created_at: string;
	updated_at: string;
}

export interface DemoSection {
	id: string;
	note_container_id: string;
	user_id: string;
	type: string;
	title: string | null;
	content: string;
	sequence: number;
	meta: Record<string, unknown>;
	checklist_data: unknown;
	created_at: string;
	updated_at: string;
}

export interface DemoPreferences {
	id: string;
	user_id: string;
	theme: string;
	default_editor: string;
	auto_save_delay: number;
	keyboard_shortcuts: Record<string, unknown>;
	last_visited_collection_id?: string;
	last_visited_container_id?: string;
	created_at: string;
	updated_at: string;
}
