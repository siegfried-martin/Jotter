// src/lib/dnd/core/DragDetection.ts
import type { Point, DropTarget } from './DragCore';
import { DragTargetDetection } from './DragTargetDetection';
import { DragHighlighting } from './DragHighlighting';

export interface DragConfig {
  item: any;
  itemType: string;
  zoneId: string;
  itemIndex: number;
  threshold?: number; // pixels to move before starting drag
  clickTimeout?: number; // ms to distinguish click from drag
}

export interface DragCallbacks {
  onDetectionStart: (item: any, itemType: string, zoneId: string, itemIndex: number, position: Point) => void;
  onDragStart: () => void;
  onDragMove: (position: Point) => void;
  onDragEnd: () => void;
  onCancel: () => void;
  onClick: (item: any, itemType: string) => void;
  shouldStartDrag?: () => boolean; // Let DragCore decide when to start
  shouldTriggerClick?: () => boolean; // Let DragCore decide if it's a click
}

export class DragDetection {
  private readonly DRAG_THRESHOLD = 8; // Increased from 5 - more movement needed to start drag
  private readonly CLICK_THRESHOLD = 150; // ms (fallback)
  
  private isPointerDown = false;
  private startPosition: Point | null = null;
  private startTime = 0;
  private activeConfig: DragConfig | null = null;
  private hasDragStarted = false;
  private shouldStartDrag?: () => boolean;
  private shouldTriggerClick?: () => boolean;
  private updateDropTargetCallback: (target: DropTarget | null) => void = () => {};

  // NEW: Modular components
  private targetDetection: DragTargetDetection;
  private highlighting: DragHighlighting;

  constructor(private callbacks: DragCallbacks) {
    // Store references to DragCore decision methods
    this.shouldStartDrag = callbacks.shouldStartDrag;
    this.shouldTriggerClick = callbacks.shouldTriggerClick;
    
    // Initialize modular components
    this.highlighting = new DragHighlighting();
    this.targetDetection = new DragTargetDetection((target) => {
      this.updateDropTargetCallback(target);
    });
  }

  // Attach drag detection to an element
  attachTo(element: HTMLElement, config: DragConfig): () => void {
    const handlePointerDown = (event: PointerEvent) => {
      this.handlePointerDown(event, config);
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.style.touchAction = 'none';
    element.style.userSelect = 'none';

    // Return cleanup function
    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.style.touchAction = '';
      element.style.userSelect = '';
    };
  }

  // Method to set the drop target callback (will be set by DragProvider)
  setDropTargetCallback(callback: (target: DropTarget | null) => void): void {
    this.updateDropTargetCallback = callback;
    // Also update the target detection module
    this.targetDetection = new DragTargetDetection((target) => {
      this.updateDropTargetCallback(target);
    });
  }

  private handlePointerDown(event: PointerEvent, config: DragConfig): void {
    // Ignore if should skip this event
    if (this.shouldIgnoreEvent(event)) {
      return;
    }

    // Only allow drag/click from the actual card content, not the wrapper/padding
    const target = event.target as HTMLElement;
    const clickedCard = target.closest('.section-card-base, .container-item-content');

    if (!clickedCard) {
      return; // Clicked outside the actual card, ignore
    }

    this.isPointerDown = true;
    this.startPosition = { x: event.clientX, y: event.clientY };
    this.startTime = Date.now();
    this.activeConfig = config;

    // Start detection phase
    this.callbacks.onDetectionStart(
      config.item,
      config.itemType,
      config.zoneId,
      config.itemIndex,
      this.startPosition
    );

    // Set up global listeners
    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerup', this.handlePointerUp, { once: true });
    
    event.preventDefault();
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isPointerDown || !this.startPosition || !this.activeConfig) return;

    const currentPosition = { x: event.clientX, y: event.clientY };
    
    // Always update position (this calculates dragDistance in DragCore)
    this.callbacks.onDragMove(currentPosition);

    // Check if we should start dragging (only call once)
    if (!this.hasDragStarted) {
      // Use DragCore's distance calculation if available, otherwise fallback
      const shouldStart = this.shouldStartDrag 
        ? this.shouldStartDrag() 
        : this.calculateShouldStartDrag(currentPosition);
        
      // console.log('🔍 DragDetection: Should start drag?', shouldStart, {
      //   hasDragStarted: this.hasDragStarted,
      //   hasCallback: !!this.shouldStartDrag,
      //   currentPos: currentPosition,
      //   startPos: this.startPosition
      // });
        
      if (shouldStart) {
        this.hasDragStarted = true;
        //console.log('🚀 DragDetection: Starting drag!');
        
        // NEW: Highlight all valid drop targets when drag starts
        if (this.activeConfig.itemType === 'section') {
          this.highlighting.highlightAllValidContainers(this.activeConfig);
        }
        
        this.callbacks.onDragStart();
      }
    }
    
    // Update drop target during drag (if drag has started)
    if (this.hasDragStarted) {
      this.updateDragTarget(event);
    }
  };

  private handlePointerUp = (event: PointerEvent): void => {
    document.removeEventListener('pointermove', this.handlePointerMove);
    
    if (!this.isPointerDown || !this.activeConfig) return;

    // Use DragCore's logic to determine if this should be a click
    const shouldClick = this.shouldTriggerClick 
      ? this.shouldTriggerClick() 
      : !this.hasDragStarted; // Fallback logic

    if (shouldClick && !this.hasDragStarted) {
      // This was a click
      //console.log('🎯 Processing as click - no significant movement detected');
      this.callbacks.onClick(this.activeConfig.item, this.activeConfig.itemType);
    } else if (this.hasDragStarted) {
      // This was a drag - end it and prevent any click events
      //console.log('🎯 Processing as drag end - PREVENTING CLICK');
      this.callbacks.onDragEnd();
      
      // 🔧 PREVENT MOUSEUP EVENT: Prevent the mouseup event from bubbling
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // 🔧 GLOBAL CLICK CAPTURE: Add temporary global click prevention
      // This catches clicks that fire after DOM reordering
      const preventGlobalClick = (e: Event) => {
        //console.log('🛑 BLOCKING post-drag click event');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      };
      
      // Capture clicks globally for a brief moment
      document.addEventListener('click', preventGlobalClick, { capture: true, once: true });
      
      // Safety cleanup in case no click fires
      setTimeout(() => {
        document.removeEventListener('click', preventGlobalClick, { capture: true });
      }, 300);
    } else {
      //console.log('🎯 Ignoring - movement detected but not enough for drag');
      // Don't trigger click OR drag - this prevents click bleeding
    }

    this.cleanup();
  };

  private updateDragTarget(event: PointerEvent): void {
    if (!this.activeConfig) return;
    
    //console.log('🔄 updateDragTarget called for itemType:', this.activeConfig.itemType);
    
    // Use the modular target detection
    const result = this.targetDetection.detectTarget(event, this.activeConfig);
    
    if (result.isValidTarget && result.dropTarget) {
      // Handle highlighting based on target type
      if (result.shouldHighlight && result.highlightType === 'container' && result.dropTarget.containerId) {
        this.highlighting.addContainerHighlight(result.dropTarget.containerId, 'active');
      } else if (result.shouldHighlight && result.highlightType === 'section' && result.dropTarget.itemIndex !== undefined) {
        this.highlighting.addSectionReorderHighlight(result.dropTarget.zoneId, result.dropTarget.itemIndex);
      }
    } else {
      // Clear any active highlights (but keep available ones)
      this.highlighting.removeHighlightsByType('active');
      this.highlighting.removeHighlightsByType('section-reorder');
    }
  }

  // Fallback distance calculation if DragCore method not available
  private calculateShouldStartDrag(currentPosition: Point): boolean {
    if (!this.startPosition) return false;
    
    const deltaX = Math.abs(currentPosition.x - this.startPosition.x);
    const deltaY = Math.abs(currentPosition.y - this.startPosition.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    return distance >= this.DRAG_THRESHOLD;
  }

  private shouldIgnoreEvent(event: Event): boolean {
    const element = event.target as HTMLElement;
    let current = element;
    
    while (current) {
      // Check for form elements
      if (current.tagName === 'INPUT' || current.tagName === 'BUTTON') return true;
      
      // Check for common interactive attributes
      const title = current.getAttribute('title');
      if (title === 'Click to edit title' || title === 'Copy content' || title === 'Delete section') return true;
      
      // Check for common interactive classes
      if (current.classList.contains('copy-button') || 
          current.classList.contains('delete-button') ||
          current.classList.contains('opacity-0')) return true;
      
      current = current.parentElement as HTMLElement;
      if (!current) break;
    }
    
    return false;
  }

  private cleanup(): void {
    this.isPointerDown = false;
    this.startPosition = null;
    this.activeConfig = null;
    this.startTime = 0;
    this.hasDragStarted = false;
    
    // Clean up all highlights
    this.highlighting.cleanup();
  }
}