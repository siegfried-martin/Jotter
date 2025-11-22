<!-- src/lib/dnd/components/DragZone.svelte -->
<script lang="ts">
  import { getContext, onMount, createEventDispatcher } from 'svelte';
  import type { DragConfig } from '../core/DragDetection';

  // Props
  export let zoneId: string;
  export let item: any;
  export let itemType: string;
  export let itemIndex: number;
  export let disabled: boolean = false;
  export let className: string = '';

  // Get drag context
  const dragContext = getContext('drag');
  if (!dragContext) {
    throw new Error('DragZone must be used within a DragProvider');
  }

  const { dragCore, attachDragTo } = dragContext;

  // Component state
  let element: HTMLElement;
  let cleanup: (() => void) | null = null;

  // Create event dispatcher
  const dispatch = createEventDispatcher<{
    click: { item: any; itemType: string };
    dragStart: { item: any; itemType: string };
    dragEnd: { item: any; itemType: string };
  }>();

  // Subscribe to drag state for reactive updates
  $: dragState = dragCore.store;
  $: isDragging = $dragState.phase === 'dragging' && $dragState.item?.id === item.id;
  
  // 🔧 REMOVED: isDragOver and isReceivingDrag logic since DragZone is no longer a drop target
  // Drop targeting is now handled by DropZone components

  // Set up drag detection when component mounts
  onMount(() => {
    if (!disabled && element) {
      const config: DragConfig = {
        item,
        itemType,
        zoneId,
        itemIndex
      };

      cleanup = attachDragTo(element, config);
    }

    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  });

  // Re-setup drag when key props change
  $: if (element && !disabled) {
    // Clean up previous attachment
    if (cleanup) {
      cleanup();
    }

    // Set up new attachment
    const config: DragConfig = {
      item,
      itemType,
      zoneId,
      itemIndex
    };

    cleanup = attachDragTo(element, config);
  }

  // Handle external click events (forwarded from DragProvider)
  function handleClick(event: MouseEvent) {
    // Only trigger click if actually clicking the card content, not the wrapper/padding
    const target = event.target as HTMLElement;
    const clickedCard = target.closest('.section-card-base, .container-item-content');

    if (clickedCard) {
      dispatch('click', { item, itemType });
    }
  }

  // Reactive classes - simplified since we're not a drop target
  $: combinedClasses = [
    'drag-zone',
    className,
    isDragging ? 'dragging' : '',
    disabled ? 'disabled' : ''
  ].filter(Boolean).join(' ');

  // Debug logging
  $: if (isDragging) {
    console.log('🔍 DragZone dragging:', {
      itemId: item.id,
      itemType,
      itemIndex,
      zoneId
    });
  }
</script>

<!-- Drag zone container - draggable but not a drop target -->
<div
  bind:this={element}
  class={combinedClasses}
  data-item-index={itemIndex}
  data-item-type={itemType}
  data-item-id={item.id || item.title}
  on:click={handleClick}
>
  <!-- Pass simplified drag state to slot content -->
  <slot
    {item}
    {isDragging}
    {itemIndex}
    dragState={$dragState}
  />
</div>

<style>
  .drag-zone {
    transition: transform 0.2s ease, opacity 0.2s ease;
    position: relative;
  }

  .drag-zone.dragging {
    opacity: 0.5;
    transform: scale(0.95);
    z-index: 1;
  }

  .drag-zone.disabled {
    cursor: default;
    opacity: 0.6;
  }

  .drag-zone.dragging > :global(*) {
    pointer-events: none;
  }
</style>