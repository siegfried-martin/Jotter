// src/lib/dnd/core/DragHighlighting.ts
import type { DragConfig } from './DragDetection';

export type HighlightType = 'available' | 'active' | 'section-reorder';

export interface HighlightConfig {
  type: HighlightType;
  targetId?: string;
  className: string;
  selector: string;
}

export class DragHighlighting {
  private activeHighlights: Set<string> = new Set();
  
  // Main method to add container highlighting
  addContainerHighlight(containerId: string, type: HighlightType = 'active'): void {
    // Remove any existing active highlights (but keep available highlights)
    if (type === 'active') {
      this.removeHighlightsByType('active');
    }
    
    // Find the container element and add highlight class
    const containerElement = document.querySelector(`[data-container-id="${containerId}"]`);
    if (containerElement) {
      const className = this.getHighlightClassName(type);
      containerElement.classList.add(className);
      this.activeHighlights.add(`${containerId}-${type}`);
      console.log(`🎨 Added ${type} highlight to container:`, containerId);
    }
  }

  // Highlight all valid drop targets when drag starts
  highlightAllValidContainers(activeConfig: DragConfig): void {
    if (!activeConfig) return;
    
    const sourceContainerId = activeConfig.zoneId.replace('section-grid-', '');
    console.log('🎨 Highlighting all valid containers, source:', sourceContainerId);
    
    // Find all container elements
    const allContainers = document.querySelectorAll('[data-container-id]');
    console.log('🎨 Found containers:', allContainers.length);
    
    allContainers.forEach(containerElement => {
      const containerId = containerElement.getAttribute('data-container-id');
      
      // Skip the source container (can't drop on same container)
      if (containerId && containerId !== sourceContainerId) {
        const className = this.getHighlightClassName('available');
        containerElement.classList.add(className);
        this.activeHighlights.add(`${containerId}-available`);
        console.log('🎨 Added available highlight to container:', containerId);
      } else {
        console.log('🎨 Skipping source container:', containerId);
      }
    });
  }

  // Remove highlights by type
  removeHighlightsByType(type: HighlightType): void {
    const className = this.getHighlightClassName(type);
    const highlightedElements = document.querySelectorAll(`.${className}`);
    
    highlightedElements.forEach(element => {
      element.classList.remove(className);
      const containerId = element.getAttribute('data-container-id');
      if (containerId) {
        this.activeHighlights.delete(`${containerId}-${type}`);
      }
    });
  }

  // Remove all highlights
  removeAllHighlights(): void {
    // Remove all highlight types
    const allHighlightTypes: HighlightType[] = ['available', 'active', 'section-reorder'];
    
    allHighlightTypes.forEach(type => {
      this.removeHighlightsByType(type);
    });
    
    // Clear the tracking set
    this.activeHighlights.clear();
    
    console.log('🧹 Removed all highlights');
  }

  // Get the appropriate CSS class name for a highlight type
  private getHighlightClassName(type: HighlightType): string {
    switch (type) {
      case 'available':
        return 'section-drop-target-available';
      case 'active':
        return 'section-drop-target-active';
      case 'section-reorder':
        return 'section-reorder-target';
      default:
        return 'section-drop-target';
    }
  }

  // Check if a specific highlight is active
  hasHighlight(containerId: string, type: HighlightType): boolean {
    return this.activeHighlights.has(`${containerId}-${type}`);
  }

  // Get all currently active highlights
  getActiveHighlights(): Array<{ containerId: string; type: HighlightType }> {
    const highlights: Array<{ containerId: string; type: HighlightType }> = [];
    
    this.activeHighlights.forEach(highlight => {
      const [containerId, type] = highlight.split('-');
      highlights.push({ 
        containerId, 
        type: type as HighlightType 
      });
    });
    
    return highlights;
  }

  // Add section reorder highlighting (for same-container drops)
  addSectionReorderHighlight(zoneId: string, targetIndex: number): void {
    // Remove existing section reorder highlights
    this.removeHighlightsByType('section-reorder');
    
    // Find the target section element
    const sectionGrid = document.querySelector(`[data-section-grid="${zoneId}"]`);
    if (sectionGrid) {
      const targetSection = sectionGrid.querySelector(`[data-insert-position="${targetIndex}"]`);
      if (targetSection) {
        const className = this.getHighlightClassName('section-reorder');
        targetSection.classList.add(className);
        this.activeHighlights.add(`${zoneId}-${targetIndex}-section-reorder`);
        console.log('🎨 Added section reorder highlight at index:', targetIndex);
      }
    }
  }

  // Cleanup method to ensure no highlights are left behind
  cleanup(): void {
    this.removeAllHighlights();
    console.log('🧹 DragHighlighting cleanup completed');
  }
}