// src/lib/utils/dragUtils.ts

/**
 * Generic drag utilities for the custom drag system
 */

export interface DragThresholds {
  time: number; // milliseconds
  distance: number; // pixels
}

export const DEFAULT_DRAG_THRESHOLDS: DragThresholds = {
  time: 150,
  distance: 5
};

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

/**
 * Check if movement exceeds drag threshold
 */
export function exceedsDragThreshold(
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number },
  threshold: number = DEFAULT_DRAG_THRESHOLDS.distance
): boolean {
  return calculateDistance(startPos, currentPos) > threshold;
}

/**
 * Check if time exceeds click threshold
 */
export function exceedsClickThreshold(
  startTime: number,
  currentTime: number = Date.now(),
  threshold: number = DEFAULT_DRAG_THRESHOLDS.time
): boolean {
  return (currentTime - startTime) > threshold;
}

/**
 * Determine if an element should be ignored for drag operations
 */
export function shouldIgnoreDragOnElement(element: HTMLElement): boolean {
  let current = element;
  
  while (current && current !== document.body) {
    // Check for form elements
    if (current.tagName === 'INPUT' || current.tagName === 'BUTTON') {
      return true;
    }
    
    // Check for common interactive attributes
    const title = current.getAttribute('title');
    if (title === 'Click to edit title' || 
        title === 'Copy content' || 
        title === 'Delete section') {
      return true;
    }
    
    // Check for common interactive classes
    if (current.classList.contains('copy-button') || 
        current.classList.contains('opacity-0') ||
        current.hasAttribute('role') && current.getAttribute('role') === 'button') {
      return true;
    }
    
    current = current.parentElement as HTMLElement;
  }
  
  return false;
}