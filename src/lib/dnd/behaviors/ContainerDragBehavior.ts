// src/lib/dnd/behaviors/ContainerDragBehavior.ts
import type { DragBehavior, PreviewConfig, GhostConfig } from './DragBehavior';
import type { DropResult } from '../core/DragCore';
import type { NoteContainer } from '$lib/types';

export class ContainerDragBehavior implements DragBehavior {
  readonly itemType = 'container';

  constructor(
    private onReorder: (result: DropResult) => Promise<void>
  ) {}

  canDragFrom(zoneId: string): boolean {
    // Containers can be dragged from container lists
    return zoneId === 'container-list';
  }

  canDropTo(zoneId: string, sourceZone: string, itemIndex?: number): boolean {
    // Containers can only drop to the same container list (reorder only)
    return zoneId === 'container-list' && zoneId === sourceZone;
  }

  createGhost(item: NoteContainer): GhostConfig {
    const color = this.getContainerColor(item.title);
    
    return {
      content: `
        <div class="ghost-content">
          <div class="ghost-header">
            <div class="ghost-avatar ${color}">
              <span class="ghost-avatar-text">${item.title.charAt(0).toUpperCase()}</span>
            </div>
            <span class="ghost-title">${item.title}</span>
          </div>
        </div>
      `,
      className: 'container-drag-ghost',
      style: {
        background: 'white',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        opacity: '0.9',
        transform: 'rotate(2deg)',
        width: '280px',
        pointerEvents: 'none',
        zIndex: '1000'
      }
    };
  }

  createPreview(
    sourceZone: string,
    targetZone: string,
    targetIndex: number | undefined,
    items: NoteContainer[],
    draggedItem?: NoteContainer
  ): PreviewConfig {
    console.log('🎨 ContainerDragBehavior.createPreview called:', {
      sourceZone,
      targetZone,
      targetIndex,
      itemCount: items.length,
      draggedItem: draggedItem?.id
    });

    // Same-list reorder (only supported operation)
    if (targetZone === sourceZone && targetIndex !== undefined && draggedItem) {
      console.log('🎨 Creating container reorder preview');
      const visualLayout = this.createReorderLayout(items, targetIndex, draggedItem);
      
      return {
        type: 'reorder',
        targetZone,
        targetIndex,
        visualLayout
      };
    }

    return { type: 'none' };
  }

  private createReorderLayout(
    originalItems: NoteContainer[],
    targetIndex: number,
    draggedItem: NoteContainer
  ): NoteContainer[] {
    if (!originalItems || originalItems.length === 0) {
      console.warn('No containers provided for reorder layout');
      return originalItems;
    }

    console.log('🎨 Creating container reorder layout:', {
      originalCount: originalItems.length,
      targetIndex,
      draggedContainerId: draggedItem.id
    });

    // Create reordered layout
    const itemsWithoutDragged = originalItems.filter(item => item.id !== draggedItem.id);
    const newLayout = [...itemsWithoutDragged];
    newLayout.splice(targetIndex, 0, draggedItem);

    console.log('✅ Container reorder layout created:', {
      originalOrder: originalItems.map(i => i.title),
      newOrder: newLayout.map(i => i.title)
    });

    return newLayout;
  }

  private getContainerColor(title: string): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ];
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  validateDrop(result: DropResult): boolean {
    // Basic validation
    if (!result.item || !result.sourceZone || !result.targetZone) {
      console.warn('🚫 Invalid drop: missing required fields');
      return false;
    }

    // Must be same zone (reorder only)
    if (result.sourceZone !== result.targetZone) {
      console.warn('🚫 Invalid drop: different zones not supported');
      return false;
    }

    // Can't drop on same position
    if (result.sourceIndex === result.targetIndex) {
      console.warn('🚫 Invalid drop: same position');
      return false;
    }

    console.log('✅ Valid container reorder drop:', {
      container: result.item.title,
      from: result.sourceIndex,
      to: result.targetIndex
    });

    return true;
  }

  async onDrop(result: DropResult): Promise<void> {
    console.log('🎯 ContainerDragBehavior handling drop:', result);

    if (!this.validateDrop(result)) {
      console.error('🚫 Drop validation failed');
      return;
    }

    // Only reorder supported for now
    if (result.targetType === 'reorder') {
      console.log('🚀 Executing container reorder');
      await this.onReorder(result);
    } else {
      console.warn('❓ Unknown drop type:', result.targetType);
    }
  }
}

// Factory function to create behavior with page-specific handlers
export function createContainerDragBehavior(
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>
): ContainerDragBehavior {
  
  const handleReorder = async (result: DropResult) => {
    console.log('📄 Handling container reorder:', {
      fromIndex: result.sourceIndex,
      toIndex: result.targetIndex,
      container: result.item.title
    });
    await onReorder(result.sourceIndex, result.targetIndex!);
  };

  return new ContainerDragBehavior(handleReorder);
}