// src/lib/dnd/behaviors/ContainerDragBehavior.ts
import type { DragBehavior, PreviewConfig, GhostConfig } from './DragBehavior';
import type { DropResult } from '../core/DragCore';
import type { NoteContainer } from '$lib/types';

export class ContainerDragBehavior implements DragBehavior {
  readonly itemType = 'container';

  constructor(
    private onReorder: (result: DropResult) => Promise<void>,
    private onMoveToCollection: (result: DropResult) => Promise<void>
  ) {}

  canDragFrom(zoneId: string): boolean {
    // Containers can be dragged from container lists
    return zoneId === 'container-list';
  }

  canDropTo(zoneId: string, sourceZone: string, itemIndex?: number): boolean {
    // Containers can drop to:
    // 1. Same container list (reorder)
    // 2. Collection zones (move to different collection)
    return zoneId === 'container-list' || 
           zoneId.startsWith('collection-');
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
    items: NoteContainer[]
  ): PreviewConfig {
    // Collection highlight
    if (targetZone.startsWith('collection-') && targetZone !== sourceZone) {
      return {
        type: 'highlight',
        targetZone
      };
    }

    // Same-list reorder
    if (targetZone === sourceZone && targetIndex !== undefined) {
      return {
        type: 'reorder',
        targetZone,
        targetIndex,
        visualLayout: this.createReorderLayout(items, targetIndex)
      };
    }

    return { type: 'none' };
  }

  private createReorderLayout(
    originalItems: NoteContainer[],
    targetIndex: number
  ): NoteContainer[] {
    // For containers, we'll implement this when we integrate with the actual drag state
    // For now, return original items
    return originalItems;
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
    console.log('🎯 ContainerDragBehavior handling drop:', result);

    if (result.targetType === 'highlight') {
      // Move to collection
      await this.onMoveToCollection(result);
    } else if (result.targetType === 'reorder') {
      // Same-list reorder
      await this.onReorder(result);
    } else {
      console.warn('Unknown drop type:', result.targetType);
    }
  }
}

// Factory function to create behavior with page-specific handlers
export function createContainerDragBehavior(
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>,
  onMoveToCollection?: (containerId: string, fromCollection: string, toCollection: string) => Promise<void>
): ContainerDragBehavior {
  
  const handleReorder = async (result: DropResult) => {
    await onReorder(result.sourceIndex, result.targetIndex!);
  };

  const handleMoveToCollection = async (result: DropResult) => {
    if (onMoveToCollection) {
      const fromCollection = 'current'; // TODO: Get from context
      const toCollection = result.targetZone.replace('collection-', '');
      await onMoveToCollection(result.item.id, fromCollection, toCollection);
    } else {
      console.warn('Move to collection not implemented');
    }
  };

  return new ContainerDragBehavior(handleReorder, handleMoveToCollection);
}