<!-- src/lib/components/sections/SectionGrid.svelte -->
<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import DraggableContainer from '$lib/dnd/components/DraggableContainer.svelte';
  import SectionCard from './SectionCard.svelte';
  import type { NoteSection } from '$lib/types';

  export let sections: NoteSection[] = [];
  export let noteContainerId: string;
  export let sortMode: boolean = true;

  const dispatch = createEventDispatcher<{
    edit: string;
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
  }>();

  // Get drag context to subscribe to state changes
  const dragContext = getContext('drag');
  const { dragCore } = dragContext || {};

  // Create zone ID for this grid
  $: zoneId = `section-grid-${noteContainerId}`;

  // Subscribe to drag state for live reordering
  $: dragState = dragCore?.store;
  $: isCurrentlyDragging = $dragState?.phase === 'dragging' && 
                           $dragState?.itemType === 'section' &&
                           $dragState?.sourceZone === zoneId;
  
  // Calculate display order based on drag state with safety checks
  $: displaySections = isCurrentlyDragging && $dragState?.dropTarget?.targetType === 'reorder' 
    ? reorderSectionsForPreview(sections, $dragState)
    : sections;

  // Filter out any undefined sections and ensure all have valid IDs
  $: safeSections = (displaySections || []).filter(section => 
    section && 
    typeof section === 'object' && 
    section.id
  );

  function reorderSectionsForPreview(originalSections: NoteSection[], dragState: any) {
    if (!dragState.dropTarget || !dragState.item || !originalSections) return originalSections;
    
    const sourceIndex = dragState.sourceIndex;
    const targetIndex = dragState.dropTarget.itemIndex;
    
    console.log('🎨 Live reordering preview:', {
      sourceIndex,
      targetIndex,
      draggedItem: dragState.item.id
    });
    
    // Create new array with item moved to target position
    const result = [...originalSections];
    const [draggedItem] = result.splice(sourceIndex, 1);
    
    // Safety check: ensure draggedItem exists before inserting
    if (draggedItem) {
      result.splice(targetIndex, 0, draggedItem);
    }
    
    console.log('🎨 Preview order:', result.map(s => s?.id || 'undefined'));
    return result;
  }

  function handleSectionClick(event: CustomEvent<{ item: NoteSection; itemType: string }>) {
    console.log('🎯 Section clicked:', event.detail.item.id);
    dispatch('edit', event.detail.item.id);
  }

  function handleDelete(event: CustomEvent<string>) {
    dispatch('delete', event.detail);
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    dispatch('checkboxChange', event.detail);
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    dispatch('titleSave', event.detail);
  }

  // Debug logging
  $: console.log('🔧 SectionGrid rendered with live reordering:', {
    zoneId,
    originalCount: sections?.length || 0,
    displayCount: displaySections?.length || 0,
    safeCount: safeSections?.length || 0,
    isCurrentlyDragging,
    dragState: $dragState ? {
      phase: $dragState.phase,
      sourceIndex: $dragState.sourceIndex,
      targetIndex: $dragState.dropTarget?.itemIndex
    } : null
  });
</script>

<div class="section-grid mb-10">
  <!-- Grid layout with DraggableContainers and live reordering -->
  <div 
    class="section-list"
    data-section-grid={zoneId}
  >
    {#each safeSections as section, index (section.id)}
      <DraggableContainer
        item={section}
        itemType="section"
        itemIndex={index}
        {zoneId}
        disabled={!sortMode}
        className="section-draggable-container"
        on:click={handleSectionClick}
      >
        <svelte:fragment slot="default" let:item let:isDragging let:isBeingDragged let:isDragOver>
          <SectionCard 
            section={item}
            isDragging={isBeingDragged}
            on:delete={handleDelete}
            on:checkboxChange={handleCheckboxChange}
            on:titleSave={handleTitleSave}
          />
        </svelte:fragment>
      </DraggableContainer>
    {/each}
  </div>

  <!-- Empty state -->
  {#if sections.length === 0}
    <div class="empty-state">
      <div class="empty-content">
        <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        <p class="text-gray-500 text-sm">No sections yet. Add one below!</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .section-grid {
    position: relative;
    width: 100%;
    overflow: visible; /* Prevent grid container from creating scrollbars */
  }

  /* Grid layout with auto-fit columns */
  .section-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
    gap: 1.5rem;
    width: 100%;
    /* Removed max-width - use full container width */
    margin: 0 auto;
    padding: 0 1rem; /* Add consistent padding */
    box-sizing: border-box; /* Include padding in width calculations */
  }

  /* Empty state */
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    width: 100%;
  }

  .empty-content {
    text-align: center;
    padding: 2rem;
  }

  /* DraggableContainer specific styles */
  :global(.section-draggable-container) {
    width: 100%; /* Fill grid cell */
    min-height: 200px; /* Minimum height */
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px; /* Slightly more rounded for grid */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* Subtle shadow */
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: flex;
    flex-direction: column; /* Ensure proper content flow */
    box-sizing: border-box; /* Include borders in size calculations */
  }

  /* Hover effect for grid cards */
  :global(.section-draggable-container:not(.being-dragged):hover) {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  /* Responsive grid adjustments */
  @media (max-width: 1024px) {
    .section-list {
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      padding: 0 1rem;
      gap: 1rem;
    }
  }

  @media (max-width: 640px) {
    .section-list {
      grid-template-columns: 1fr; /* Single column on mobile */
      padding: 0 0.5rem;
    }
    
    :global(.section-draggable-container) {
      min-height: 180px; /* Shorter minimum on mobile */
    }
  }
</style>