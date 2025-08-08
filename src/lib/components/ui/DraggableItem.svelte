<!-- src/lib/components/ui/DraggableItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dragStore, dragActions } from '$lib/stores/dragStore';

  // Generic props - no assumptions about what's being dragged
  export let item: any; // The data being dragged
  export let itemId: string; // Unique identifier
  export let containerIndex: number;
  export let itemIndex: number;
  export let containerId: string;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    click: { item: any; itemId: string };
    reorder: {
      itemId: string;
      item: any;
      fromContainer: string;
      fromIndex: number;
      toContainer: string;
      toIndex: number;
    };
    dragOver: { index: number };
  }>();

  let itemElement: HTMLElement;
  let isDraggedItem = false;
  let isPointerDown = false;
  let dragStartTime = 0;
  const CLICK_THRESHOLD = 150; // ms
  const DRAG_THRESHOLD = 5; // pixels

  // Subscribe to drag store to know if this item is being dragged
  $: isDraggedItem = $dragStore.isDragging && $dragStore.draggedItem?.id === itemId;
  $: isDragOver = $dragStore.dragOverContainer === containerId && $dragStore.dragOverIndex === itemIndex;

  function handlePointerDown(event: PointerEvent) {
    if (disabled || shouldIgnoreEvent(event) || !isPointerOverContent(event)) {
      return;
    }

    isPointerDown = true;
    dragStartTime = Date.now();
    
    const startPosition = { x: event.clientX, y: event.clientY };
    
    // Set up pointer tracking
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp, { once: true });
    
    // Prevent default but allow event propagation for other handlers
    event.preventDefault();
  }

  function isPointerOverContent(event: PointerEvent): boolean {
    // Check if the pointer is over the actual card content
    const element = event.target as HTMLElement;
    const cardContainer = element.closest('.section-card-base');
    return cardContainer !== null;
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isPointerDown) return;

    const currentPosition = { x: event.clientX, y: event.clientY };
    
    // If drag hasn't started yet, check if we've moved enough
    if (!$dragStore.isDragging) {
      const deltaX = Math.abs(currentPosition.x - ($dragStore.dragStartPosition?.x || 0));
      const deltaY = Math.abs(currentPosition.y - ($dragStore.dragStartPosition?.y || 0));
      
      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        // Start dragging - create a generic drag item
        const dragItem = { id: itemId, ...item };
        dragActions.startDrag(dragItem, containerId, currentPosition);
        console.log('🎯 Custom drag started for item:', itemId);
      }
    } else if ($dragStore.draggedItem?.id === itemId) {
      // Update drag position
      dragActions.updatePosition(currentPosition);
      
      // Find what we're hovering over
      updateDragTarget(event);
    }
  }

  function handlePointerUp(event: PointerEvent) {
    document.removeEventListener('pointermove', handlePointerMove);
    isPointerDown = false;

    const dragDuration = Date.now() - dragStartTime;
    
    if ($dragStore.isDragging && $dragStore.draggedItem?.id === itemId) {
      // This was a drag - handle drop BEFORE ending drag
      console.log('🎯 Pointer up during drag - handling drop');
      handleDrop();
      dragActions.endDrag(); // Call endDrag AFTER handleDrop
    } else if (dragDuration < CLICK_THRESHOLD) {
      // This was a click - dispatch click event
      handleClick(event);
      dragActions.endDrag();
    } else {
      // Fallback - end drag anyway
      dragActions.endDrag();
    }
  }

  function updateDragTarget(event: PointerEvent) {
    // Find the element under the pointer
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const dropZone = elementBelow?.closest('[data-drop-zone]');
    
    if (dropZone) {
      const dropType = dropZone.getAttribute('data-drop-zone');
      const container = dropZone.getAttribute('data-container-id');
      
      if (dropType === 'container' && container !== containerId) {
        // Cross-container drop target
        console.log('🎯 Hovering over container:', container);
        dragActions.setDragOverTarget(container, 'container');
      } else if (dropType !== 'container') {
        // Same-container reordering
        const index = parseInt(dropZone.getAttribute('data-item-index') || '0');
        
        if (container !== containerId || index !== itemIndex) {
          dragActions.setDragOver(container, index);
          dispatch('dragOver', { index });
        }
      }
    } else {
      dragActions.setDragOver(null, null);
      dragActions.setDragOverTarget(null, null);
    }
  }

  function handleDrop() {
    console.log('🎯 handleDrop function called!');
    console.log('dragStore.dragOverContainer:', $dragStore.dragOverContainer, 'dragStore.dragOverIndex:', $dragStore.dragOverIndex);
    console.log('dragStore.dragOverTargetContainer:', $dragStore.dragOverTargetContainer, 'dragStore.dragOverTargetType:', $dragStore.dragOverTargetType);
    
    // Check for cross-container drop first
    if ($dragStore.dragOverTargetContainer && $dragStore.dragOverTargetType === 'container') {
      console.log('🎯 Cross-container drop detected:', {
        from: { container: containerId, index: itemIndex },
        to: { container: $dragStore.dragOverTargetContainer }
      });
      
      // Dispatch cross-container move
      dispatch('reorder', {
        itemId: itemId,
        item,
        fromContainer: containerId,
        fromIndex: itemIndex,
        toContainer: $dragStore.dragOverTargetContainer,
        toIndex: 0 // Doesn't matter for cross-container
      });
    } else if ($dragStore.dragOverContainer && $dragStore.dragOverIndex !== null) {
      // Same-container reordering
      console.log('🎯 Same-container drop detected:', {
        from: { container: containerId, index: itemIndex },
        to: { container: $dragStore.dragOverContainer, index: $dragStore.dragOverIndex }
      });
      
      // Dispatch same-container reorder
      dispatch('reorder', {
        itemId: itemId,
        item,
        fromContainer: containerId,
        fromIndex: itemIndex,
        toContainer: $dragStore.dragOverContainer,
        toIndex: $dragStore.dragOverIndex
      });
    } else {
      console.log('❌ No valid drop target found');
    }
  }

  function handleClick(event: PointerEvent) {
    if (!shouldIgnoreEvent(event) && isPointerOverContent(event)) {
      console.log('👆 Item clicked:', itemId);
      dispatch('click', { item, itemId });
    }
  }

  // Override this function via prop if needed for custom interactive element detection
  export let shouldIgnoreEvent: (event: Event) => boolean = (event: Event) => {
    const element = event.target as HTMLElement;
    let current = element;
    
    while (current && current !== itemElement) {
      // Check for form elements
      if (current.tagName === 'INPUT' || current.tagName === 'BUTTON') return true;
      
      // Check for common interactive attributes
      const title = current.getAttribute('title');
      if (title === 'Click to edit title' || title === 'Copy content' || title === 'Delete section') return true;
      
      // Check for common interactive classes
      if (current.classList.contains('copy-button') || current.classList.contains('opacity-0')) return true;
      
      current = current.parentElement as HTMLElement;
    }
    return false;
  };
</script>

<!-- Grid cell container with drop zone data -->
<div
  bind:this={itemElement}
  class="draggable-item"
  class:dragging={isDraggedItem}
  class:drag-over={isDragOver}
  class:disabled
  data-drop-zone
  data-container-id={containerId}
  data-item-index={itemIndex}
  on:pointerdown={handlePointerDown}
  style:touch-action="none"
  style:user-select="none"
>
  <!-- Slot for any content -->
  <slot {item} isDragging={isDraggedItem} {isDragOver} />
</div>

<style>
  .draggable-item {
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease;
    position: relative;
  }

  .draggable-item.dragging {
    opacity: 0.5;
    transform: scale(0.95);
    z-index: 1;
  }

  .draggable-item.drag-over {
    /* Remove visual feedback - the preview handles this */
  }

  .draggable-item.disabled {
    cursor: default;
  }

  .draggable-item:not(.disabled):not(.dragging):hover {
    transform: translateY(-2px);
  }
</style>