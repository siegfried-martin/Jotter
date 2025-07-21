// src/lib/composables/useNoteContainerDnD.ts
import { NoteService } from '$lib/services/noteService';
import type { NoteContainer } from '$lib/types';

export interface UseNoteContainerDnDOptions {
  collectionId: string;
  onSuccess?: (containers: NoteContainer[]) => void;
  onError?: (error: Error) => void;
}

export function useNoteContainerDnD(options: UseNoteContainerDnDOptions) {
  const { collectionId, onSuccess, onError } = options;

  /**
   * Handle drag & drop reordering of note containers
   */
  async function handleReorder(fromIndex: number, toIndex: number): Promise<void> {
    try {
      console.log('🔄 Reordering note containers:', { 
        collectionId, 
        fromIndex, 
        toIndex 
      });

      // Call the service to reorder containers - this returns the updated list from server
      const updatedContainers = await NoteService.reorderNoteContainers(
        collectionId,
        fromIndex,
        toIndex
      );

      console.log('✅ Note containers reordered successfully');
      
      // Notify parent component of success with the server response
      if (onSuccess) {
        onSuccess(updatedContainers);
      }

    } catch (error) {
      console.error('❌ Failed to reorder note containers:', error);
      
      // Notify parent component of error
      if (onError) {
        onError(error as Error);
      }
    }
  }

  /**
   * Move a specific note container to a new position
   */
  async function moveToPosition(
    noteContainerId: string, 
    newPosition: number
  ): Promise<void> {
    try {
      console.log('🎯 Moving note container to position:', { 
        noteContainerId, 
        newPosition, 
        collectionId 
      });

      const updatedContainers = await NoteService.moveNoteContainerToPosition(
        collectionId,
        noteContainerId,
        newPosition
      );

      console.log('✅ Note container moved successfully');
      
      if (onSuccess) {
        onSuccess(updatedContainers);
      }

    } catch (error) {
      console.error('❌ Failed to move note container:', error);
      
      if (onError) {
        onError(error as Error);
      }
    }
  }

  return {
    handleReorder,
    moveToPosition
  };
}