<!-- src/lib/dnd/components/DraggableContainer.svelte -->
<script lang="ts">
  import { getContext, createEventDispatcher } from 'svelte';
  import DragZone from './DragZone.svelte';

  export let item: any;
  export let itemType: string;
  export let itemIndex: number;
  export let zoneId: string;
  export let disabled: boolean = false;
  export let className: string = '';

  // Get drag context
  const dragContext = getContext('drag');
  if (!dragContext) {
    throw new Error('DraggableContainer must be used within a DragProvider');
  }

  const { dragCore } = dragContext;
  const dispatch = createEventDispatcher();

  // Subscribe to drag state
  $: dragState = dragCore.store;
  $: isBeingDragged = $dragState.phase === 'dragging' && $dragState.item?.id === item.id;
  $: isDragOver = $dragState.phase === 'dragging' && 
                  $dragState.dropTarget?.zoneId === zoneId && 
                  $dragState.dropTarget?.itemIndex === itemIndex;

  // Combined classes
  $: containerClasses = [
    'draggable-container',
    isBeingDragged ? 'being-dragged' : '',
    isDragOver ? 'drag-over' : '',
    className
  ].filter(Boolean).join(' ');

  // Handle click events
  function handleClick(event) {
    dispatch('click', { item, itemType });
  }
</script>

<!-- Full card-sized drop zone container -->
<div 
  class={containerClasses}
  data-drop-zone={zoneId}
  data-insert-position={itemIndex}
  data-item-id={item.id}
>
  <!-- Inner DragZone for drag detection only -->
  <DragZone
    {zoneId}
    {item}
    {itemType}
    {itemIndex}
    {disabled}
    on:click={handleClick}
  >
    <svelte:fragment slot="default" let:item let:isDragging>
      <!-- Pass through all props to the content -->
      <slot 
        {item} 
        {isDragging}
        {isBeingDragged}
        {isDragOver}
        {itemIndex}
      />
    </svelte:fragment>
  </DragZone>
</div>

<style>
  .draggable-container {
    position: relative;
    transition: opacity 0.2s ease, transform 0.2s ease;
    width: 100%;
    
    /* 🔧 UNIVERSAL FIX: Hide any content that overflows container boundaries */
    visibility: hidden;
  }

  /* Make the slot content visible */
  .draggable-container > :global(*) {
    visibility: visible;
  }

  /* Being dragged - semi-transparent but stays in place */
  .draggable-container.being-dragged {
    opacity: 0.5;
    /* Keep in flow, don't lift out of DOM */
  }

  /* Valid drop target - show feedback */
  .draggable-container.drag-over {
    outline: 3px solid #3b82f6;
    outline-offset: 2px;
    background: rgba(59, 130, 246, 0.05);
    transform: scale(1.02);
  }

  /* Hover effects when not dragging */
  .draggable-container:not(.being-dragged):hover {
    transform: translateY(-2px);
  }
</style>