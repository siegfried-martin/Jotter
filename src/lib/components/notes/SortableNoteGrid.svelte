<!-- src/lib/components/notes/SortableNoteGrid.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SortableGrid from '../ui/SortableGrid.svelte';
  import NoteItem from './NoteItem.svelte';
  import type { NoteSection } from '$lib/types';
  import { SectionService } from '$lib/services/sectionService';

  export let sections: NoteSection[] = [];
  export let noteContainerId: string;

  const dispatch = createEventDispatcher<{
    sectionsReordered: NoteSection[];
    edit: string;
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
  }>();

  let isReordering = false;

  async function handleReorder(event: CustomEvent<NoteSection[]>) {
    if (isReordering) return;
    
    const reorderedSections = event.detail;
    
    // Find the old and new positions
    const oldOrder = sections.map(s => s.id);
    const newOrder = reorderedSections.map(s => s.id);
    
    // Find what moved
    let fromIndex = -1;
    let toIndex = -1;
    
    for (let i = 0; i < oldOrder.length; i++) {
      if (oldOrder[i] !== newOrder[i]) {
        const movedId = newOrder[i];
        fromIndex = oldOrder.indexOf(movedId);
        toIndex = i;
        break;
      }
    }
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return; // No actual change
    }

    isReordering = true;
    
    try {
      // Optimistically update UI
      sections = reorderedSections;
      
      // Update sequences in database
      const updatedSections = await SectionService.reorderSections(
        noteContainerId, 
        fromIndex, 
        toIndex
      );
      
      // Update with server response
      sections = updatedSections;
      dispatch('sectionsReordered', updatedSections);
      
    } catch (error) {
      console.error('Failed to reorder sections:', error);
      // Revert on error - trigger reactive update
      sections = [...sections];
    } finally {
      isReordering = false;
    }
  }

  function handleItemClick(event: CustomEvent<{ item: NoteSection; index: number }>) {
    if (!isReordering) {
      dispatch('edit', event.detail.item.id);
    }
  }

  function handleDragStart(event: CustomEvent<{ item: NoteSection; index: number }>) {
    console.log('Drag started for section:', event.detail.item.id);
  }

  function handleDragEnd(event: CustomEvent<{ item: NoteSection; index: number }>) {
    console.log('Drag ended for section:', event.detail.item.id);
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

<SortableGrid 
  items={sections}
  gridClass="grid gap-6 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3"
  disabled={isReordering}
  dragThreshold={200}
  on:reorder={handleReorder}
  on:itemClick={handleItemClick}
  on:dragStart={handleDragStart}
  on:dragEnd={handleDragEnd}
>
  <svelte:fragment slot="default" let:item let:index let:isDragging>
    <NoteItem 
      section={item}
      {isDragging}
      on:delete={handleDelete}
      on:checkboxChange={handleCheckboxChange}
      on:titleSave={handleTitleSave}
    />
  </svelte:fragment>
</SortableGrid>