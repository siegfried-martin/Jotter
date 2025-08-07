<!-- src/lib/components/ui/SortableGrid.svelte -->
<!-- Grid-based drag & drop for card layouts -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';

  // Generic props
  export let items: any[] = [];
  export let gridClass: string = 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  export let flipDuration: number = 300;
  export let disabled: boolean = false;
  export let dragThreshold: number = 150; // milliseconds to distinguish drag from click

  const dispatch = createEventDispatcher<{
    reorder: any[];
    itemClick: { item: any; index: number };
    dragStart: { item: any; index: number };
    dragEnd: { item: any; index: number };
  }>();

  let isDragging = false;
  let dragStartTime = 0;
  let dragStarted = false;

  // Ensure items have unique IDs for dnd-action
  $: dndItems = items.map((item, index) => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return { ...item, originalIndex: index };
    }
    return { id: `temp_${index}`, ...item, originalIndex: index };
  });

  function isInteractiveElement(element: HTMLElement): boolean {
    // Check if the clicked element or any parent is an interactive element
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      // Check for input elements
      if (current.tagName === 'INPUT' || current.tagName === 'BUTTON') {
        return true;
      }
      
      // Check for elements with click handlers or interactive attributes
      if (current.hasAttribute('role') && current.getAttribute('role') === 'button') {
        return true;
      }
      
      // Check for our specific interactive elements by title attribute
      const title = current.getAttribute('title');
      if (title === 'Click to edit title' || 
          title === 'Copy content' || 
          title === 'Delete section') {
        return true;
      }
      
      // Check for specific interactive classes (be more specific than just cursor-pointer)
      if (current.classList.contains('copy-button') ||
          current.classList.contains('opacity-0')) { // This catches our action buttons
        return true;
      }
      
      // Move up to parent
      current = current.parentElement as HTMLElement;
      
      // Stop if we've reached the card container level
      if (current && current.classList.contains('sortable-grid-item')) {
        break;
      }
    }
    
    return false;
  }

  function handleMouseDown(event: MouseEvent, item: any, index: number) {
    // Only handle left mouse button
    if (event.button !== 0) return;
    
    // Don't start drag detection for interactive elements
    if (isInteractiveElement(event.target as HTMLElement)) {
      return;
    }
    
    dragStartTime = Date.now();
    dragStarted = false;
    
    // Set up drag detection
    const checkForDrag = () => {
      if (Date.now() - dragStartTime >= dragThreshold && !dragStarted) {
        dragStarted = true;
        // This will be handled by the dnd library once dragging actually starts
      }
    };

    // Check after threshold
    setTimeout(checkForDrag, dragThreshold);
  }

  function handleMouseUp(event: MouseEvent, item: any, index: number) {
    // Don't handle clicks on interactive elements
    if (isInteractiveElement(event.target as HTMLElement)) {
      return;
    }
    
    const clickDuration = Date.now() - dragStartTime;
    
    // If it was a quick click (under threshold) and no drag occurred, treat as click
    if (clickDuration < dragThreshold && !isDragging && !dragStarted) {
      dispatch('itemClick', { item, index });
    }
    
    dragStarted = false;
  }

  function handleDndConsider(e: CustomEvent) {
    dndItems = e.detail.items;
    
    if (!isDragging) {
      isDragging = true;
      dispatch('dragStart', { 
        item: e.detail.items[0], 
        index: e.detail.items[0]?.originalIndex ?? 0 
      });
    }
  }

  function handleDndFinalize(e: CustomEvent) {
    dndItems = e.detail.items;
    isDragging = false;
    
    // Extract items without temporary data and dispatch
    const reorderedItems = dndItems.map(item => {
      const { originalIndex, ...cleanItem } = item;
      
      // Remove temporary ID if we added one
      if (typeof cleanItem.id === 'string' && cleanItem.id.startsWith('temp_')) {
        const { id, ...rest } = cleanItem;
        return rest;
      }
      
      return cleanItem;
    });
    
    dispatch('reorder', reorderedItems);
    dispatch('dragEnd', { 
      item: reorderedItems[0], 
      index: 0 
    });
  }

  // Enhanced dnd options for grid layout
  $: dndOptions = {
    items: dndItems,
    flipDurationMs: flipDuration,
    dropTargetStyle: {
      outline: '2px dashed #3b82f6',
      outlineOffset: '2px',
      backgroundColor: 'rgba(59, 130, 246, 0.05)'
    },
    dragDisabled: disabled,
    type: 'grid-item'
  };
</script>

<div 
  class={gridClass}
  class:dragging={isDragging}
  use:dndzone={dndOptions}
  on:consider={handleDndConsider}
  on:finalize={handleDndFinalize}
>
  {#each dndItems as item, index (item.id)}
    <div
      class="sortable-grid-item"
      class:dragging-item={isDragging}
      on:mousedown={(e) => handleMouseDown(e, item, index)}
      on:mouseup={(e) => handleMouseUp(e, item, index)}
    >
      <slot {item} {index} {isDragging} />
    </div>
  {/each}
</div>

<style>
  /* Global drag styles */
  :global(.dragging) {
    user-select: none;
  }
  
  :global(.dragging .sortable-grid-item) {
    pointer-events: none;
  }
  
  /* Individual item drag feedback */
  .sortable-grid-item {
    transition: transform 0.2s ease, opacity 0.2s ease;
    cursor: pointer;
  }
  
  .sortable-grid-item.dragging-item {
    opacity: 0.7;
    z-index: 1000;
  }

  /* Drop zone visual feedback */
  :global(.drop-zone-active) {
    background-color: rgba(59, 130, 246, 0.1) !important;
    border: 2px dashed #3b82f6 !important;
    transition: all 0.2s ease;
  }

  /* Prevent text selection during potential drag */
  .sortable-grid-item:active {
    user-select: none;
  }
</style>