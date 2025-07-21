// src/lib/composables/useSortable.ts
// Reusable logic for different sortable contexts

import type { Collection, NoteContainer, NoteSection } from '$lib/types';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { SectionService } from '$lib/services/sectionService';

export interface SortableConfig<T> {
  items: T[];
  onReorder: (reorderedItems: T[]) => Promise<T[]>;
  onError?: (error: Error) => void;
}

/**
 * Collection sorting logic
 */
export function useCollectionSorting() {
  return {
    async reorderCollections(
      collections: Collection[],
      fromIndex: number,
      toIndex: number
    ): Promise<Collection[]> {
      try {
        return await CollectionService.reorderCollections(fromIndex, toIndex);
      } catch (error) {
        console.error('Failed to reorder collections:', error);
        throw error;
      }
    }
  };
}

/**
 * Note container sorting logic
 */
export function useNoteContainerSorting(collectionId: string) {
  return {
    async reorderNoteContainers(
      containers: NoteContainer[],
      fromIndex: number,
      toIndex: number
    ): Promise<NoteContainer[]> {
      try {
        return await NoteService.reorderNoteContainers(collectionId, fromIndex, toIndex);
      } catch (error) {
        console.error('Failed to reorder note containers:', error);
        throw error;
      }
    }
  };
}

/**
 * Note section sorting logic
 */
export function useNoteSectionSorting(noteContainerId: string) {
  return {
    async reorderNoteSections(
      sections: NoteSection[],
      fromIndex: number,
      toIndex: number
    ): Promise<NoteSection[]> {
      try {
        return await SectionService.reorderSections(noteContainerId, fromIndex, toIndex);
      } catch (error) {
        console.error('Failed to reorder sections:', error);
        throw error;
      }
    }
  };
}

/**
 * Generic sortable helper that handles optimistic updates
 */
export function createSortableHandler<T>(config: SortableConfig<T>) {
  let currentItems = [...config.items];

  return {
    async handleReorder(reorderedItems: T[]): Promise<void> {
      // Store original for rollback
      const originalItems = [...currentItems];
      
      // Optimistic update
      currentItems = reorderedItems;
      
      try {
        // Call the reorder function
        const updatedItems = await config.onReorder(reorderedItems);
        currentItems = updatedItems;
      } catch (error) {
        // Rollback on error
        currentItems = originalItems;
        if (config.onError) {
          config.onError(error as Error);
        }
        throw error;
      }
    },
    get items() {
      return currentItems;
    }
  };
}