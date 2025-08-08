<!-- src/lib/components/sections/SectionGrid.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dragStore } from '$lib/stores/dragStore';
  import SectionItem from './SectionItem.svelte';
  import type { NoteSection } from '$lib/types';
  import { SectionService } from '$lib/services/sectionService';

  export let sections: NoteSection[] = [];
  export let noteContainerId: string;
  export let sortMode: boolean = true;

  const dispatch = createEventDispatcher<{
    sectionsReordered: NoteSection[];
    edit: string;
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
    crossContainerMove: {
      sectionId: string;
      fromContainer: string;
      toContainer: string;
    };
  }>();

  let isReordering = false;

  // Create visual preview of reordered items during drag
  $: visualSections = createVisualLayout(sections, $dragStore);

  function createVisualLayout(originalSections: NoteSection[], dragState: any) {
    if (!dragState.isDragging || !dragState.draggedItem) {
      return originalSections;
    }

    const draggedId = dragState.draggedItem.id;
    const dragOverIndex = dragState.dragOverIndex;
    const dragOverContainer = dragState.dragOverContainer;

    // Only show preview for same container
    if (dragOverContainer !== noteContainerId || dragOverIndex === null) {
      return originalSections;
    }

    // Create a copy and remove the dragged item
    const sectionsWithoutDragged = originalSections.filter(s => s.id !== draggedId);
    
    // Find the dragged section
    const draggedSection = originalSections.find(s => s.id === draggedId);
    if (!draggedSection) return originalSections;

    // Insert at the new position
    const newSections = [...sectionsWithoutDragged];
    newSections.splice(dragOverIndex, 0, draggedSection);

    return newSections;
  }

  // Create a visual ghost/overlay for the dragged item
  $: draggedSection = $dragStore.isDragging ? $dragStore.draggedItem : null;
  $: dragPosition = $dragStore.currentPosition;

  async function handleReorder(event: CustomEvent<{
    itemId: string;
    item: NoteSection;
    fromContainer: string;
    fromIndex: number;
    toContainer: string;
    toIndex: number;
  }>) {
    if (isReordering) return;
    
    const { itemId, fromContainer, fromIndex, toContainer, toIndex } = event.detail;
    
    // Check if this is a cross-container move
    if (fromContainer !== toContainer) {
      console.log('🔄 Cross-container move detected');
      dispatch('crossContainerMove', {
        sectionId: itemId,
        fromContainer,
        toContainer
      });
      return;
    }

    // Handle same-container reordering
    if (fromContainer !== noteContainerId) {
      console.log('🚫 Container mismatch for same-container reorder');
      return;
    }

    if (fromIndex === toIndex) {
      console.log('👆 No reorder needed - same position');
      return;
    }

    isReordering = true;

    try {
      console.log(`🔄 Reordering section from ${fromIndex} to ${toIndex}`);
      
      // Use original sections for database update (not visual preview)
      const actualFromIndex = sections.findIndex(s => s.id === itemId);
      
      // Update database with actual indices
      const updatedSections = await SectionService.reorderSections(
        noteContainerId, 
        actualFromIndex, 
        toIndex
      );
      
      // Update with server response
      sections = updatedSections;
      dispatch('sectionsReordered', updatedSections);
      
      console.log('✅ Section reorder completed');
    } catch (error) {
      console.error('❌ Failed to reorder sections:', error);
      // Keep original sections on error
      sections = [...sections];
    } finally {
      isReordering = false;
    }
  }

  function handleEdit(event: CustomEvent<string>) {
    if (!isReordering) {
      dispatch('edit', event.detail);
    }
  }

  function handleDelete(event: CustomEvent<string>) {
    if (!isReordering) {
      dispatch('delete', event.detail);
    }
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    if (!isReordering) {
      dispatch('checkboxChange', event.detail);
    }
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    if (!isReordering) {
      dispatch('titleSave', event.detail);
    }
  }
</script>

<div class="section-grid">
  <!-- Main grid -->
  <div 
    class="grid gap-6 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 min-h-[100px]"
    class:dragging={$dragStore.isDragging}
  >
    {#each visualSections as section, index (section.id)}
      {@const originalIndex = sections.findIndex(s => s.id === section.id)}
      <SectionItem
        {section}
        containerIndex={0}
        itemIndex={originalIndex}
        containerId={noteContainerId}
        disabled={!sortMode}
        on:edit={handleEdit}
        on:delete={handleDelete}
        on:checkboxChange={handleCheckboxChange}
        on:titleSave={handleTitleSave}
        on:reorder={handleReorder}
      />
    {/each}
  </div>

  <!-- Drag overlay/ghost -->
  {#if draggedSection && dragPosition}
    <div 
      class="drag-ghost"
      style:left="{dragPosition.x - 150}px"
      style:top="{dragPosition.y - 50}px"
    >
      <div class="ghost-content">
        <div class="ghost-header">
          <span class="ghost-type">{draggedSection.type}</span>
          <span class="ghost-title">
            {draggedSection.title || (draggedSection.type.charAt(0).toUpperCase() + draggedSection.type.slice(1))}
          </span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .section-grid {
    position: relative;
  }

  .grid.dragging {
    /* Add any global drag state styling here */
  }

  .drag-ghost {
    position: fixed;
    pointer-events: none;
    z-index: 1000;
    width: 300px;
    transform: rotate(3deg);
    transition: none;
  }

  .ghost-content {
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    opacity: 0.9;
  }

  .ghost-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ghost-type {
    background: #3b82f6;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .ghost-title {
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Grid responsive adjustments */
  @media (max-width: 1280px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 1280px) and (max-width: 1536px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>