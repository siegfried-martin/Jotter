// src/lib/dnd/core/DragTargetDetection.ts
import type { DropTarget } from './DragCore';
import type { DragConfig } from './DragDetection';

export interface TargetDetectionResult {
  isValidTarget: boolean;
  dropTarget: DropTarget | null;
  shouldHighlight: boolean;
  highlightType?: 'container' | 'section';
}

export class DragTargetDetection {
  
  constructor(
    private updateDropTargetCallback: (target: DropTarget | null) => void
  ) {}

  // Main method to detect and handle drag targets
  detectTarget(event: PointerEvent, activeConfig: DragConfig): TargetDetectionResult {
    // Find the element under the pointer
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    
    // Look for card-sized drop zones (DraggableContainers)
    const dropZone = elementBelow?.closest('[data-drop-zone]');

    console.log('🔍 DROP ZONE Detection:', {
      elementBelow: elementBelow?.tagName,
      dropZone: dropZone?.tagName,
      insertPosition: dropZone?.getAttribute('data-insert-position'),
      zoneId: dropZone?.getAttribute('data-drop-zone'),
      itemId: dropZone?.getAttribute('data-item-id'),
      containerId: dropZone?.getAttribute('data-container-id')
    });
    
    if (!dropZone || !activeConfig) {
      return {
        isValidTarget: false,
        dropTarget: null,
        shouldHighlight: false
      };
    }

    const zoneId = dropZone.getAttribute('data-drop-zone');
    const insertPosition = dropZone.getAttribute('data-insert-position');
    const targetItemId = dropZone.getAttribute('data-item-id');
    const containerId = dropZone.getAttribute('data-container-id');
    
    if (!zoneId) {
      return {
        isValidTarget: false,
        dropTarget: null,
        shouldHighlight: false
      };
    }

    // Don't target ourselves UNLESS this is a valid reorder operation
    if (targetItemId === activeConfig.item.id) {
      const isAtOriginalPosition = zoneId === activeConfig.zoneId && 
                                 parseInt(insertPosition || '0') === activeConfig.itemIndex;
      
      if (isAtOriginalPosition) {
        console.log('🎯 Ignoring self-target at original position');
        return {
          isValidTarget: false,
          dropTarget: null,
          shouldHighlight: false
        };
      } else {
        console.log('🎯 Allowing self-target during live reorder - item moved to new position');
        // Continue with normal targeting logic
      }
    }
    
    // TYPE-AWARE LOGIC: Different behavior based on what's being dragged
    if (activeConfig.itemType === 'section') {
      return this.handleSectionTarget(zoneId, insertPosition, containerId, activeConfig);
    } else if (activeConfig.itemType === 'container') {
      return this.handleContainerTarget(zoneId, insertPosition, activeConfig);
    }

    return {
      isValidTarget: false,
      dropTarget: null,
      shouldHighlight: false
    };
  }

  private handleSectionTarget(
    zoneId: string, 
    insertPosition: string | null, 
    containerId: string | null, 
    activeConfig: DragConfig
  ): TargetDetectionResult {
    console.log('🎯 Section drag targeting:', {
      zoneId,
      insertPosition,
      containerId,
      sourceZone: activeConfig.zoneId
    });

    // Case 1: Section-to-section drop (same container reordering)
    if (zoneId.startsWith('section-grid-') && insertPosition) {
      return this.handleSectionToSectionTarget(zoneId, insertPosition, activeConfig);
    }
    
    // Case 2: Section-to-container drop (cross-container move)
    else if (zoneId.startsWith('container-') && containerId) {
      return this.handleSectionToContainerTarget(zoneId, containerId, activeConfig);
    }

    return {
      isValidTarget: false,
      dropTarget: null,
      shouldHighlight: false
    };
  }

  private handleSectionToSectionTarget(
    zoneId: string, 
    insertPosition: string, 
    activeConfig: DragConfig
  ): TargetDetectionResult {
    const targetIndex = parseInt(insertPosition);
    
    if (isNaN(targetIndex)) {
      return {
        isValidTarget: false,
        dropTarget: null,
        shouldHighlight: false
      };
    }

    const sourceIndex = activeConfig.itemIndex;
    
    console.log('🎯 Section CARD targeting:', {
      sourceIndex,
      targetIndex,
      zoneId,
      sourceZone: activeConfig.zoneId,
      isSameZone: zoneId === activeConfig.zoneId
    });
    
    // Same-container reordering
    if (zoneId === activeConfig.zoneId) {
      // Target the hovered card's position
      if (targetIndex !== sourceIndex) {
        console.log('🎯 Section reordering: target position', targetIndex);
        
        const dropTarget: DropTarget = {
          zoneId,
          itemIndex: targetIndex,
          targetType: 'reorder'
        };
        
        this.updateDropTargetCallback(dropTarget);
        
        return {
          isValidTarget: true,
          dropTarget,
          shouldHighlight: true,
          highlightType: 'section'
        };
      } else {
        console.log('🎯 No order change needed - targeting self');
        return {
          isValidTarget: false,
          dropTarget: null,
          shouldHighlight: false
        };
      }
    }

    // Cross-container section moves would be handled separately
    return {
      isValidTarget: false,
      dropTarget: null,
      shouldHighlight: false
    };
  }

  private handleSectionToContainerTarget(
    zoneId: string, 
    containerId: string, 
    activeConfig: DragConfig
  ): TargetDetectionResult {
    const sourceContainerId = activeConfig.zoneId.replace('section-grid-', '');
    
    console.log('🎯 Section-to-container targeting:', {
      sourceContainer: sourceContainerId,
      targetContainer: containerId,
      sectionId: activeConfig.item.id
    });
    
    // Don't allow dropping on the same container
    if (sourceContainerId !== containerId) {
      console.log('✅ Valid cross-container target:', containerId);
      
      const dropTarget: DropTarget = {
        zoneId,
        itemIndex: undefined, // No specific index for container drops
        targetType: 'highlight',
        containerId: containerId
      };
      
      this.updateDropTargetCallback(dropTarget);
      
      return {
        isValidTarget: true,
        dropTarget,
        shouldHighlight: true,
        highlightType: 'container'
      };
    } else {
      console.log('🚫 Ignoring same-container target');
      return {
        isValidTarget: false,
        dropTarget: null,
        shouldHighlight: false
      };
    }
  }

  private handleContainerTarget(
    zoneId: string, 
    insertPosition: string | null, 
    activeConfig: DragConfig
  ): TargetDetectionResult {
    const targetIndex = parseInt(insertPosition || '0');
    
    if (isNaN(targetIndex)) {
      return {
        isValidTarget: false,
        dropTarget: null,
        shouldHighlight: false
      };
    }

    const sourceIndex = activeConfig.itemIndex;
    
    console.log('🎯 Container CARD targeting:', {
      sourceIndex,
      targetIndex,
      zoneId,
      sourceZone: activeConfig.zoneId
    });
    
    // Same logic as sections - target the hovered card's position
    if (zoneId === activeConfig.zoneId) {
      if (targetIndex !== sourceIndex) {
        console.log('🎯 Container reordering: target position', targetIndex);
        
        const dropTarget: DropTarget = {
          zoneId,
          itemIndex: targetIndex,
          targetType: 'reorder'
        };
        
        this.updateDropTargetCallback(dropTarget);
        
        return {
          isValidTarget: true,
          dropTarget,
          shouldHighlight: true,
          highlightType: 'container'
        };
      } else {
        return {
          isValidTarget: false,
          dropTarget: null,
          shouldHighlight: false
        };
      }
    }

    return {
      isValidTarget: false,
      dropTarget: null,
      shouldHighlight: false
    };
  }
}