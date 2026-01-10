// src/lib/services/migrationService.ts
// Handles migration of demo data to authenticated user's cloud storage

import { supabase, getAuthenticatedUser } from '$lib/supabase';
import { getDemoData, exitDemoMode, type DemoData, type DemoCollection, type DemoContainer, type DemoSection } from '$lib/stores/demoStore';
import { browser } from '$app/environment';

const PENDING_MIGRATION_KEY = 'jotter_pending_migration';

export interface MigrationResult {
	success: boolean;
	collectionsCreated: number;
	containersCreated: number;
	sectionsCreated: number;
	error?: string;
}

export interface MigrationStats {
	collections: number;
	containers: number;
	sections: number;
}

/**
 * Check if there's demo data available for migration
 */
export function hasDemoDataForMigration(): boolean {
	if (!browser) return false;
	const data = getDemoData();
	if (!data) return false;

	// Check if there's any meaningful data (beyond the starter collection)
	const hasCollections = data.collections.length > 0;
	const hasContainers = data.containers.length > 0;
	const hasSections = data.sections.length > 0;

	return hasCollections || hasContainers || hasSections;
}

/**
 * Get stats about demo data available for migration
 */
export function getDemoDataStats(): MigrationStats | null {
	if (!browser) return null;
	const data = getDemoData();
	if (!data) return null;

	return {
		collections: data.collections.length,
		containers: data.containers.length,
		sections: data.sections.length
	};
}

/**
 * Set a flag indicating migration should be prompted after auth
 */
export function setPendingMigration(): void {
	if (!browser) return;
	sessionStorage.setItem(PENDING_MIGRATION_KEY, 'true');
}

/**
 * Check if migration prompt should be shown
 */
export function hasPendingMigration(): boolean {
	if (!browser) return false;
	return sessionStorage.getItem(PENDING_MIGRATION_KEY) === 'true';
}

/**
 * Clear the pending migration flag
 */
export function clearPendingMigration(): void {
	if (!browser) return;
	sessionStorage.removeItem(PENDING_MIGRATION_KEY);
}

/**
 * Migrate all demo data to authenticated user's cloud storage
 *
 * This function:
 * 1. Gets the authenticated user
 * 2. Creates new UUIDs for all records (to avoid conflicts)
 * 3. Maintains relationships between collections, containers, and sections
 * 4. Preserves sequences for ordering
 * 5. Clears demo data after successful migration
 */
export async function migrateDemoToCloud(): Promise<MigrationResult> {
	const user = await getAuthenticatedUser();
	if (!user) {
		return {
			success: false,
			collectionsCreated: 0,
			containersCreated: 0,
			sectionsCreated: 0,
			error: 'User not authenticated'
		};
	}

	const demoData = getDemoData();
	if (!demoData) {
		return {
			success: false,
			collectionsCreated: 0,
			containersCreated: 0,
			sectionsCreated: 0,
			error: 'No demo data found'
		};
	}

	try {
		console.log('🔄 Starting demo data migration...');

		// Maps to track old ID -> new ID relationships
		const collectionIdMap = new Map<string, string>();
		const containerIdMap = new Map<string, string>();

		// Step 1: Check if user already has collections
		const { data: existingCollections } = await supabase
			.from('collections')
			.select('id')
			.eq('user_id', user.id);

		const hasExistingData = existingCollections && existingCollections.length > 0;
		const now = new Date().toISOString();

		// Step 2: Migrate collections
		let collectionsCreated = 0;
		for (const demoCollection of demoData.collections) {
			const newId = crypto.randomUUID();
			collectionIdMap.set(demoCollection.id, newId);

			const { error } = await supabase.from('collections').insert({
				id: newId,
				name: demoCollection.name,
				description: demoCollection.description,
				user_id: user.id,
				color: demoCollection.color,
				// Only mark as default if user has no existing collections
				is_default: !hasExistingData && demoCollection.is_default,
				sequence: hasExistingData ? demoCollection.sequence + 1000 : demoCollection.sequence, // Offset if existing data
				created_at: now,
				updated_at: now
			});

			if (error) {
				console.error('Failed to migrate collection:', demoCollection.name, error);
				throw new Error(`Failed to migrate collection: ${error.message}`);
			}
			collectionsCreated++;
		}
		console.log(`✅ Migrated ${collectionsCreated} collections`);

		// Step 3: Migrate containers
		let containersCreated = 0;
		for (const demoContainer of demoData.containers) {
			const newId = crypto.randomUUID();
			containerIdMap.set(demoContainer.id, newId);

			const newCollectionId = collectionIdMap.get(demoContainer.collection_id);
			if (!newCollectionId) {
				console.warn('Skipping container with unmapped collection:', demoContainer.title);
				continue;
			}

			const { error } = await supabase.from('note_container').insert({
				id: newId,
				title: demoContainer.title,
				user_id: user.id,
				collection_id: newCollectionId,
				sequence: demoContainer.sequence,
				created_at: now,
				updated_at: now
			});

			if (error) {
				console.error('Failed to migrate container:', demoContainer.title, error);
				throw new Error(`Failed to migrate container: ${error.message}`);
			}
			containersCreated++;
		}
		console.log(`✅ Migrated ${containersCreated} containers`);

		// Step 4: Migrate sections
		let sectionsCreated = 0;
		for (const demoSection of demoData.sections) {
			const newContainerId = containerIdMap.get(demoSection.note_container_id);
			if (!newContainerId) {
				console.warn('Skipping section with unmapped container:', demoSection.title);
				continue;
			}

			const { error } = await supabase.from('note_section').insert({
				id: crypto.randomUUID(),
				note_container_id: newContainerId,
				user_id: user.id,
				type: demoSection.type,
				title: demoSection.title,
				content: demoSection.content,
				sequence: demoSection.sequence,
				meta: demoSection.meta,
				checklist_data: demoSection.checklist_data,
				created_at: now,
				updated_at: now
			});

			if (error) {
				console.error('Failed to migrate section:', demoSection.title, error);
				throw new Error(`Failed to migrate section: ${error.message}`);
			}
			sectionsCreated++;
		}
		console.log(`✅ Migrated ${sectionsCreated} sections`);

		// Step 5: Clear demo mode and data
		exitDemoMode(true);
		clearPendingMigration();

		console.log('🎉 Demo data migration complete!');

		return {
			success: true,
			collectionsCreated,
			containersCreated,
			sectionsCreated
		};

	} catch (error) {
		console.error('❌ Migration failed:', error);
		return {
			success: false,
			collectionsCreated: 0,
			containersCreated: 0,
			sectionsCreated: 0,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Skip migration and just clear demo data
 */
export function skipMigrationAndClearDemo(): void {
	exitDemoMode(true);
	clearPendingMigration();
	console.log('🗑️ Demo data cleared, starting fresh');
}
