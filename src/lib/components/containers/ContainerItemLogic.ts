// src/lib/components/containers/ContainerItemLogic.ts
import type { EventDispatcher } from 'svelte';
import { dragStore, dragActions } from '$lib/stores/dragStore.DELETE';
import { get } from 'svelte/store';
import type { NoteContainer } from '$lib/types';

export interface ContainerItemEvents {
  select: NoteContainer;
  delete: string;
  crossContainerDrop: {
    sectionId: string;
    fromContainer: string;
    toContainer: string;
  };
}

export function createContainerItemLogic(container: NoteContainer, dispatch: EventDispatcher<ContainerItemEvents>) {

  // Cross-container drop support - using get() to access store values
  function getIsDragTarget() {
    const store = get(dragStore);
    return store.isDragging && 
           store.dragOverTargetContainer === container.id && 
           store.dragOverTargetType === 'container';
  }

  function getIsReceivingDrag() {
    const store = get(dragStore);
    return store.isDragging && 
           store.draggedFromContainer !== container.id &&
           store.draggedItem;
  }

  function getIsAnyItemBeingDragged() {
    const store = get(dragStore);
    return store.isDragging && store.itemType === 'section';
  }

  // Event handlers
  function handleClick() {
    const store = get(dragStore);
    if (!store.isDragging) {
      dispatch('select', container);
    }
  }

  function handleContainerClick() {
    handleClick();
  }

  function handleMouseEnter() {
    if (getIsReceivingDrag()) {
      // dragActions.setDragOverTarget(container.id, 'container');
    }
  }

  function handleMouseLeave() {
    if (getIsDragTarget()) {
      // dragActions.setDragOverTarget(null, null);
    }
  }

  function handleDeleteClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    console.log('handleDeleteClick from ContainerItemLogic');
    dispatch('delete', container.id);
  }

  // Handle cross-container drop when in receiving mode
  function handleDropTarget() {
    const store = get(dragStore);
    if (getIsDragTarget() && store.draggedItem) {
      dispatch('crossContainerDrop', {
        sectionId: store.draggedItem.id,
        fromContainer: store.draggedFromContainer!,
        toContainer: container.id
      });
      
      dragActions.endDrag();
    }
  }

  // Date formatting utility
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    if (diffDays < 2) return 'Yesterday';
    return `${Math.floor(diffDays)} days ago`;
  }

  return {
    // State getters
    getIsDragTarget,
    getIsReceivingDrag,
    getIsAnyItemBeingDragged,
    
    // Event handlers
    handleClick,
    handleContainerClick,
    handleMouseEnter,
    handleMouseLeave,
    handleDeleteClick,
    handleDropTarget,
    
    // Utilities
    formatDate
  };
}