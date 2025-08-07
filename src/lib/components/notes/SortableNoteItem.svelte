<!-- src/lib/components/notes/SortableNoteItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { useSortable } from '@dnd-kit/sortable';
  import { CSS } from '@dnd-kit/utilities';
  import NoteItem from './NoteItem.svelte';
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    edit: void;
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
  }>();

  let nodeRef: HTMLElement;

  // Initialize sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: section.id,
    disabled
  });

  // Set the node reference when the element is bound
  $: if (nodeRef) {
    setNodeRef(nodeRef);
  }

  // Create transform style for smooth dragging
  $: style = CSS.Transform.toString(transform);
  $: transformStyle = `${style}; transition: ${transition || 'none'};`;

  // Handle click events - only dispatch edit if not dragging and not on interactive elements
  function handleClick(event: MouseEvent) {
    // Check if the click was on an interactive element
    const target = event.target as HTMLElement;
    if (isInteractiveElement(target)) {
      return; // Let the interactive element handle the click
    }

    // Only trigger edit if we're not in the middle of a drag
    if (!isDragging) {
      console.log('👆 SortableNoteItem clicked for edit');
      dispatch('edit');
    }
  }

  function isInteractiveElement(element: HTMLElement): boolean {
    let current = element;
    while (current && current !== document.body) {
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

  // Forward events from NoteItem
  function handleDelete(event: CustomEvent<string>) {
    dispatch('delete', event.detail);
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    dispatch('checkboxChange', event.detail);
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    dispatch('titleSave', event.detail);
  }
</script>

<div
  bind:this={nodeRef}
  style={transformStyle}
  class="sortable-note-item"
  class:dragging={isDragging}
  class:disabled
  on:click={handleClick}
  {...attributes}
  {...listeners}
>
  <NoteItem 
    {section}
    isDragging={isDragging}
    on:delete={handleDelete}
    on:checkboxChange={handleCheckboxChange}
    on:titleSave={handleTitleSave}
  />
</div>

<style>
  .sortable-note-item {
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .sortable-note-item.dragging {
    /* Hide the original during drag (overlay shows instead) */
    opacity: 0.5;
  }

  .sortable-note-item.disabled {
    cursor: default;
  }

  .sortable-note-item:not(.disabled):not(.dragging):hover {
    transform: translateY(-2px);
  }
</style>