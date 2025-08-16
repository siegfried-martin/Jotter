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
  
  // Calculate display order based on drag state
  $: displaySections = isCurrentlyDragging && $dragState?.dropTarget?.targetType === 'reorder' 
    ? reorderSectionsForPreview(sections, $dragState)
    : sections;

  function reorderSectionsForPreview(originalSections: NoteSection[], dragState: any) {
    if (!dragState.dropTarget || !dragState.item) return originalSections;
    
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
    result.splice(targetIndex, 0, draggedItem);
    
    console.log('🎨 Preview order:', result.map(s => s.id));
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
    originalCount: sections.length,
    displayCount: displaySections.length,
    isCurrentlyDragging,
    dragState: $dragState ? {
      phase: $dragState.phase,
      sourceIndex: $dragState.sourceIndex,
      targetIndex: $dragState.dropTarget?.itemIndex
    } : null
  });
</script>

<div class="section-grid">
  <!-- List layout with DraggableContainers and live reordering -->
  <div 
    class="section-list"
    data-section-grid={zoneId}
  >
    {#each displaySections as section, index (section.id)}
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
  }

  /* List layout */
  .section-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
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
    min-height: 120px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .section-list {
      max-width: 100%;
      padding: 0 1rem;
    }
  }
</style>