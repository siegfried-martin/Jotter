<!-- src/lib/components/containers/ContainerList.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dragStore, dragActions, type DragItemType } from '$lib/stores/dragStore.DELETE';
  import DraggableItem from '../ui/DraggableItem.DELETE.svelte';
  import ContainerItem from './ContainerItem.svelte';
  import { useNoteContainerDnD } from '$lib/composables/useNoteContainerDnD';
  import type { NoteContainer } from '$lib/types';
  
  export let containers: NoteContainer[] = [];
  export let selectedContainer: NoteContainer | null = null;
  export let isCollapsed = true;
  export let collectionId: string;
  
  let isReordering = false;
  
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
  
  // Check if we're receiving a section drag
  $: isReceivingSectionDrag = $dragStore.isDragging && $dragStore.itemType === 'section';
  
  // Create visual preview of reordered items during drag
  $: visualContainers = createVisualLayout(containers, $dragStore);

  function createVisualLayout(originalContainers: NoteContainer[], dragState: any) {
    if (!dragState.isDragging || !dragState.draggedItem) {
      return originalContainers;
    }

    // Only show preview for container drags, not section drags
    if (dragState.itemType !== 'container') {
      return originalContainers;
    }

    const draggedId = dragState.draggedItem.id;
    const dragOverIndex = dragState.dragOverIndex;
    const dragOverContainer = dragState.dragOverContainer;

    // FIXED: Check for the shared container ID like sections do
    if (dragOverContainer !== 'container-list' || dragOverIndex === null) {
      return originalContainers;
    }

    console.log('🔄 Creating visual layout preview:', {
      draggedId,
      dragOverIndex,
      originalLength: originalContainers.length
    });

    // Create a copy and remove the dragged item
    const containersWithoutDragged = originalContainers.filter(c => c.id !== draggedId);
    
    // Find the dragged container
    const draggedContainer = originalContainers.find(c => c.id === draggedId);
    if (!draggedContainer) return originalContainers;

    // Insert at the new position
    const newContainers = [...containersWithoutDragged];
    newContainers.splice(dragOverIndex, 0, draggedContainer);

    console.log('✅ Visual preview created:', newContainers.map(c => c.title));

    return newContainers;
  }

  // Helper function to reorder array
  function reorderArray(array: NoteContainer[], fromIndex: number, toIndex: number): NoteContainer[] {
    const newArray = [...array];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray;
  }

  // Initialize the DnD composable with the collection ID
  const containerDnD = useNoteContainerDnD({
    collectionId,
    onSuccess: (updatedContainers) => {
      console.log('✅ Container reorder completed from server, updating containers');
      // Update local state with server response
      containers = updatedContainers;
    },
    onError: (error) => {
      console.error('❌ Container reorder failed:', error);
      isReordering = false;
    }
  });

  async function handleReorder(event: CustomEvent<{
    itemId: string;
    item: NoteContainer;
    fromContainer: string;
    fromIndex: number;
    toContainer: string;
    toIndex: number;
  }>) {
    console.log('🎯 Container reorder event received:', event.detail);

    if (isReordering || isReceivingSectionDrag) return;
    
    const { itemId, fromIndex, toIndex } = event.detail;
    
    // Same container reordering only for now
    if (fromIndex === toIndex) {
      console.log('👆 No reorder needed - same position');
      return;
    }

    isReordering = true;

    // Store original order for rollback
    const originalContainers = [...containers];

    try {
      console.log(`🎯 Optimistically reordering container from ${fromIndex} to ${toIndex}`);
      
      // 1. OPTIMISTICALLY update local state first (prevents flicker)
      const newContainers = reorderArray(containers, fromIndex, toIndex);
      containers = newContainers;
      
      console.log('🎯 Optimistic reorder applied, now updating server...');
      
      // 2. Dispatch the reorder event immediately for UI responsiveness
      dispatch('reorder', { fromIndex, toIndex });
      
      // 3. THEN update server via composable
      await containerDnD.handleReorder(fromIndex, toIndex);
      
      console.log('✅ Container reorder completed on server');
      
    } catch (error) {
      console.error('❌ Failed to reorder containers:', error);
      
      // ROLLBACK optimistic update on error
      console.log('🔄 Rolling back optimistic reorder due to error');
      containers = originalContainers;
      
    } finally {
      isReordering = false;
    }
  }

  function handleSelectContainer(event: CustomEvent<NoteContainer>) {
    if (!isReordering && !isReceivingSectionDrag) {
      dispatch('selectContainer', event.detail);
    }
  }

  function handleDeleteContainer(event: CustomEvent<string>) {
    if (!isReordering && !isReceivingSectionDrag) {
      dispatch('deleteContainer', event.detail);
    }
  }

  function handleCrossContainerDrop(event: CustomEvent<{
    sectionId: string;
    fromContainer: string;
    toContainer: string;
  }>) {
    if (!isReordering) {
      dispatch('crossContainerDrop', event.detail);
    }
  }
</script>

{#if isReceivingSectionDrag}
  <!-- When receiving section drag, disable container DnD -->
  <div class="section-receiving-mode">
    {#each containers as container (container.id)}
      <ContainerItem
        {container}
        isSelected={selectedContainer?.id === container.id}
        {isCollapsed}
        on:select={handleSelectContainer}
        on:delete={handleDeleteContainer}
        on:crossContainerDrop={handleCrossContainerDrop}
      />
    {/each}
  </div>
{:else}
  <!-- Normal container DnD mode using custom system -->
  <div class="container-grid">
    {#each visualContainers as container, index (container.id)}
      {@const originalIndex = containers.findIndex(c => c.id === container.id)}
      <DraggableItem
        item={container}
        itemId={container.id}
        itemType="container"
        containerIndex={0}
        itemIndex={originalIndex}
        containerId="container-list"
        disabled={false}
        on:reorder={handleReorder}
        on:click={(e) => console.log('🖱️ DraggableItem click:', e.detail)}
      >
        <svelte:fragment slot="default" let:item let:isDragging let:isDragOver let:itemIndex>
          <ContainerItem
            container={item}
            isSelected={selectedContainer?.id === item.id}
            {isCollapsed}
            isDragging={isDragging}
            isDragOver={isDragOver}
            itemIndex={itemIndex}
            on:select={handleSelectContainer}
            on:delete={handleDeleteContainer}
            on:crossContainerDrop={handleCrossContainerDrop}
          />
        </svelte:fragment>
      </DraggableItem>
    {/each}
  </div>
{/if}

{#if containers.length === 0 && !isCollapsed}
  <div class="text-center text-gray-500 text-sm py-8">
    No notes yet.<br>Click "New Note" to get started!
  </div>
{/if}

<style>
  /* Container grid - single column like sections but vertical */
  .container-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px; /* Equivalent to space-y-2 */
    min-height: 100px;
  }

  .container-grid.dragging {
    /* Add any global drag state styling here */
  }

  /* Section receiving mode - fallback to flexbox */
  .section-receiving-mode {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Dragging state for grid items */
  .container-grid > :global(.draggable-item.dragging) {
    opacity: 0.5;
    transform: scale(0.95);
  }
</style>