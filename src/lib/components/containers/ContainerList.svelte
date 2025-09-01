<!-- src/lib/components/containers/ContainerList.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
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
    moveToCollection: {
      containerId: string;
      targetCollectionId: string;
    };
  }>();
  
  // Prepare containers for dndzone (they already have IDs)
  $: dndContainers = containers.map(container => ({ ...container }));
  
  let draggedContainer: NoteContainer | null = null;
  let dndContainer: HTMLElement;
  
  // Track cursor position for drop detection
  let lastPointerX = 0;
  let lastPointerY = 0;
  
  function trackPointer(e: PointerEvent | MouseEvent) {
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  }
  
  function handleContainerConsider(e: CustomEvent) {
    const { items, info } = e.detail;
    dndContainers = items;
    
    if (info.source === 'dragStart') {
      draggedContainer = info.trigger === 'dragStart' ? items.find(item => item.isDndShadowItem) : null;
      console.log('Container drag started:', draggedContainer?.title);
    }
  }
  
  function handleContainerFinalize(e: CustomEvent) {
    const { items, info } = e.detail;
    console.log('Container finalize event:', { info, itemsLength: items.length });
    
    dndContainers = items;
    
    // Handle different finalize scenarios
    if (info.trigger === 'droppedIntoZone') {
      // Check if items order actually changed (reorder detection)
      const originalIds = containers.map(c => c.id);
      const newIds = items.map(c => c.id);
      const orderChanged = !originalIds.every((id, index) => id === newIds[index]);
      
      if (orderChanged) {
        // Find the moved container's original and new positions
        let fromIndex = -1;
        let toIndex = -1;
        let movedContainer: NoteContainer | null = null;
        
        // Find which container was moved
        for (let i = 0; i < items.length; i++) {
          const newContainer = items[i];
          const originalIndex = containers.findIndex(c => c.id === newContainer.id);
          
          if (originalIndex !== i) {
            fromIndex = originalIndex;
            toIndex = i;
            movedContainer = newContainer;
            break;
          }
        }
        
        if (fromIndex !== -1 && toIndex !== -1 && movedContainer) {
          console.log('Container reordered:', {
            container: movedContainer.title,
            fromIndex,
            toIndex
          });
          dispatch('reorder', { fromIndex, toIndex });
        }
      }
    } else if (info.trigger === 'droppedOutsideOfAny' && info.id && draggedContainer) {
      // Container was dropped outside of any drop zone - check if it was on a collection tab
      console.log('Container dropped outside, checking for collection tab drop:', {
        containerId: info.id,
        draggedContainer: draggedContainer.title
      });
      
      // Get the current cursor position and check what element is underneath
      const dropTarget = document.elementFromPoint(lastPointerX, lastPointerY);
      
      console.log('Drop target element:', dropTarget);
      
      if (dropTarget) {
        // Check if the drop target is a collection tab or inside one
        const collectionTab = dropTarget.closest('[data-collection-id]');
        if (collectionTab) {
          const targetCollectionId = collectionTab.getAttribute('data-collection-id');
          console.log('Found collection tab:', targetCollectionId);
          
          if (targetCollectionId && targetCollectionId !== collectionId) {
            console.log('Dispatching cross-collection move:', {
              containerId: info.id,
              targetCollectionId
            });
            
            dispatch('moveToCollection', {
              containerId: info.id,
              targetCollectionId
            });
          } else {
            console.log('Drop target is same collection, ignoring');
          }
        } else {
          console.log('Drop target is not a collection tab');
        }
      }
    } else {
      console.log('No reorder detected - order unchanged or different trigger type:', info.trigger);
    }
    
    // Reset dragged container at the end
    draggedContainer = null;
  }
  
  function handleContainerClick(container: NoteContainer) {
    if (!draggedContainer) {
      dispatch('selectContainer', container);
    }
  }
  
  function handleDeleteContainer(event: CustomEvent<string>) {
    if (!draggedContainer) {
      dispatch('deleteContainer', event.detail);
    }
  }
  
  function handleCrossContainerDrop(event: CustomEvent<{
    sectionId: string;
    fromContainer: string;
    toContainer: string;
  }>) {
    dispatch('crossContainerDrop', event.detail);
  }
  
  // Custom drag transform for smaller ghost
  const dragTransform = {
    transform: (draggedElement: HTMLElement) => {
      // Create a smaller, styled version of the container card
      draggedElement.style.transform = 'scale(0.8)';
      draggedElement.style.opacity = '0.9';
      draggedElement.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)';
      draggedElement.style.borderRadius = '8px';
      draggedElement.style.rotate = '2deg';
      draggedElement.style.zIndex = '1000';
    }
  };
</script>

<div class="container-list">
  <div 
    bind:this={dndContainer}
    class="dnd-container"
    on:pointermove={trackPointer}
    on:mousemove={trackPointer}
    use:dndzone={{
      items: dndContainers,
      flipDurationMs: 200,
      type: 'containers',
      dropTargetStyle: {
        outline: '2px dashed #3b82f6',
        outlineOffset: '2px',
        backgroundColor: 'rgba(59, 130, 246, 0.05)'
      },
      transformDraggedElement: dragTransform.transform,
      dragDisabled: false,
      morphDisabled: true,
      dropFromOthersDisabled: false,
      centreDraggedOnCursor: true
    }}
    on:consider={handleContainerConsider}
    on:finalize={handleContainerFinalize}
  >
    {#each dndContainers as container (container.id)}
      <div 
        class="container-wrapper"
        data-container-id={container.id}
        draggable="true"
        on:dragstart={(e) => {
          console.log('HTML5 dragstart fired for container:', container.id);
          if (e.dataTransfer) {
            e.dataTransfer.setData('text/container-id', container.id);
            e.dataTransfer.effectAllowed = 'move';
            console.log('Set drag data for container:', container.id);
          }
          draggedContainer = container;
        }}
        on:dragend={() => {
          console.log('HTML5 dragend fired');
          draggedContainer = null;
        }}
      >
        <ContainerItem 
          {container}
          isSelected={selectedContainer?.id === container.id}
          {isCollapsed}
          isDragging={draggedContainer?.id === container.id}
          itemIndex={dndContainers.findIndex(c => c.id === container.id)}
          on:select={() => handleContainerClick(container)}
          on:delete={handleDeleteContainer}
          on:crossContainerDrop={handleCrossContainerDrop}
        />
      </div>
    {/each}
  </div>
</div>

{#if containers.length === 0 && !isCollapsed}
  <div class="text-center text-gray-500 text-sm py-8">
    No notes yet.<br>Click "New Note" to get started!
  </div>
{/if}

<style>
  .container-list {
    width: 100%;
  }
  
  .dnd-container {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
  }
  
  .container-wrapper {
    width: 100%;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  /* Hover effect when not being dragged */
  .container-wrapper:not(:has(.container-being-dragged)):hover {
    transform: translateY(-1px);
  }
</style>