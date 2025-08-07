<!-- src/lib/components/notes/content/ChecklistContent.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parseChecklistItems } from '../utils/checklistUtils';
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let isDragging: boolean = false;

  const dispatch = createEventDispatcher<{
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
  }>();

  $: checklistItems = section ? parseChecklistItems(section) : [];

  function handleCheckboxChange(event: Event, lineIndex: number) {
    // Stop propagation to prevent card click, but allow default checkbox behavior
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    if (isDragging) return;
    
    const target = event.target as HTMLInputElement;
    
    // Dispatch the checkbox change event
    dispatch('checkboxChange', {
      sectionId: section.id,
      checked: target.checked,
      lineIndex
    });
  }

  function handleCheckboxClick(event: Event) {
    // Stop propagation to prevent card navigation
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
</script>

<div class="space-y-2">
  {#each checklistItems as item, index}
    <div class="flex items-center space-x-3">
      <input 
        type="checkbox" 
        class="w-4 h-4 text-blue-600 rounded cursor-pointer flex-shrink-0" 
        class:pointer-events-none={isDragging}
        checked={item.checked}
        disabled={isDragging}
        on:change={(e) => handleCheckboxChange(e, index)}
        on:click={handleCheckboxClick}
      >
      <span class="text-sm flex-1 break-words" class:select-none={isDragging}>
        {item.text}
      </span>
      {#if item.displayDate}
        <span class="text-xs flex-shrink-0 {item.isOverdue ? 'text-red-500' : 'text-gray-400'}">
          {item.displayDate}
        </span>
      {/if}
    </div>
  {/each}
</div>