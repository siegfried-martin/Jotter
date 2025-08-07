<!-- src/lib/components/notes/SortableJSNoteGrid.svelte -->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import Sortable from 'sortablejs'; // Changed import syntax
  import NoteItem from './NoteItem.svelte';
  import type { NoteSection } from '$lib/types';
  import { SectionService } from '$lib/services/sectionService';

  export let sections: NoteSection[] = [];
  export let noteContainerId: string;
  export let sortMode: boolean = true; // Default to true for testing

  const dispatch = createEventDispatcher<{
    sectionsReordered: NoteSection[];
    edit: string;
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
  }>();

  let gridElement: HTMLElement;
  let sortableInstance: Sortable | null = null;
  let isReordering = false;
  let sectionComponents: { [key: string]: any } = {};

  // Track click vs drag
  let dragStartTime = 0;
  let isDragging = false;
  let isUpdatingFromDrag = false; // NEW: Flag to prevent reactive loops
  const CLICK_THRESHOLD = 200; // ms

  $: {
    // Only update if we're not in the middle of a drag operation
    if (!isUpdatingFromDrag && sortableInstance && sections) {
      console.log('🔄 Reactive update - sortMode:', sortMode, 'sections:', sections.length);
      updateSortableItems();
    }
  }

  onMount(() => {
    console.log('🔧 SortableJSNoteGrid: onMount called');
    console.log('📦 Sortable imported:', typeof Sortable);
    console.log('🎯 gridElement:', gridElement);
    console.log('📋 sections:', sections);
    initializeSortable();
  });

  onDestroy(() => {
    console.log('🔧 SortableJSNoteGrid: onDestroy called');
    if (sortableInstance) {
      sortableInstance.destroy();
    }
  });

  function initializeSortable() {
    if (!gridElement) {
      console.error('❌ No gridElement found for SortableJS');
      return;
    }

    console.log('🚀 Initializing SortableJS...');
    
    try {
      sortableInstance = new Sortable(gridElement, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        disabled: !sortMode,
        forceFallback: true, // Force HTML5 DnD fallback for debugging
        
        onStart: (evt) => {
          isDragging = true;
          dragStartTime = Date.now();
          console.log('🎯 SortableJS: Drag started', evt);
        },

        onEnd: async (evt) => {
          isDragging = false;
          const dragDuration = Date.now() - dragStartTime;
          console.log('🎯 SortableJS: Drag ended', { evt, dragDuration });
          
          // If it was a very short "drag", treat as click
          if (dragDuration < CLICK_THRESHOLD && evt.oldIndex === evt.newIndex) {
            const sectionId = evt.item.dataset.sectionId;
            console.log('👆 Treating as click for section:', sectionId);
            if (sectionId) {
              dispatch('edit', sectionId);
            }
            return;
          }

          // Handle actual reorder
          if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
            await handleReorder(evt.oldIndex, evt.newIndex);
          }
        },

        onMove: (evt) => {
          console.log('🔄 SortableJS: Move event', evt);
          return true; // Allow move
        },

        // Custom filter to prevent dragging on interactive elements
        filter: (evt) => {
          const target = evt.target as HTMLElement;
          const isInteractive = isInteractiveElement(target);
          console.log('🔍 SortableJS: Filter check', { target: target.tagName, isInteractive });
          return isInteractive;
        },

        onFilter: (evt) => {
          console.log('🚫 SortableJS: Filtered interactive element', evt);
        }
      });

      console.log('✅ SortableJS initialized successfully:', sortableInstance);
    } catch (error) {
      console.error('❌ Failed to initialize SortableJS:', error);
    }
  }

  function isInteractiveElement(element: HTMLElement): boolean {
    let current = element;
    while (current && current !== gridElement) {
      // Check for input elements
      if (current.tagName === 'INPUT' || current.tagName === 'BUTTON') {
        return true;
      }
      
      // Check for our specific interactive elements
      const title = current.getAttribute('title');
      if (title === 'Click to edit title' || 
          title === 'Copy content' || 
          title === 'Delete section') {
        return true;
      }
      
      // Check for interactive classes
      if (current.classList.contains('copy-button') ||
          current.classList.contains('opacity-0')) {
        return true;
      }
      
      current = current.parentElement as HTMLElement;
    }
    return false;
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    if (isReordering) return;
    isReordering = true;
    isUpdatingFromDrag = true; // Prevent reactive updates during drag handling

    try {
      console.log(`🔄 Reordering section from ${fromIndex} to ${toIndex}`);
      
      // Update database first (don't update local state yet)
      const updatedSections = await SectionService.reorderSections(
        noteContainerId, 
        fromIndex, 
        toIndex
      );
      
      // Now update sections with server response (this will trigger reactive update)
      sections = updatedSections;
      dispatch('sectionsReordered', updatedSections);
      
      console.log('✅ Section reorder completed');
    } catch (error) {
      console.error('❌ Failed to reorder sections:', error);
      // On error, force a refresh by reassigning sections
      sections = [...sections];
    } finally {
      isReordering = false;
      // Delay clearing the flag to ensure DOM has settled
      setTimeout(() => {
        isUpdatingFromDrag = false;
      }, 100);
    }
  }

  function updateSortableItems() {
    // Ensure SortableJS knows about current items
    if (sortableInstance && gridElement && !isUpdatingFromDrag) {
      console.log('🔧 Updating SortableJS options - sortMode:', sortMode, 'disabled:', !sortMode);
      sortableInstance.option('disabled', !sortMode);
    }
  }

  // Event handlers from child components
  function handleDelete(event: CustomEvent<string>) {
    if (!isReordering && !isDragging) {
      dispatch('delete', event.detail);
    }
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    if (!isReordering && !isDragging) {
      dispatch('checkboxChange', event.detail);
    }
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    if (!isReordering && !isDragging) {
      dispatch('titleSave', event.detail);
    }
  }
</script>

<div 
  bind:this={gridElement}
  class="sortable-grid grid gap-6 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3"
  class:sorting-disabled={!sortMode}
>
  {#each sections as section, index (section.id)}
    <div 
      class="sortable-item"
      data-section-id={section.id}
      data-index={index}
    >
      <NoteItem 
        {section}
        isDragging={isDragging}
        bind:this={sectionComponents[section.id]}
        on:delete={handleDelete}
        on:checkboxChange={handleCheckboxChange}
        on:titleSave={handleTitleSave}
      />
    </div>
  {/each}
</div>

<style>
  .sortable-grid {
    min-height: 100px; /* Ensure drop zone exists even when empty */
  }

  .sortable-item {
    transition: transform 0.2s ease;
  }

  /* SortableJS classes for drag feedback */
  :global(.sortable-ghost) {
    opacity: 0.4;
    background: #f3f4f6;
    border: 2px dashed #3b82f6;
  }

  :global(.sortable-chosen) {
    cursor: grabbing;
  }

  :global(.sortable-drag) {
    opacity: 0.8;
    transform: rotate(3deg);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }

  /* Disable sorting visual feedback when not in sort mode */
  .sorting-disabled :global(.sortable-item) {
    cursor: pointer;
  }

  .sorting-disabled:not(.sorting-disabled) :global(.sortable-item) {
    cursor: grab;
  }

  /* Grid responsive adjustments */
  @media (max-width: 1280px) {
    .sortable-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 1280px) and (max-width: 1536px) {
    .sortable-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>