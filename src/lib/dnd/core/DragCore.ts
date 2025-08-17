// src/lib/dnd/core/DragCore.ts

export interface Point {
  x: number;
  y: number;
}

export interface DropTarget {
  zoneId: string;
  itemIndex?: number;
  targetType: 'reorder' | 'highlight';
  containerId?: string; // NEW: For cross-container drops
}

export interface DropResult {
  item: any;
  itemType: string; // NEW: Include itemType for behavior registry
  sourceZone: string;
  sourceIndex: number;
  targetZone: string;
  targetIndex?: number;
  targetType: 'reorder' | 'highlight';
  containerId?: string; // NEW: For cross-container drops
}

export interface DragState {
  phase: 'idle' | 'detection' | 'dragging';
  item: any | null;
  itemType: string | null;
  sourceZone: string | null;
  sourceIndex: number;
  startPosition: Point | null;
  currentPosition: Point | null;
  dragDistance: number;
  dropTarget: DropTarget | null;
  ghostElement: HTMLElement | null;
}

export class DragCore {
  private state: DragState = {
    phase: 'idle',
    item: null,
    itemType: null,
    sourceZone: null,
    sourceIndex: -1,
    startPosition: null,
    currentPosition: null,
    dragDistance: 0,
    dropTarget: null,
    ghostElement: null
  };

  private stateSubscribers: Array<(state: DragState) => void> = [];
  private readonly DRAG_THRESHOLD = 8;

  // Svelte store interface
  get store() {
    return {
      subscribe: (callback: (state: DragState) => void) => {
        this.stateSubscribers.push(callback);
        callback(this.state); // Send current state immediately
        
        return () => {
          const index = this.stateSubscribers.indexOf(callback);
          if (index > -1) {
            this.stateSubscribers.splice(index, 1);
          }
        };
      }
    };
  }

  private notifySubscribers(): void {
    this.stateSubscribers.forEach(callback => callback({ ...this.state }));
  }

  startDetection(item: any, itemType: string, zoneId: string, itemIndex: number, position: Point): void {
    console.log('🎯 DragCore: Starting detection phase', { item: item.id, itemType, zoneId, itemIndex });
    
    this.state = {
      phase: 'detection',
      item,
      itemType,
      sourceZone: zoneId,
      sourceIndex: itemIndex,
      startPosition: position,
      currentPosition: position,
      dragDistance: 0,
      dropTarget: null,
      ghostElement: null
    };
    
    this.notifySubscribers();
  }

  updatePosition(position: Point): void {
    if (this.state.phase === 'idle') return;
    
    this.state.currentPosition = position;
    
    if (this.state.startPosition) {
      const deltaX = position.x - this.state.startPosition.x;
      const deltaY = position.y - this.state.startPosition.y;
      this.state.dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    
    this.notifySubscribers();
  }

  shouldStartDrag(): boolean {
    return this.state.phase === 'detection' && this.state.dragDistance >= this.DRAG_THRESHOLD;
  }

  shouldTriggerClick(): boolean {
    return this.state.phase === 'detection' && this.state.dragDistance < this.DRAG_THRESHOLD;
  }

  startDrag(): void {
    if (this.state.phase !== 'detection') return;
    
    console.log('🚀 DragCore: Starting drag phase', { 
      item: this.state.item?.id, 
      distance: this.state.dragDistance 
    });
    
    this.state.phase = 'dragging';
    this.notifySubscribers();
  }

  updateDropTarget(target: DropTarget | null): void {
    if (this.state.phase !== 'dragging') return;
    
    console.log('🎯 DragCore: Updating drop target', target);
    this.state.dropTarget = target;
    this.notifySubscribers();
  }

  // Alias for backward compatibility
  setDropTarget(target: DropTarget | null): void {
    this.updateDropTarget(target);
  }

  setGhostElement(element: HTMLElement | null): void {
    this.state.ghostElement = element;
    this.notifySubscribers();
  }

  endDrag(): DropResult | null {
    if (this.state.phase !== 'dragging') {
      console.warn('⚠️ DragCore: Attempted to end drag when not dragging');
      return null;
    }

    const result: DropResult | null = this.state.dropTarget ? {
      item: this.state.item,
      itemType: this.state.itemType!, // NEW: Include itemType in result
      sourceZone: this.state.sourceZone!,
      sourceIndex: this.state.sourceIndex,
      targetZone: this.state.dropTarget.zoneId,
      targetIndex: this.state.dropTarget.itemIndex,
      targetType: this.state.dropTarget.targetType,
      containerId: this.state.dropTarget.containerId // NEW: Include container ID
    } : null;

    console.log('🏁 DragCore: Ending drag', { result });

    // Reset state
    this.state = {
      phase: 'idle',
      item: null,
      itemType: null,
      sourceZone: null,
      sourceIndex: -1,
      startPosition: null,
      currentPosition: null,
      dragDistance: 0,
      dropTarget: null,
      ghostElement: null
    };

    this.notifySubscribers();
    return result;
  }

  cancel(): void {
    console.log('❌ DragCore: Canceling drag operation');
    
    this.state = {
      phase: 'idle',
      item: null,
      itemType: null,
      sourceZone: null,
      sourceIndex: -1,
      startPosition: null,
      currentPosition: null,
      dragDistance: 0,
      dropTarget: null,
      ghostElement: null
    };
    
    this.notifySubscribers();
  }

  // Alias for backward compatibility
  cancelDrag(): void {
    this.cancel();
  }

  // Getter methods for external access
  get currentState(): DragState {
    return { ...this.state };
  }

  // Method for backward compatibility with DragProvider
  getCurrentState(): DragState {
    return { ...this.state };
  }

  // Method overload for backward compatibility with DragProvider
  isDragging(itemType?: string): boolean {
    if (itemType) {
      return this.state.phase === 'dragging' && this.state.itemType === itemType;
    }
    return this.state.phase === 'dragging';
  }

  isDetecting(itemType?: string): boolean {
    if (itemType) {
      return this.state.phase === 'detection' && this.state.itemType === itemType;
    }
    return this.state.phase === 'detection';
  }

  get draggedItem(): any | null {
    return this.state.item;
  }

  get draggedItemType(): string | null {
    return this.state.itemType;
  }
}