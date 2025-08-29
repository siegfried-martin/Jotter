// src/lib/dnd/behaviors/DragBehavior.ts
import type { DropTarget, DropResult } from '../core/DragCore';

export interface PreviewConfig {
  type: 'reorder' | 'highlight' | 'none';
  targetZone?: string;
  targetIndex?: number;
  visualLayout?: any[]; // For grid/list reordering
}

export interface GhostConfig {
  content: string; // HTML content
  className?: string;
  style?: Record<string, string>;
}

export interface DragBehavior {
  readonly itemType: string;
  
  // Validation
  canDragFrom(zoneId: string): boolean;
  canDropTo(zoneId: string, sourceZone: string, itemIndex?: number): boolean;
  
  // Visual feedback
  createGhost(item: any): GhostConfig;
  createPreview(
    sourceZone: string, 
    targetZone: string, 
    targetIndex: number | undefined,
    items: any[],
    draggedItem?: any // NEW: Pass the dragged item
  ): PreviewConfig;
  
  // Drop handling
  onDrop(result: DropResult): Promise<void>;
  
  // Validation for specific drop scenarios
  validateDrop(result: DropResult): boolean;
}

export class DragBehaviorRegistry {
  private behaviors = new Map<string, DragBehavior>();
  private dropHandlers = new Map<string, (result: DropResult) => Promise<void>>();

  // Register a behavior for an item type
  register(behavior: DragBehavior): void {
    console.log('🎯 Registering drag behavior for:', behavior.itemType);
    this.behaviors.set(behavior.itemType, behavior);
  }

  // Register a drop handler for a specific zone pattern
  registerDropHandler(zonePattern: string, handler: (result: DropResult) => Promise<void>): void {
    console.log('🎯 Registering drop handler for zone:', zonePattern);
    this.dropHandlers.set(zonePattern, handler);
  }

  // Get behavior for item type
  getBehavior(itemType: string): DragBehavior | null {
    return this.behaviors.get(itemType) || null;
  }

  // Validate if a drop is allowed
  canDrop(itemType: string, sourceZone: string, targetZone: string, targetIndex?: number): boolean {
    const behavior = this.getBehavior(itemType);
    if (!behavior) {
      console.warn('No behavior found for item type:', itemType);
      return false;
    }

    return behavior.canDragFrom(sourceZone) && 
           behavior.canDropTo(targetZone, sourceZone, targetIndex);
  }

  // Create ghost element for item
  createGhost(itemType: string, item: any): GhostConfig | null {
    const behavior = this.getBehavior(itemType);
    return behavior ? behavior.createGhost(item) : null;
  }

  // Create preview configuration
  createPreview(
    itemType: string,
    sourceZone: string,
    targetZone: string,
    targetIndex: number | undefined,
    items: any[],
    draggedItem?: any // NEW: Pass the dragged item
  ): PreviewConfig {
    const behavior = this.getBehavior(itemType);
    
    if (!behavior) {
      return { type: 'none' };
    }

    return behavior.createPreview(sourceZone, targetZone, targetIndex, items, draggedItem);
  }

  // Handle drop with appropriate behavior and handlers
  async handleDrop(result: DropResult): Promise<void> {
    console.log('🎯 Registry handling drop:', result);
    
    // First validate with behavior
    const behavior = this.getBehavior(result.itemType);
    if (!behavior) {
      console.error('No behavior found for item type:', result.itemType);
      return;
    }

    if (!behavior.validateDrop(result)) {
      console.warn('Drop validation failed:', result);
      return;
    }

    // Handle with behavior's onDrop
    try {
      await behavior.onDrop(result);
      console.log('✅ Drop handled successfully by behavior');
    } catch (error) {
      console.error('❌ Behavior drop handler failed:', error);
      throw error;
    }

    // Also check for zone-specific handlers
    for (const [pattern, handler] of this.dropHandlers) {
      if (this.matchesZonePattern(result.targetZone, pattern)) {
        try {
          await handler(result);
          console.log('✅ Drop handled successfully by zone handler:', pattern);
        } catch (error) {
          console.error('❌ Zone drop handler failed:', pattern, error);
          // Don't throw - behavior already handled it
        }
      }
    }
  }

  private matchesZonePattern(zoneId: string, pattern: string): boolean {
    // Simple pattern matching - can be expanded
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(zoneId);
    }
    return zoneId === pattern;
  }

  // Get all registered item types
  getRegisteredTypes(): string[] {
    return Array.from(this.behaviors.keys());
  }

  // Check if a type is registered
  isRegistered(itemType: string): boolean {
    return this.behaviors.has(itemType);
  }

  clearBehaviors(): void {
    console.log('Clearing all registered drag behaviors');
    this.behaviors.clear();
  }
}