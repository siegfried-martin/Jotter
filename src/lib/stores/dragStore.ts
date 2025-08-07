// src/lib/stores/dragStore.ts
import { writable } from 'svelte/store';
import type { NoteSection } from '$lib/types';

export interface DragState {
  isDragging: boolean;
  draggedItem: NoteSection | null;
  draggedFromContainer: string | null;
  dragStartPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  dragOverContainer: string | null;
  dragOverIndex: number | null;
  dragStartTime: number | null;
  // NEW: Cross-container support
  dragOverTargetContainer: string | null; // Different from dragOverContainer - this is for sidebar containers
  dragOverTargetType: 'section' | 'container' | null; // What type of target we're over
}

const initialState: DragState = {
  isDragging: false,
  draggedItem: null,
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
  startDrag: (item: NoteSection, fromContainer: string, position: { x: number; y: number }) => {
    dragStore.update(state => ({
      ...state,
      isDragging: true,
      draggedItem: item,
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
    dragStore.update(state => ({
      ...state,
      dragOverContainer: container,
      dragOverIndex: index,
      dragOverTargetType: container ? 'section' : null
    }));
  },

  // NEW: Set cross-container target
  setDragOverTarget: (targetContainer: string | null, targetType: 'container' | null) => {
    dragStore.update(state => ({
      ...state,
      dragOverTargetContainer: targetContainer,
      dragOverTargetType: targetType,
      // Clear section-level drag over when targeting containers
      dragOverContainer: targetType === 'container' ? null : state.dragOverContainer,
      dragOverIndex: targetType === 'container' ? null : state.dragOverIndex
    }));
  },

  endDrag: () => {
    dragStore.set(initialState);
  },

  cancelDrag: () => {
    dragStore.set(initialState);
  }
};