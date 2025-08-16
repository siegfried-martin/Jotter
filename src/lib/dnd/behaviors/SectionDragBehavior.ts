// src/lib/dnd/behaviors/SectionDragBehavior.ts
import type { DragBehavior, PreviewConfig, GhostConfig } from './DragBehavior';
import type { DropResult } from '../core/DragCore';
import type { NoteSection } from '$lib/types';

export class SectionDragBehavior implements DragBehavior {
  readonly itemType = 'section';

  constructor(
    private onReorder: (result: DropResult) => Promise<void>,
    private onCrossContainerMove: (result: DropResult) => Promise<void>
  ) {}

  canDragFrom(zoneId: string): boolean {
    // Sections can be dragged from any section grid
    return zoneId.startsWith('section-grid-');
  }

  canDropTo(zoneId: string, sourceZone: string, itemIndex?: number): boolean {
    // Sections can drop to:
    // 1. Same section grid (reorder)
    // 2. Different section grid (cross-container move) 
    // 3. Container zones (cross-container move)
    return zoneId.startsWith('section-grid-') || 
           zoneId.startsWith('container-');
  }

  createGhost(item: NoteSection): GhostConfig {
    const title = item.title || (item.type.charAt(0).toUpperCase() + item.type.slice(1));
    
    return {
      content: `
        <div class="ghost-content">
          <div class="ghost-header">
            <span class="ghost-type">${item.type}</span>
            <span class="ghost-title">${title}</span>
          </div>
        </div>
      `,
      className: 'section-drag-ghost',
      style: {
        background: 'white',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        opacity: '0.9',
        transform: 'rotate(3deg)',
        width: '300px',
        pointerEvents: 'none',
        zIndex: '1000'
      }
    };
  }

  createPreview(
    sourceZone: string,
    targetZone: string,
    targetIndex: number | undefined,
    items: any[],
    draggedItem?: any // NEW: The actual dragged item
  ): PreviewConfig {
    console.log('🎨 SectionDragBehavior.createPreview called:', {
      sourceZone,
      targetZone,
      targetIndex,
      itemCount: items.length,
      draggedItem: draggedItem?.id
    });

    // Cross-container highlight
    if (targetZone.startsWith('container-') && targetZone !== sourceZone) {
      return {
        type: 'highlight',
        targetZone
      };
    }

    // Same-container reorder
    if (targetZone === sourceZone && targetIndex !== undefined && draggedItem) {
      const visualLayout = this.createReorderLayout(items, targetIndex, draggedItem);
      
      return {
        type: 'reorder',
        targetZone,
        targetIndex,
        visualLayout
      };
    }

    // Different section grid (cross-container)
    if (targetZone.startsWith('section-grid-') && targetZone !== sourceZone) {
      return {
        type: 'highlight',
        targetZone
      };
    }

    return { type: 'none' };
  }

  private createReorderLayout(
    originalItems: any[],
    targetIndex: number,
    draggedItem: any
  ): any[] {
    if (!originalItems || originalItems.length === 0) {
      console.warn('No items provided for reorder layout');
      return originalItems;
    }

    console.log('🎨 Creating reorder layout:', {
      originalCount: originalItems.length,
      targetIndex,
      draggedItemId: draggedItem.id
    });

    // Create reordered layout
    const itemsWithoutDragged = originalItems.filter(item => item.id !== draggedItem.id);
    const newLayout = [...itemsWithoutDragged];
    newLayout.splice(targetIndex, 0, draggedItem);

    console.log('✅ Reorder layout created:', {
      originalOrder: originalItems.map(i => i.id),
      newOrder: newLayout.map(i => i.id)
    });

    return newLayout;
  }

  validateDrop(result: DropResult): boolean {
    // Basic validation
    if (!result.item || !result.sourceZone || !result.targetZone) {
      return false;
    }

    // Can't drop on same position
    if (result.sourceZone === result.targetZone && 
        result.sourceIndex === result.targetIndex) {
      return false;
    }

    return true;
  }

  async onDrop(result: DropResult): Promise<void> {
    console.log('🎯 SectionDragBehavior handling drop:', result);

    if (result.targetType === 'highlight') {
      // Cross-container move
      await this.onCrossContainerMove(result);
    } else if (result.targetType === 'reorder') {
      // Same-container reorder
      await this.onReorder(result);
    } else {
      console.warn('Unknown drop type:', result.targetType);
    }
  }
}

// Factory function to create behavior with page-specific handlers
export function createSectionDragBehavior(
  onReorder: (fromIndex: number, toIndex: number, containerId: string) => Promise<void>,
  onCrossContainerMove: (sectionId: string, fromContainer: string, toContainer: string) => Promise<void>
): SectionDragBehavior {
  
  const handleReorder = async (result: DropResult) => {
    const containerId = result.sourceZone.replace('section-grid-', '');
    await onReorder(result.sourceIndex, result.targetIndex!, containerId);
  };

  const handleCrossContainerMove = async (result: DropResult) => {
    const fromContainer = result.sourceZone.replace('section-grid-', '');
    const toContainer = result.targetZone.replace('container-', '');
    await onCrossContainerMove(result.item.id, fromContainer, toContainer);
  };

  return new SectionDragBehavior(handleReorder, handleCrossContainerMove);
}