// src/lib/dnd/core/PreviewRenderer.ts
import type { PreviewConfig } from '../behaviors/DragBehavior';

export interface LayoutItem {
  id: string;
  element: HTMLElement;
  originalIndex: number;
  previewIndex: number;
}

export interface PreviewState {
  isActive: boolean;
  targetZone: string | null;
  targetIndex: number | null;
  layoutItems: LayoutItem[];
  originalOrder: HTMLElement[];
}

export class PreviewRenderer {
  private activePreview: PreviewState | null = null;
  private previewStyleMap = new WeakMap<HTMLElement, string>();

  /**
   * Apply a preview configuration to the DOM
   */
  applyPreview(config: PreviewConfig, sourceZone: string): void {
    console.log('🎨 PreviewRenderer: Applying preview', config);

    // Clear any existing preview first
    this.clearPreview();

    switch (config.type) {
      case 'reorder':
        this.applyReorderPreview(config, sourceZone);
        break;
      case 'highlight':
        this.applyHighlightPreview(config);
        break;
      case 'none':
        // Already cleared above
        break;
    }
  }

  /**
   * Apply visual reordering preview (file manager style)
   */
  private applyReorderPreview(config: PreviewConfig, sourceZone: string): void {
    if (!config.targetZone || config.targetIndex === undefined || !config.visualLayout) {
      return;
    }

    const container = this.findZoneContainer(config.targetZone);
    if (!container) {
      console.warn('Cannot find container for zone:', config.targetZone);
      return;
    }

    // Get all draggable items in the container
    const dragZones = Array.from(container.querySelectorAll('[data-drag-zone]')) as HTMLElement[];
    const layoutItems: LayoutItem[] = [];

    // Store original order and positions
    dragZones.forEach((element, index) => {
      const itemId = element.getAttribute('data-item-id') || `item-${index}`;
      layoutItems.push({
        id: itemId,
        element,
        originalIndex: index,
        previewIndex: index // Will be updated below
      });

      // Store original order for restoration
      this.previewStyleMap.set(element, element.style.order || '');
      
      // CRITICAL: Disable pointer events during preview to prevent mouse detection interference
      element.style.pointerEvents = 'none';
    });

    // Apply the new visual layout using CSS order
    config.visualLayout.forEach((item: any, newIndex: number) => {
      const layoutItem = layoutItems.find(li => li.id === (item.id || item.title));
      if (layoutItem) {
        layoutItem.previewIndex = newIndex;
        layoutItem.element.style.order = newIndex.toString();
      }
    });

    // Re-enable pointer events on the container level (for drop detection)
    container.style.pointerEvents = 'auto';

    // Store preview state
    this.activePreview = {
      isActive: true,
      targetZone: config.targetZone,
      targetIndex: config.targetIndex,
      layoutItems,
      originalOrder: dragZones
    };

    console.log('✅ Reorder preview applied with pointer protection:', {
      zone: config.targetZone,
      itemCount: layoutItems.length
    });
  }

  /**
   * Apply highlight preview (drag to parent style)
   */
  private applyHighlightPreview(config: PreviewConfig): void {
    if (!config.targetZone) return;

    const targetElement = this.findZoneTarget(config.targetZone);
    if (!targetElement) {
      console.warn('Cannot find target element for zone:', config.targetZone);
      return;
    }

    // Apply highlight styling
    targetElement.classList.add('drag-highlight-target');
    
    // Store for cleanup
    this.activePreview = {
      isActive: true,
      targetZone: config.targetZone,
      targetIndex: null,
      layoutItems: [],
      originalOrder: []
    };

    console.log('✅ Highlight preview applied to:', config.targetZone);
  }

  /**
   * Clear any active preview and restore original layout
   */
  clearPreview(): void {
    if (!this.activePreview?.isActive) return;

    console.log('🧹 PreviewRenderer: Clearing preview');

    // Restore original CSS order AND pointer events for reorder previews
    this.activePreview.layoutItems.forEach(item => {
      const originalOrder = this.previewStyleMap.get(item.element);
      if (originalOrder !== undefined) {
        item.element.style.order = originalOrder;
        this.previewStyleMap.delete(item.element);
      }
      
      // Restore pointer events
      item.element.style.pointerEvents = '';
    });

    // Restore container pointer events
    if (this.activePreview.targetZone) {
      const container = this.findZoneContainer(this.activePreview.targetZone);
      if (container) {
        container.style.pointerEvents = '';
      }
    }

    // Remove highlight classes
    if (this.activePreview.targetZone) {
      const targetElement = this.findZoneTarget(this.activePreview.targetZone);
      targetElement?.classList.remove('drag-highlight-target');
    }

    // Clear state
    this.activePreview = null;
  }

  /**
   * Find the container element for a zone
   */
  private findZoneContainer(zoneId: string): HTMLElement | null {
    // For section grids: look for grid container
    if (zoneId.startsWith('section-grid-')) {
      const gridElement = document.querySelector(`[data-section-grid="${zoneId}"]`);
      return gridElement as HTMLElement;
    }

    // For container lists: look for list container
    if (zoneId === 'container-list') {
      const listElement = document.querySelector('[data-container-list]');
      return listElement as HTMLElement;
    }

    return null;
  }

  /**
   * Find the target element for highlighting
   */
  private findZoneTarget(zoneId: string): HTMLElement | null {
    // For container targets: find the specific container
    if (zoneId.startsWith('container-')) {
      const containerId = zoneId.replace('container-', '');
      return document.querySelector(`[data-container-id="${containerId}"]`) as HTMLElement;
    }

    // For collection targets: find the collection tab
    if (zoneId.startsWith('collection-')) {
      const collectionId = zoneId.replace('collection-', '');
      return document.querySelector(`[data-collection-id="${collectionId}"]`) as HTMLElement;
    }

    return null;
  }

  /**
   * Check if a preview is currently active
   */
  isPreviewActive(): boolean {
    return this.activePreview?.isActive || false;
  }

  /**
   * Get current preview state (for debugging)
   */
  getPreviewState(): PreviewState | null {
    return this.activePreview;
  }
}