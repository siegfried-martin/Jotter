// src/lib/components/containers/ContainerItemDrop.ts
import type { NoteContainer } from '$lib/types';

export interface DropAttributes {
  'data-drop-zone': string;
  'data-container-id': string;
  'data-item-index': number;
}

export function createContainerItemDrop(container: NoteContainer, itemIndex: number) {
  
  // Generate the drop zone attributes for cross-container drops
  function getDropAttributes(): DropAttributes {
    return {
      'data-drop-zone': `container-${container.id}`,
      'data-container-id': container.id,
      'data-item-index': itemIndex
    };
  }

  // Check if this container can accept a drop from the given source
  function canAcceptDrop(sourceContainerId: string, draggedItemType: string): boolean {
    // Can't drop on the same container
    if (sourceContainerId === container.id) {
      return false;
    }
    
    // Currently only sections can be dropped on containers
    if (draggedItemType !== 'section') {
      return false;
    }
    
    return true;
  }

  // Validate a potential cross-container drop operation
  function validateCrossContainerDrop(
    sectionId: string,
    fromContainerId: string,
    toContainerId: string
  ): { isValid: boolean; reason?: string } {
    if (!sectionId) {
      return { isValid: false, reason: 'No section ID provided' };
    }
    
    if (!fromContainerId) {
      return { isValid: false, reason: 'No source container ID provided' };
    }
    
    if (!toContainerId) {
      return { isValid: false, reason: 'No target container ID provided' };
    }
    
    if (fromContainerId === toContainerId) {
      return { isValid: false, reason: 'Cannot drop on the same container' };
    }
    
    if (toContainerId !== container.id) {
      return { isValid: false, reason: 'Target container ID does not match this container' };
    }
    
    return { isValid: true };
  }

  // Generate the title attribute for accessibility
  function getDropTitle(isCollapsed: boolean, isReceivingDrag: boolean): string {
    if (isCollapsed) {
      if (isReceivingDrag) {
        return `Drop section into ${container.title}`;
      }
      return container.title;
    }
    return '';
  }

  return {
    getDropAttributes,
    canAcceptDrop,
    validateCrossContainerDrop,
    getDropTitle
  };
}