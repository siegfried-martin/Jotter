// src/lib/stores/dragStore.ts
import { writable } from 'svelte/store';
import type { NoteSection, NoteContainer } from '$lib/types';

export type DragItemType = 'section' | 'container';

export interface DragState {
  isDragging: boolean;
  draggedItem: NoteSection | NoteContainer | null;
  itemType: DragItemType | null; // NEW: Track what type of item is being dragged
  draggedFromContainer: string | null;
  dragStartPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  dragOverContainer: string | null;
  dragOverIndex: number | null;
  dragStartTime: number | null;
  // Cross-container support (mainly for sections)
  dragOverTargetContainer: string | null;
  dragOverTargetType: 'section' | 'container' | null;
}

const initialState: DragState = {
  isDragging: false,
  draggedItem: null,
  itemType: null,
  draggedFromContainer: null,
  dragStartPosition: null,
  currentPosition: null,
  dragOverContainer: null,
  dragOverIndex: null,
  dragStartTime: null,
  dragOverTargetContainer: null,
  dragOverTargetType: null
};

export const dragStore = writable<DragState>(initialState);

export const dragActions = {
  startDrag: (
    item: NoteSection | NoteContainer, 
    itemType: DragItemType,
    fromContainer: string, 
    position: { x: number; y: number }
  ) => {
    dragStore.update(state => ({
      ...state,
      isDragging: true,
      draggedItem: item,
      itemType,
      draggedFromContainer: fromContainer,
      dragStartPosition: position,
      currentPosition: position,
      dragStartTime: Date.now()
    }));
  },

  updatePosition: (position: { x: number; y: number }) => {
    dragStore.update(state => ({
      ...state,
      currentPosition: position
    }));
  },

  setDragOver: (container: string | null, index: number | null) => {
    if (index === null) {
      console.log('🎯 No valid drop target found, setting to null in DragStore 1');
      console.trace()
    }
    dragStore.update(state => ({
      ...state,
      dragOverContainer: container,
      dragOverIndex: index,
      dragOverTargetType: container ? 'section' : null
    }));
  },

  // Cross-container target (mainly for sections moving to different containers)
  setDragOverTarget: (targetContainer: string | null, targetType: 'container' | null) => {
    dragStore.update(state => {
      console.log("setDragOverTarget targetContainer:", targetContainer, "targetType", targetType);
      console.log("state.dragOverContainer:", state.dragOverContainer, "state.dragOverIndex", state.dragOverIndex);
      console.trace();
      return {
        ...state,
        dragOverTargetContainer: targetContainer,
        dragOverTargetType: targetType,
        // Clear section-level drag over when targeting containers
        dragOverContainer: state.dragOverContainer, // Assign the value
        dragOverIndex: state.dragOverIndex
      };
    });
  },

  endDrag: () => {
    dragStore.set(initialState);
  },

  cancelDrag: () => {
    dragStore.set(initialState);
  }
};