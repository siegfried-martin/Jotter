<!-- src/lib/components/notes/SortableNoteList.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SortableList from '../ui/SortableList.svelte';
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
  }>();

  // Fix: Declare missing variables
  let isReordering = false;
  let dragStartedFromHandle = false;
  let currentDragElement: HTMLElement | null = null;

  async function handleReorder(event: CustomEvent<NoteSection[]>) {
    if (isReordering || !dragStartedFromHandle) return;
    
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
      dragStartedFromHandle = false;
    }
  }

  // Better drag start detection
  function handleDragStart(event: DragEvent) {
    const target = event.target as HTMLElement;
    const dragHandle = target.closest('[data-drag-handle]') as HTMLElement;
    
    if (dragHandle) {
      dragStartedFromHandle = true;
      currentDragElement = target.closest('[data-sortable-item]') as HTMLElement;
      
      // Visual feedback for dragging
      if (currentDragElement) {
        currentDragElement.style.opacity = '0.5';
        currentDragElement.classList.add('dragging');
      }
    } else {
      // Prevent drag if not started from handle
      event.preventDefault();
      event.stopPropagation();
      dragStartedFromHandle = false;
    }
  }

  function handleDragEnd(event: DragEvent) {
    if (currentDragElement) {
      currentDragElement.style.opacity = '';
      currentDragElement.classList.remove('dragging');
      currentDragElement = null;
    }
    dragStartedFromHandle = false;
  }

  // Prevent conflicts with click events
  function handleDragHandleClick(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
  }

  function handleEdit(event: CustomEvent<string>) {
    if (!dragStartedFromHandle && !isReordering) {
      dispatch('edit', event.detail);
    }
  }

  function handleDelete(event: CustomEvent<string>) {
    if (!dragStartedFromHandle && !isReordering) {
      dispatch('delete', event.detail);
    }
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    if (!dragStartedFromHandle && !isReordering) {
      dispatch('checkboxChange', event.detail);
    }
  }
</script>

<SortableList 
  items={sections}
  direction="vertical"
  spacing="space-y-6"
  containerClass="grid gap-6"
  disabled={isReordering}
  on:reorder={handleReorder}
>
  <svelte:fragment slot="default" let:item let:index>
    <div 
      class="relative group" 
      data-sortable-item
      on:dragstart={handleDragStart}
      on:dragend={handleDragEnd}
    >
      <!-- Drag Handle - positioned absolutely -->
      <div 
        class="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded p-1 shadow-sm border border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
        title="Drag to reorder section"
        data-drag-handle
        on:click={handleDragHandleClick}
        on:mousedown={handleDragHandleClick}
      >
        <svg class="w-4 h-4 text-gray-400 hover:text-gray-600 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path>
        </svg>
      </div>
      
      <!-- Note Item - with drag protection -->
      <div class="section-content" style="pointer-events: {isReordering ? 'none' : 'auto'};">
        <NoteItem 
          section={item}
          on:edit={handleEdit}
          on:delete={handleDelete}
          on:checkboxChange={handleCheckboxChange}
        />
      </div>
    </div>
  </svelte:fragment>
</SortableList>

<style>
  /* Ensure drag handle is always on top */
  [data-drag-handle] {
    z-index: 50;
  }
  
  /* Better visual feedback during drag */
  .group:hover [data-drag-handle] {
    opacity: 1;
  }
  
  /* Disable text selection during drag */
  [data-sortable-item].dragging * {
    user-select: none;
    pointer-events: none;
  }
</style>