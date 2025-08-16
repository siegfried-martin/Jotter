<!-- src/lib/components/ui/DraggableItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dragStore, dragActions, type DragItemType } from '$lib/stores/dragStore.DELETE';

  // Generic props - no assumptions about what's being dragged
  export let item: any; // The data being dragged
  export let itemId: string; // Unique identifier
  export let itemType: DragItemType; // NEW: What type of item this is
  export let containerIndex: number;
  export let itemIndex: number;
  export let containerId: string;
  export let disabled: boolean = false;

  $: console.log('🔧 DraggableItem props debug:', { itemType, itemId });

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

  // Override this function via prop if needed for custom interactive element detection
  export let isPointerOverContent: (event: PointerEvent) => boolean = (event: PointerEvent) => {
    const element = event.target as HTMLElement;
    const cardContainer = element.closest('.section-card-base');
    const containerItem = element.closest('.container-item'); // Support both types
    return cardContainer !== null || containerItem !== null;
  };

  function handlePointerMove(event: PointerEvent) {
    if (!isPointerDown) return;

    const currentPosition = { x: event.clientX, y: event.clientY };
    
    // If drag hasn't started yet, check if we've moved enough
    if (!$dragStore.isDragging) {
      const deltaX = Math.abs(currentPosition.x - ($dragStore.dragStartPosition?.x || 0));
      const deltaY = Math.abs(currentPosition.y - ($dragStore.dragStartPosition?.y || 0));
      
      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        // Start dragging - create a generic drag item with type info
        const dragItem = { id: itemId, ...item };
        dragActions.startDrag(dragItem, itemType, containerId, currentPosition);
        console.log('🎯 Custom drag started for', itemType, 'item:', itemId);
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
    console.log('🔄 updateDragTarget called for itemType:', itemType, 'dragOverIndex before:', $dragStore.dragOverIndex);
    // Find the element under the pointer
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const dropZone = elementBelow?.closest('[data-drop-zone]');

    console.log('🔍 DOM Debug:', {
      elementBelow: elementBelow?.tagName,
      dropZone: dropZone?.tagName,
      rawDataIndex: dropZone?.getAttribute('data-item-index'),
      parsedIndex: parseInt(dropZone?.getAttribute('data-item-index') || '0'),
      containerAttribute: dropZone?.getAttribute('data-container-id'),
      allDataAttributes: dropZone ? Array.from(dropZone.attributes).map(attr => `${attr.name}=${attr.value}`) : []
    });
    
    if (dropZone) {
      const dropType = dropZone.getAttribute('data-drop-zone');
      const container = dropZone.getAttribute('data-container-id');
      
      // TYPE-AWARE LOGIC: Different behavior based on what's being dragged
      if (itemType === 'section') {
        // Sections can move to different containers OR reorder within same container
        if (dropType === 'container' && container !== containerId) {
          // Cross-container drop target for sections
          console.log('🎯 Section hovering over different container:', container);
          dragActions.setDragOverTarget(container, 'container');
        } else if (dropType !== 'container') {
          // Same-container reordering for sections
          const index = parseInt(dropZone.getAttribute('data-item-index') || '0');
          
          if (container !== containerId || index !== itemIndex) {
            dragActions.setDragOver(container, index);
            dispatch('dragOver', { index });
          }
        }
      } else if (itemType === 'container') {
        const index = parseInt(dropZone.getAttribute('data-item-index') || '0');
        
        console.log('🎯 Container logic - container:', container, 'index:', index, 'myIndex:', itemIndex);
        
        // Smart check: Would this actually change the order?
        const wouldChangeOrder = (index !== itemIndex);
        
        if (!isNaN(index) && wouldChangeOrder) {
          console.log('🎯 Container reordering to index:', index);
          dragActions.setDragOver('container-list', index);
          dispatch('dragOver', { index });
        } else {
          console.log('🎯 No order change needed - index:', index, 'myIndex:', itemIndex);
          // Clear the drag state to show "no change" / "cancel"
          dragActions.setDragOver(null, null);
          dragActions.setDragOverTarget(null, null);
        }
      }
    // } else {
    //   console.log('🎯 No valid drop target found, setting to null');
    //   dragActions.setDragOver(null, null);
    //   dragActions.setDragOverTarget(null, null);
    }
    console.log('🔄 updateDragTarget finished, dragOverIndex after:', $dragStore.dragOverIndex);
  }

  function handleDrop() {
    // console.log('🎯 handleDrop function called for', itemType);
    // console.log('dragStore values:', {
    //   dragOverContainer: $dragStore.dragOverContainer,
    //   dragOverIndex: $dragStore.dragOverIndex,
    //   dragOverTargetContainer: $dragStore.dragOverTargetContainer,
    //   dragOverTargetType: $dragStore.dragOverTargetType,
    //   itemType: $dragStore.itemType
    // });
    
    // TYPE-AWARE DROP LOGIC
    if (itemType === 'section') {
      // Sections: Support both cross-container moves and same-container reordering
      if ($dragStore.dragOverTargetContainer && $dragStore.dragOverTargetType === 'container') {
        console.log('🎯 Section cross-container drop detected');
        
        dispatch('reorder', {
          itemId: itemId,
          item,
          fromContainer: containerId,
          fromIndex: itemIndex,
          toContainer: $dragStore.dragOverTargetContainer,
          toIndex: 0 // Doesn't matter for cross-container
        });
      } else if ($dragStore.dragOverContainer && $dragStore.dragOverIndex !== null) {
        console.log('🎯 Section same-container reorder detected');
        
        dispatch('reorder', {
          itemId: itemId,
          item,
          fromContainer: containerId,
          fromIndex: itemIndex,
          toContainer: $dragStore.dragOverContainer,
          toIndex: $dragStore.dragOverIndex
        });
      } else {
        console.log('❌ No valid drop target found for section');
      }
    } else if (itemType === 'container') {
      // Containers: Only same-list reordering
      if ($dragStore.dragOverContainer === containerId && $dragStore.dragOverIndex !== null) {
        console.log('🎯 Container same-list reorder detected');

        // console.log('📤 Dispatching container reorder:', {
        //   itemId: itemId,
        //   item,
        //   fromContainer: containerId,
        //   fromIndex: itemIndex,
        //   toContainer: containerId,
        //   toIndex: $dragStore.dragOverIndex
        // });
        
        dispatch('reorder', {
          itemId: itemId,
          item,
          fromContainer: containerId,
          fromIndex: itemIndex,
          toContainer: containerId,
          toIndex: $dragStore.dragOverIndex
        });
      } else {
        console.log('❌ No valid drop target found for container');
      }
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
  <slot {item} isDragging={isDraggedItem} {isDragOver} {itemIndex} />
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