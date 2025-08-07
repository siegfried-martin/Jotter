<!-- src/lib/components/notes/DndKitNoteGrid.svelte -->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import { 
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
  } from '@dnd-kit/core';
  import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    rectSortingStrategy
  } from '@dnd-kit/sortable';
  import SortableNoteItem from './SortableNoteItem.svelte';
  import NoteItem from './NoteItem.svelte';
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
  }>();

  let dndContext: any = null;
  let isReordering = false;
  let activeSection: NoteSection | null = null;

  // Create sensors for different input methods
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Get section IDs for SortableContext
  $: sectionIds = sections.map(section => section.id);

  onMount(async () => {
    console.log('🔧 DndKitNoteGrid: onMount called');
    await tick();
    initializeDndContext();
  });

  onDestroy(() => {
    console.log('🔧 DndKitNoteGrid: onDestroy called');
    if (dndContext) {
      // DndContext cleanup is handled by Svelte component lifecycle
    }
  });

  function initializeDndContext() {
    console.log('🚀 Initializing DndKit context...');
    console.log('📋 Sections:', sections.length);
  }

  function handleDragStart(event: any) {
    console.log('🎯 DndKit: Drag started', event);
    const { active } = event;
    
    // Find the section being dragged
    activeSection = sections.find(section => section.id === active.id) || null;
    console.log('📝 Active section:', activeSection?.type);
  }

  function handleDragEnd(event: any) {
    console.log('🎯 DndKit: Drag ended', event);
    const { active, over } = event;

    activeSection = null;

    if (!over || active.id === over.id) {
      console.log('👆 No reorder needed');
      return;
    }

    // Handle reordering
    handleReorder(active.id, over.id);
  }

  function handleDragOver(event: any) {
    // For future cross-container dragging
    console.log('🔄 DndKit: Drag over', event);
  }

  async function handleReorder(activeId: string, overId: string) {
    if (isReordering) return;
    isReordering = true;

    try {
      console.log(`🔄 Reordering section ${activeId} over ${overId}`);
      
      // Find indices
      const oldIndex = sections.findIndex(section => section.id === activeId);
      const newIndex = sections.findIndex(section => section.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) {
        console.error('❌ Could not find section indices');
        return;
      }

      console.log(`📊 Moving from index ${oldIndex} to ${newIndex}`);

      // Optimistic update for immediate UI feedback
      const newSections = arrayMove(sections, oldIndex, newIndex);
      sections = newSections;

      // Update database
      const updatedSections = await SectionService.reorderSections(
        noteContainerId, 
        oldIndex, 
        newIndex
      );
      
      // Update with server response
      sections = updatedSections;
      dispatch('sectionsReordered', updatedSections);
      
      console.log('✅ Section reorder completed');
    } catch (error) {
      console.error('❌ Failed to reorder sections:', error);
      // Revert optimistic update on error
      sections = [...sections];
    } finally {
      isReordering = false;
    }
  }

  // Handle click-to-edit when not dragging
  function handleSectionEdit(sectionId: string) {
    if (!isReordering) {
      console.log('👆 Section clicked for edit:', sectionId);
      dispatch('edit', sectionId);
    }
  }

  // Event handlers from child components
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

<DndContext
  bind:this={dndContext}
  {sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
  <div class="dndkit-grid grid gap-6 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 min-h-[100px]">
    <SortableContext 
      items={sectionIds} 
      strategy={rectSortingStrategy}
    >
      {#each sections as section (section.id)}
        <SortableNoteItem
          {section}
          disabled={!sortMode}
          on:edit={() => handleSectionEdit(section.id)}
          on:delete={handleDelete}
          on:checkboxChange={handleCheckboxChange}
          on:titleSave={handleTitleSave}
        />
      {/each}
    </SortableContext>
  </div>

  <!-- Drag overlay for smooth drag feedback -->
  <DragOverlay>
    {#if activeSection}
      <div class="drag-overlay">
        <NoteItem 
          section={activeSection}
          isDragging={true}
          on:delete={() => {}}
          on:checkboxChange={() => {}}
          on:titleSave={() => {}}
        />
      </div>
    {/if}
  </DragOverlay>
</DndContext>

<style>
  .dndkit-grid {
    transition: all 0.2s ease;
  }

  .drag-overlay {
    /* Style for the dragging overlay */
    opacity: 0.95;
    transform: rotate(3deg);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    z-index: 1000;
  }

  /* Grid responsive adjustments */
  @media (max-width: 1280px) {
    .dndkit-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 1280px) and (max-width: 1536px) {
    .dndkit-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>