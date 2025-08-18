<!-- src/lib/components/containers/ContainerList.svelte -->
<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import DraggableContainer from '$lib/dnd/components/DraggableContainer.svelte';
  import ContainerItem from './ContainerItem.svelte';
  import type { NoteContainer } from '$lib/types';
  
  export let containers: NoteContainer[] = [];
  export let selectedContainer: NoteContainer | null = null;
  export let isCollapsed = true;
  export let collectionId: string;
  
  const dispatch = createEventDispatcher<{
    selectContainer: NoteContainer;
    deleteContainer: string;
    reorder: { fromIndex: number; toIndex: number };
    crossContainerDrop: {
      sectionId: string;
      fromContainer: string;
      toContainer: string;
    };
  }>();
  
  // Get drag context from DragProvider
  const dragContext = getContext('drag');
  const { dragCore } = dragContext || {};
  
  // Create zone ID for this container list
  $: zoneId = `container-list`;
  
  // Subscribe to drag state for live reordering and mode detection
  $: dragState = dragCore?.store;
  $: isReceivingSectionDrag = $dragState?.phase === 'dragging' && $dragState?.itemType === 'section';
  $: isCurrentlyDraggingContainer = $dragState?.phase === 'dragging' && 
                                    $dragState?.itemType === 'container' &&
                                    $dragState?.sourceZone === zoneId;
  
  // Calculate display order based on drag state (live reordering preview)
  $: displayContainers = isCurrentlyDraggingContainer && $dragState?.dropTarget?.targetType === 'reorder' 
    ? reorderContainersForPreview(containers, $dragState)
    : containers;
    
  function reorderContainersForPreview(originalContainers: NoteContainer[], dragState: any) {
    if (!dragState.dropTarget || !dragState.item) return originalContainers;
    
    const sourceIndex = dragState.sourceIndex;
    const targetIndex = dragState.dropTarget.itemIndex;
    
    console.log('🎨 Live reordering container preview:', {
      sourceIndex,
      targetIndex,
      draggedContainer: dragState.item.id
    });
    
    // Create new array with container moved to target position
    const result = [...originalContainers];
    const [draggedContainer] = result.splice(sourceIndex, 1);
    result.splice(targetIndex, 0, draggedContainer);
    
    console.log('🎨 Container preview order:', result.map(c => c.title));
    return result;
  }
  
  function handleContainerClick(event: CustomEvent<{ item: NoteContainer; itemType: string }>) {
    console.log('🎯 Container clicked from DragContainer:', event.detail.item.title);
    if (event.detail.itemType === 'container' && !isCurrentlyDraggingContainer) {
      dispatch('selectContainer', event.detail.item);
    }
  }

  function handleDeleteContainer(event: CustomEvent<string>) {
    // Only allow deletion when not dragging
    if (!dragCore?.isDragging('container')) {
      dispatch('deleteContainer', event.detail);
    }
  }

  function handleCrossContainerDrop(event: CustomEvent<{
    sectionId: string;
    fromContainer: string;
    toContainer: string;
  }>) {
    // Always allow cross-container drops for sections
    dispatch('crossContainerDrop', event.detail);
  }

  // Debug logging
  $: console.log('🔧 ContainerList rendered with live reordering:', {
    zoneId,
    originalCount: containers.length,
    displayCount: displayContainers.length,
    isCurrentlyDraggingContainer,
    isReceivingSectionDrag,
    dragState: $dragState ? {
      phase: $dragState.phase,
      itemType: $dragState.itemType,
      sourceIndex: $dragState.sourceIndex,
      targetIndex: $dragState.dropTarget?.itemIndex
    } : null
  });
</script>

{#if isReceivingSectionDrag}
  <!-- When receiving section drag, disable container DnD and show containers as drop targets -->
  <div class="section-receiving-mode">
    {#each containers as container (container.id)}
      <ContainerItem
        {container}
        isSelected={selectedContainer?.id === container.id}
        {isCollapsed}
        itemIndex={containers.findIndex(c => c.id === container.id)}
        on:select={(e) => dispatch('selectContainer', e.detail)}
        on:delete={handleDeleteContainer}
        on:crossContainerDrop={handleCrossContainerDrop}
      />
    {/each}
  </div>
{:else}
  <!-- Normal container DnD mode using new system with grid layout -->
  <div class="container-grid">
    <div 
      class="container-list"
      data-section-grid={zoneId}
    >
      {#each displayContainers as container, index (container.id)}
        <DraggableContainer
          item={container}
          itemType="container"
          itemIndex={index}
          {zoneId}
          disabled={false}
          className="container-draggable-wrapper"
          on:click={handleContainerClick}
        >
          <svelte:fragment slot="default" let:item let:isDragging let:isBeingDragged let:isDragOver>
            <ContainerItem 
              container={item}
              isSelected={selectedContainer?.id === item.id}
              {isCollapsed}
              isDragging={isBeingDragged}
              isDragOver={isDragOver}
              itemIndex={index}
              on:delete={handleDeleteContainer}
              on:crossContainerDrop={handleCrossContainerDrop}
            />
          </svelte:fragment>
        </DraggableContainer>
      {/each}
    </div>
  </div>
{/if}

{#if containers.length === 0 && !isCollapsed}
  <div class="text-center text-gray-500 text-sm py-8">
    No notes yet.<br>Click "New Note" to get started!
  </div>
{/if}

<style>
  .container-grid {
    position: relative;
    width: 100%;
    overflow: visible;
  }

  /* Single-column grid layout for containers */
  .container-list {
    display: grid;
    grid-template-columns: 1fr; /* Single column - width determined by sidebar */
    gap: 8px; /* Equivalent to space-y-2 */
    width: 100%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Section receiving mode - flexbox layout for simple drop targets */
  .section-receiving-mode {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* DraggableContainer wrapper styling */
  :global(.container-draggable-wrapper) {
    width: 100%; /* Fill grid cell */
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border-radius: 8px;
    box-sizing: border-box;
  }

  /* Hover effect for container cards when not being dragged */
  :global(.container-draggable-wrapper:not(.being-dragged):hover) {
    transform: translateY(-1px);
  }
</style>