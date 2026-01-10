// src/lib/services/localStorage/demoStorageService.ts
// localStorage-based storage for demo mode - mirrors Supabase service API

import {
	getDemoData,
	saveDemoData,
	DEMO_USER_ID,
	type DemoData,
	type DemoCollection,
	type DemoContainer,
	type DemoSection,
	type DemoPreferences
} from '$lib/stores/demoStore';
import type { Collection, NoteContainer, NoteSection, CreateCollection, CreateNoteContainer, CreateNoteSection } from '$lib/types';

// Helper to ensure demo data exists
function ensureDemoData(): DemoData {
	const data = getDemoData();
	if (!data) {
		throw new Error('Demo data not initialized');
	}
	return data;
}

// ============================================
// COLLECTION OPERATIONS
// ============================================

export class DemoCollectionService {
	static async getCollections(): Promise<Collection[]> {
		const data = ensureDemoData();
		return data.collections
			.filter(c => c.user_id === DEMO_USER_ID)
			.sort((a, b) => a.sequence - b.sequence) as Collection[];
	}

	static async getCollection(collectionId: string): Promise<Collection | null> {
		const data = ensureDemoData();
		const collection = data.collections.find(
			c => c.id === collectionId && c.user_id === DEMO_USER_ID
		);
		return (collection as Collection) || null;
	}

	static async getDefaultCollection(): Promise<Collection | null> {
		const data = ensureDemoData();
		const collection = data.collections.find(
			c => c.user_id === DEMO_USER_ID && c.is_default
		);
		return (collection as Collection) || null;
	}

	static async createCollection(collection: CreateCollection): Promise<Collection> {
		const data = ensureDemoData();
		const now = new Date().toISOString();

		// Get next sequence
		const maxSequence = Math.max(0, ...data.collections.map(c => c.sequence));
		const isFirstCollection = data.collections.filter(c => c.user_id === DEMO_USER_ID).length === 0;

		const newCollection: DemoCollection = {
			id: crypto.randomUUID(),
			name: collection.name,
			description: collection.description || null,
			user_id: DEMO_USER_ID,
			color: collection.color || '#3B82F6',
			is_default: collection.is_default ?? isFirstCollection,
			sequence: collection.sequence ?? maxSequence + 1,
			created_at: now,
			updated_at: now
		};

		data.collections.push(newCollection);
		saveDemoData(data);

		return newCollection as Collection;
	}

	static async updateCollection(
		id: string,
		updates: Partial<CreateCollection> & { sequence?: number }
	): Promise<Collection> {
		const data = ensureDemoData();
		const index = data.collections.findIndex(c => c.id === id && c.user_id === DEMO_USER_ID);

		if (index === -1) {
			throw new Error('Collection not found');
		}

		data.collections[index] = {
			...data.collections[index],
			...updates,
			updated_at: new Date().toISOString()
		};

		saveDemoData(data);
		return data.collections[index] as Collection;
	}

	static async deleteCollection(id: string): Promise<void> {
		const data = ensureDemoData();

		// Get default collection for orphan handling
		const defaultCollection = data.collections.find(
			c => c.user_id === DEMO_USER_ID && c.is_default && c.id !== id
		);

		// Move containers to default collection or delete them
		if (defaultCollection) {
			data.containers = data.containers.map(container => {
				if (container.collection_id === id) {
					return { ...container, collection_id: defaultCollection.id };
				}
				return container;
			});
		} else {
			// Delete containers and their sections
			const containerIds = data.containers
				.filter(c => c.collection_id === id)
				.map(c => c.id);
			data.sections = data.sections.filter(s => !containerIds.includes(s.note_container_id));
			data.containers = data.containers.filter(c => c.collection_id !== id);
		}

		// Delete the collection
		data.collections = data.collections.filter(c => c.id !== id);
		saveDemoData(data);
	}

	static async reorderCollections(fromIndex: number, toIndex: number): Promise<Collection[]> {
		const data = ensureDemoData();
		const collections = data.collections
			.filter(c => c.user_id === DEMO_USER_ID)
			.sort((a, b) => a.sequence - b.sequence);

		// Reorder
		const [moved] = collections.splice(fromIndex, 1);
		collections.splice(toIndex, 0, moved);

		// Update sequences
		collections.forEach((c, i) => {
			c.sequence = i;
			const dataIndex = data.collections.findIndex(dc => dc.id === c.id);
			if (dataIndex !== -1) {
				data.collections[dataIndex].sequence = i;
			}
		});

		saveDemoData(data);
		return collections as Collection[];
	}

	static async ensureDefaultCollection(): Promise<Collection> {
		let defaultCollection = await this.getDefaultCollection();

		if (!defaultCollection) {
			defaultCollection = await this.createCollection({
				name: 'My Notes',
				description: 'Default collection for your notes',
				color: '#3B82F6',
				is_default: true
			});
		}

		return defaultCollection;
	}
}

// ============================================
// CONTAINER (NOTE) OPERATIONS
// ============================================

export class DemoNoteService {
	static async getNoteContainers(collectionId?: string): Promise<NoteContainer[]> {
		const data = ensureDemoData();
		let containers = data.containers.filter(c => c.user_id === DEMO_USER_ID);

		if (collectionId) {
			containers = containers.filter(c => c.collection_id === collectionId);
		}

		// Add collection info to each container
		return containers
			.sort((a, b) => a.sequence - b.sequence)
			.map(container => {
				const collection = data.collections.find(c => c.id === container.collection_id);
				return {
					...container,
					collections: collection ? {
						id: collection.id,
						name: collection.name,
						color: collection.color
					} : null
				} as NoteContainer;
			});
	}

	static async getNoteContainer(containerId: string): Promise<NoteContainer | null> {
		const data = ensureDemoData();
		const container = data.containers.find(
			c => c.id === containerId && c.user_id === DEMO_USER_ID
		);

		if (!container) return null;

		const collection = data.collections.find(c => c.id === container.collection_id);
		return {
			...container,
			collections: collection ? {
				id: collection.id,
				name: collection.name,
				color: collection.color
			} : null
		} as NoteContainer;
	}

	static async createSimpleNoteContainer(
		collectionId: string,
		title: string = 'Untitled Note'
	): Promise<NoteContainer> {
		return await this.createNoteContainer({ title: title.trim() }, collectionId);
	}

	static async createNoteContainer(
		container: CreateNoteContainer,
		collectionId?: string
	): Promise<NoteContainer> {
		const data = ensureDemoData();
		const now = new Date().toISOString();

		// Use provided collection or default
		let finalCollectionId = collectionId;
		if (!finalCollectionId) {
			const defaultCollection = await DemoCollectionService.ensureDefaultCollection();
			finalCollectionId = defaultCollection.id;
		}

		// Get next sequence for this collection
		const containersInCollection = data.containers.filter(c => c.collection_id === finalCollectionId);
		const maxSequence = Math.max(0, ...containersInCollection.map(c => c.sequence));

		const newContainer: DemoContainer = {
			id: crypto.randomUUID(),
			title: container.title || 'Untitled Note',
			user_id: DEMO_USER_ID,
			collection_id: finalCollectionId,
			sequence: container.sequence ?? maxSequence + 1,
			created_at: now,
			updated_at: now
		};

		data.containers.push(newContainer);
		saveDemoData(data);

		// Return with collection info
		const collection = data.collections.find(c => c.id === finalCollectionId);
		return {
			...newContainer,
			collections: collection ? {
				id: collection.id,
				name: collection.name,
				color: collection.color
			} : null
		} as NoteContainer;
	}

	static async updateNoteContainer(
		id: string,
		updates: Partial<CreateNoteContainer> & { sequence?: number }
	): Promise<NoteContainer> {
		const data = ensureDemoData();
		const index = data.containers.findIndex(c => c.id === id && c.user_id === DEMO_USER_ID);

		if (index === -1) {
			throw new Error('Container not found');
		}

		data.containers[index] = {
			...data.containers[index],
			...updates,
			updated_at: new Date().toISOString()
		};

		saveDemoData(data);

		const container = data.containers[index];
		const collection = data.collections.find(c => c.id === container.collection_id);
		return {
			...container,
			collections: collection ? {
				id: collection.id,
				name: collection.name,
				color: collection.color
			} : null
		} as NoteContainer;
	}

	static async updateNoteContainerTitle(id: string, title: string): Promise<NoteContainer> {
		return this.updateNoteContainer(id, { title: title.trim() });
	}

	static async deleteNoteContainer(id: string): Promise<void> {
		const data = ensureDemoData();

		// Delete sections in this container
		data.sections = data.sections.filter(s => s.note_container_id !== id);

		// Delete the container
		data.containers = data.containers.filter(c => c.id !== id);

		saveDemoData(data);
	}

	static async moveToCollection(noteId: string, collectionId: string | null): Promise<void> {
		const data = ensureDemoData();

		let finalCollectionId = collectionId;
		if (!finalCollectionId) {
			const defaultCollection = await DemoCollectionService.ensureDefaultCollection();
			finalCollectionId = defaultCollection.id;
		}

		const index = data.containers.findIndex(c => c.id === noteId && c.user_id === DEMO_USER_ID);
		if (index === -1) {
			throw new Error('Container not found');
		}

		data.containers[index].collection_id = finalCollectionId;
		data.containers[index].updated_at = new Date().toISOString();

		saveDemoData(data);
	}

	static async reorderNoteContainers(
		collectionId: string,
		fromIndex: number,
		toIndex: number
	): Promise<NoteContainer[]> {
		const data = ensureDemoData();
		const containers = data.containers
			.filter(c => c.collection_id === collectionId && c.user_id === DEMO_USER_ID)
			.sort((a, b) => a.sequence - b.sequence);

		// Reorder
		const [moved] = containers.splice(fromIndex, 1);
		containers.splice(toIndex, 0, moved);

		// Update sequences
		containers.forEach((c, i) => {
			c.sequence = i;
			const dataIndex = data.containers.findIndex(dc => dc.id === c.id);
			if (dataIndex !== -1) {
				data.containers[dataIndex].sequence = i;
			}
		});

		saveDemoData(data);
		return this.getNoteContainers(collectionId);
	}
}

// ============================================
// SECTION OPERATIONS
// ============================================

export class DemoSectionService {
	static async getSections(noteContainerId: string): Promise<NoteSection[]> {
		const data = ensureDemoData();
		return data.sections
			.filter(s => s.note_container_id === noteContainerId)
			.sort((a, b) => a.sequence - b.sequence) as NoteSection[];
	}

	static async getSection(id: string): Promise<NoteSection | null> {
		const data = ensureDemoData();
		const section = data.sections.find(s => s.id === id);
		return (section as NoteSection) || null;
	}

	static async createSection(section: CreateNoteSection): Promise<NoteSection> {
		const data = ensureDemoData();
		const now = new Date().toISOString();

		// Get next sequence for this container
		const sectionsInContainer = data.sections.filter(s => s.note_container_id === section.note_container_id);
		const maxSequence = Math.max(0, ...sectionsInContainer.map(s => s.sequence));

		const newSection: DemoSection = {
			id: crypto.randomUUID(),
			note_container_id: section.note_container_id,
			user_id: DEMO_USER_ID,
			type: section.type,
			title: section.title || null,
			content: section.content || '',
			sequence: section.sequence ?? maxSequence + 1,
			meta: section.meta || {},
			checklist_data: section.checklist_data || null,
			created_at: now,
			updated_at: now
		};

		data.sections.push(newSection);

		// Update container timestamp
		const containerIndex = data.containers.findIndex(c => c.id === section.note_container_id);
		if (containerIndex !== -1) {
			data.containers[containerIndex].updated_at = now;
		}

		saveDemoData(data);
		return newSection as NoteSection;
	}

	static async updateSection(
		id: string,
		updates: Partial<CreateNoteSection> & { sequence?: number }
	): Promise<NoteSection> {
		const data = ensureDemoData();
		const now = new Date().toISOString();
		const index = data.sections.findIndex(s => s.id === id);

		if (index === -1) {
			throw new Error('Section not found');
		}

		data.sections[index] = {
			...data.sections[index],
			...updates,
			updated_at: now
		};

		// Update container timestamp
		const containerIndex = data.containers.findIndex(
			c => c.id === data.sections[index].note_container_id
		);
		if (containerIndex !== -1) {
			data.containers[containerIndex].updated_at = now;
		}

		saveDemoData(data);
		return data.sections[index] as NoteSection;
	}

	static async updateSectionTitle(id: string, title: string | null): Promise<NoteSection> {
		return this.updateSection(id, { title });
	}

	static async updateChecklistItem(
		sectionId: string,
		lineIndex: number,
		checked: boolean,
		checklistData: Array<{ text: string; checked: boolean; priority?: string; dueDate?: string }>
	): Promise<void> {
		const data = ensureDemoData();
		const index = data.sections.findIndex(s => s.id === sectionId);

		if (index === -1) {
			throw new Error('Section not found');
		}

		if (checklistData[lineIndex]) {
			checklistData[lineIndex].checked = checked;
		}

		data.sections[index].checklist_data = checklistData;
		data.sections[index].updated_at = new Date().toISOString();

		saveDemoData(data);
	}

	static async deleteSection(id: string): Promise<void> {
		const data = ensureDemoData();
		data.sections = data.sections.filter(s => s.id !== id);
		saveDemoData(data);
	}

	static async reorderSections(
		noteContainerId: string,
		fromIndex: number,
		toIndex: number
	): Promise<NoteSection[]> {
		const data = ensureDemoData();
		const sections = data.sections
			.filter(s => s.note_container_id === noteContainerId)
			.sort((a, b) => a.sequence - b.sequence);

		// Reorder
		const [moved] = sections.splice(fromIndex, 1);
		sections.splice(toIndex, 0, moved);

		// Update sequences
		sections.forEach((s, i) => {
			s.sequence = i;
			const dataIndex = data.sections.findIndex(ds => ds.id === s.id);
			if (dataIndex !== -1) {
				data.sections[dataIndex].sequence = i;
			}
		});

		saveDemoData(data);
		return sections as NoteSection[];
	}

	static async moveSectionToContainer(
		sectionId: string,
		newContainerId: string
	): Promise<NoteSection> {
		const data = ensureDemoData();
		const now = new Date().toISOString();
		const index = data.sections.findIndex(s => s.id === sectionId);

		if (index === -1) {
			throw new Error('Section not found');
		}

		data.sections[index].note_container_id = newContainerId;
		data.sections[index].updated_at = now;

		// Update both container timestamps
		data.containers.forEach(c => {
			if (c.id === newContainerId) {
				c.updated_at = now;
			}
		});

		saveDemoData(data);
		return data.sections[index] as NoteSection;
	}
}

// ============================================
// USER PREFERENCES OPERATIONS
// ============================================

export class DemoUserService {
	static async getUserPreferences(): Promise<DemoPreferences | null> {
		const data = getDemoData();
		return data?.preferences || null;
	}

	static async ensureUserPreferences(): Promise<DemoPreferences> {
		const data = ensureDemoData();

		if (!data.preferences) {
			const now = new Date().toISOString();
			data.preferences = {
				id: crypto.randomUUID(),
				user_id: DEMO_USER_ID,
				theme: 'light',
				default_editor: 'wysiwyg',
				auto_save_delay: 2000,
				keyboard_shortcuts: {},
				created_at: now,
				updated_at: now
			};
			saveDemoData(data);
		}

		return data.preferences;
	}

	static async getLastVisitedContainerId(): Promise<string | null> {
		const prefs = await this.getUserPreferences();
		return prefs?.last_visited_container_id || null;
	}

	static async updateLastVisitedContainer(containerId: string): Promise<void> {
		const data = ensureDemoData();
		await this.ensureUserPreferences();

		data.preferences.last_visited_container_id = containerId;
		data.preferences.updated_at = new Date().toISOString();

		saveDemoData(data);
	}

	static async getContainerCollection(containerId: string): Promise<string | null> {
		const data = ensureDemoData();
		const container = data.containers.find(
			c => c.id === containerId && c.user_id === DEMO_USER_ID
		);
		return container?.collection_id || null;
	}

	static async getLastVisitedCollectionId(): Promise<string | null> {
		const prefs = await this.getUserPreferences();
		return prefs?.last_visited_collection_id || null;
	}

	static async updateLastVisitedCollection(collectionId: string): Promise<void> {
		const data = ensureDemoData();
		await this.ensureUserPreferences();

		data.preferences.last_visited_collection_id = collectionId;
		data.preferences.updated_at = new Date().toISOString();

		saveDemoData(data);
	}

	static async updateUserPreferences(
		updates: Partial<Omit<DemoPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
	): Promise<DemoPreferences> {
		const data = ensureDemoData();
		await this.ensureUserPreferences();

		data.preferences = {
			...data.preferences,
			...updates,
			updated_at: new Date().toISOString()
		};

		saveDemoData(data);
		return data.preferences;
	}

	static async clearLastVisitedContainer(): Promise<void> {
		const data = ensureDemoData();
		if (data.preferences) {
			delete data.preferences.last_visited_container_id;
			data.preferences.updated_at = new Date().toISOString();
			saveDemoData(data);
		}
	}

	static async clearLastVisitedCollection(): Promise<void> {
		const data = ensureDemoData();
		if (data.preferences) {
			delete data.preferences.last_visited_collection_id;
			data.preferences.updated_at = new Date().toISOString();
			saveDemoData(data);
		}
	}
}

// ============================================
// SEQUENCE OPERATIONS
// ============================================

export class DemoSequenceService {
	static async getNextCollectionSequence(): Promise<number> {
		const data = ensureDemoData();
		const maxSequence = Math.max(0, ...data.collections.map(c => c.sequence));
		return maxSequence + 1;
	}

	static async getNextNoteContainerSequence(collectionId: string): Promise<number> {
		const data = ensureDemoData();
		const containers = data.containers.filter(c => c.collection_id === collectionId);
		const maxSequence = Math.max(0, ...containers.map(c => c.sequence));
		return maxSequence + 1;
	}

	static async getNextNoteSectionSequence(noteContainerId: string): Promise<number> {
		const data = ensureDemoData();
		const sections = data.sections.filter(s => s.note_container_id === noteContainerId);
		const maxSequence = Math.max(0, ...sections.map(s => s.sequence));
		return maxSequence + 1;
	}
}
