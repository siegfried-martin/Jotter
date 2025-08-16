// src/lib/dnd/core/DragCore.ts
import { writable, type Writable } from 'svelte/store';

export interface Point {
  x: number;
  y: number;
}

export interface DropTarget {
  zoneId: string;
  itemIndex?: number;
  targetType: 'reorder' | 'highlight';
}

export interface DragState {
  phase: 'idle' | 'detecting' | 'dragging';
  item: any | null;
  itemType: string | null;
  sourceZone: string | null;
  sourceIndex: number | null;
  startPosition: Point | null;
  currentPosition: Point | null;
  dropTarget: DropTarget | null;
  dragStartTime: number | null;
  dragDistance: number; // NEW: Track total drag distance
}

export interface DropResult {
  item: any;
  itemType: string;
  sourceZone: string;
  sourceIndex: number;
  targetZone: string;
  targetIndex?: number;
  targetType: 'reorder' | 'highlight';
}

const initialState: DragState = {
  phase: 'idle',
  item: null,
  itemType: null,
  sourceZone: null,
  sourceIndex: null,
  startPosition: null,
  currentPosition: null,
  dropTarget: null,
  dragStartTime: null,
  dragDistance: 0,
};

export class DragCore {
  private state: Writable<DragState> = writable(initialState);
  private callbacks: Set<(state: DragState) => void> = new Set();

  // Drag thresholds
  private readonly DRAG_START_THRESHOLD = 5; // pixels to start drag
  private readonly CLICK_MAX_DISTANCE = 8; // pixels - if total distance is less, consider it a click

  constructor() {
    // Subscribe to state changes and notify callbacks
    this.state.subscribe(state => {
      this.callbacks.forEach(callback => callback(state));
    });
  }

  // Public API for subscribing to state changes
  subscribe(callback: (state: DragState) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Get current state (for Svelte store compatibility)
  get store() {
    return this.state;
  }

  // Start drag detection phase
  startDetection(
    item: any,
    itemType: string,
    sourceZone: string,
    sourceIndex: number,
    position: Point
  ): void {
    console.log('🎯 DragCore: Starting detection for', itemType, item.id || item.title);
    
    this.state.update(state => ({
      ...state,
      phase: 'detecting',
      item,
      itemType,
      sourceZone,
      sourceIndex,
      startPosition: position,
      currentPosition: position,
      dragStartTime: Date.now(),
      dragDistance: 0,
    }));
  }

  // Upgrade from detection to actual dragging
  startDrag(): void {
    console.log('🎯 DragCore: Upgrading to drag phase');
    
    this.state.update(state => {
      if (state.phase !== 'detecting') {
        console.warn('Cannot start drag from phase:', state.phase);
        return state;
      }
      
      return {
        ...state,
        phase: 'dragging',
      };
    });
  }

  // Update current mouse/touch position and calculate distance
  updatePosition(position: Point): void {
    this.state.update(state => {
      const distance = state.startPosition 
        ? Math.sqrt(
            Math.pow(position.x - state.startPosition.x, 2) + 
            Math.pow(position.y - state.startPosition.y, 2)
          )
        : 0;

      return {
        ...state,
        currentPosition: position,
        dragDistance: distance,
      };
    });
  }

  // Set the current drop target
  setDropTarget(target: DropTarget | null): void {
    this.state.update(state => ({
      ...state,
      dropTarget: target,
    }));
  }

  // Check if the total drag distance qualifies as a click
  shouldTriggerClick(): boolean {
    const state = this.getCurrentState();
    return state.dragDistance < this.CLICK_MAX_DISTANCE;
  }

  // Check if drag distance exceeds start threshold
  shouldStartDrag(): boolean {
    const state = this.getCurrentState();
    return state.dragDistance >= this.DRAG_START_THRESHOLD;
  }

  // End drag and return result
  endDrag(): DropResult | null {
    let result: DropResult | null = null;
    
    this.state.update(state => {
      if (state.phase === 'dragging' && state.dropTarget && state.item) {
        result = {
          item: state.item,
          itemType: state.itemType!,
          sourceZone: state.sourceZone!,
          sourceIndex: state.sourceIndex!,
          targetZone: state.dropTarget.zoneId,
          targetIndex: state.dropTarget.itemIndex,
          targetType: state.dropTarget.targetType,
        };
        
        console.log('🎯 DragCore: Drag ended with result:', result);
      }
      
      return initialState;
    });
    
    return result;
  }

  // Cancel drag without result
  cancelDrag(): void {
    console.log('🎯 DragCore: Drag cancelled');
    this.state.set(initialState);
  }

  // Get current state snapshot
  getCurrentState(): DragState {
    let currentState: DragState = initialState;
    this.state.subscribe(state => { currentState = state; })();
    return currentState;
  }

  // Check if currently dragging a specific item type
  isDragging(itemType?: string): boolean {
    const state = this.getCurrentState();
    return state.phase === 'dragging' && 
           (itemType ? state.itemType === itemType : true);
  }

  // Check if currently detecting a specific item type
  isDetecting(itemType?: string): boolean {
    const state = this.getCurrentState();
    return state.phase === 'detecting' && 
           (itemType ? state.itemType === itemType : true);
  }

  // Check if in any active drag state
  isActive(): boolean {
    const state = this.getCurrentState();
    return state.phase !== 'idle';
  }
}