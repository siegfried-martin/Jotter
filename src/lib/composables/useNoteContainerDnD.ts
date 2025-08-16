// src/lib/composables/useNoteContainerDnD.ts
import { NoteService } from '$lib/services/noteService';
import type { NoteContainer } from '$lib/types';

export interface UseNoteContainerDnDOptions {
  collectionId?: string; // Made optional since we'll set it when calling methods
  onSuccess?: (containers: NoteContainer[]) => void;
  onError?: (error: Error) => void;
}

export function useNoteContainerDnD(options: UseNoteContainerDnDOptions = {}) {
  const { onSuccess, onError } = options;

  /**
   * Handle drag & drop reordering of note containers
   */
  async function handleReorder(fromIndex: number, toIndex: number, collectionId?: string): Promise<void> {
    const targetCollectionId = collectionId || options.collectionId;
    
    if (!targetCollectionId) {
      const error = new Error('Collection ID is required for container reordering');
      console.error('❌ Missing collection ID for container reorder');
      if (onError) onError(error);
      throw error;
    }

    try {
      console.log('🔄 Reordering note containers:', { 
        collectionId: targetCollectionId, 
        fromIndex, 
        toIndex 
      });

      // Call the service to reorder containers - this returns the updated list from server
      const updatedContainers = await NoteService.reorderNoteContainers(
        targetCollectionId,
        fromIndex,
        toIndex
      );

      console.log('✅ Note containers reordered successfully');
      
      // Notify parent component of success with the server response
      if (onSuccess) {
        onSuccess(updatedContainers);
      }

      return updatedContainers;

    } catch (error) {
      console.error('❌ Failed to reorder note containers:', error);
      
      // Notify parent component of error
      if (onError) {
        onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Move a specific note container to a new position
   */
  async function moveToPosition(
    noteContainerId: string, 
    newPosition: number,
    collectionId?: string
  ): Promise<void> {
    const targetCollectionId = collectionId || options.collectionId;
    
    if (!targetCollectionId) {
      const error = new Error('Collection ID is required for container positioning');
      console.error('❌ Missing collection ID for container move');
      if (onError) onError(error);
      throw error;
    }

    try {
      console.log('🎯 Moving note container to position:', { 
        noteContainerId, 
        newPosition, 
        collectionId: targetCollectionId 
      });

      const updatedContainers = await NoteService.moveNoteContainerToPosition(
        targetCollectionId,
        noteContainerId,
        newPosition
      );

      console.log('✅ Note container moved successfully');
      
      if (onSuccess) {
        onSuccess(updatedContainers);
      }

      return updatedContainers;

    } catch (error) {
      console.error('❌ Failed to move note container:', error);
      
      if (onError) {
        onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Set the collection ID for this instance
   */
  function setCollectionId(collectionId: string) {
    options.collectionId = collectionId;
  }

  return {
    handleReorder,
    moveToPosition,
    setCollectionId
  };
}