<!-- src/lib/components/notes/DraggableContainerItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dragStore, dragActions } from '$lib/stores/dragStore';
  import type { NoteContainer } from '$lib/types';

  export let container: NoteContainer;
  export let isSelected: boolean = false;

  const dispatch = createEventDispatcher<{
    select: string;
    delete: string;
    crossContainerDrop: {
      sectionId: string;
      fromContainer: string;
      toContainer: string;
    };
  }>();

  let containerElement: HTMLElement;

  // Check if this container is being hovered during a cross-container drag
  $: isDragTarget = $dragStore.isDragging && 
                   $dragStore.dragOverTargetContainer === container.id && 
                   $dragStore.dragOverTargetType === 'container';

  // Check if we're dragging a section (not this container)
  $: isReceivingDrag = $dragStore.isDragging && 
                      $dragStore.draggedFromContainer !== container.id &&
                      $dragStore.draggedItem;

  function handleMouseEnter() {
    // Only track as drop target if we're dragging a section
    if (isReceivingDrag) {
      dragActions.setDragOverTarget(container.id, 'container');
    }
  }

  function handleMouseLeave() {
    // Clear target when leaving
    if (isDragTarget) {
      dragActions.setDragOverTarget(null, null);
    }
  }

  function handleClick(event: MouseEvent) {
    // Only handle container selection if not in the middle of a drag
    if (!$dragStore.isDragging) {
      dispatch('select', container.id);
    } else if (isDragTarget && $dragStore.draggedItem) {
      // Handle cross-container drop
      event.preventDefault();
      event.stopPropagation();
      
      dispatch('crossContainerDrop', {
        sectionId: $dragStore.draggedItem.id,
        fromContainer: $dragStore.draggedFromContainer!,
        toContainer: container.id
      });
      
      dragActions.endDrag();
    }
  }

  function handleDeleteClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    dispatch('delete', container.id);
  }
</script>

<div
  bind:this={containerElement}
  class="container-item"
  class:selected={isSelected}
  class:drag-target={isDragTarget}
  class:can-receive={isReceivingDrag}
  on:click={handleClick}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
>
  <div class="container-content">
    <div class="container-title">
      {container.title}
    </div>
    
    {#if isDragTarget}
      <div class="drop-hint">
        Drop here to move section
      </div>
    {/if}
    
    <button
      class="delete-button opacity-0 group-hover:opacity-100"
      on:click={handleDeleteClick}
      title="Delete container"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .container-item {
    position: relative;
    padding: 8px 12px;
    margin: 2px 0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }

  .container-item:hover {
    background-color: #f3f4f6;
  }

  .container-item.selected {
    background-color: #dbeafe;
    border-color: #3b82f6;
  }

  .container-item.can-receive {
    border-color: #e5e7eb;
    background-color: #f9fafb;
  }

  .container-item.drag-target {
    border-color: #3b82f6 !important;
    background-color: #dbeafe !important;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .container-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
  }

  .container-title {
    font-weight: 500;
    color: #374151;
    flex: 1;
    truncate;
  }

  .drop-hint {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #3b82f6;
    color: white;
    text-align: center;
    padding: 4px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    z-index: 10;
    margin-top: 4px;
  }

  .delete-button {
    padding: 4px;
    color: #6b7280;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .delete-button:hover {
    color: #ef4444;
    background-color: #fef2f2;
  }

  /* Hide delete button during drag operations */
  .container-item.can-receive .delete-button {
    display: none;
  }
</style>