<!-- src/lib/components/sections/shared/SectionCardHeader.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SectionEditableTitle from './SectionEditableTitle.svelte';
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let isDragging: boolean = false;
  export let showCopyAction: boolean = false;
  export let onCopy: () => void = () => {};
  export let onDelete: () => void = () => {};

  const dispatch = createEventDispatcher<{
    titleSave: string;
  }>();

  function handleTitleSave(event: CustomEvent<string | null>) {
    dispatch('titleSave', event.detail);
  }

  function handleCopyClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    onCopy();
  }

  function handleDeleteClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    onDelete();
  }
</script>

<div class="flex items-center justify-between mb-3">
  <!-- Section Title (Editable) -->
  <div class="flex-1 min-w-0">
    {#if isDragging}
      <!-- Show static title during drag to prevent edit conflicts -->
      <span class="text-sm font-medium text-gray-700 truncate">
        {section.title || (section.type.charAt(0).toUpperCase() + section.type.slice(1))}
      </span>
    {:else}
      <SectionEditableTitle 
        {section}
        on:save={handleTitleSave}
      />
    {/if}
  </div>

  <!-- Action Buttons -->
  <div class="flex items-center space-x-1 ml-2">
    {#if showCopyAction && !isDragging}
      <button
        on:click={handleCopyClick}
        class="copy-button opacity-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all duration-200"
        title="Copy content"
        tabindex="-1"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    {/if}
    
    {#if !isDragging}
      <button
        on:click={handleDeleteClick}
        class="opacity-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
        title="Delete section"
        tabindex="-1"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    {/if}
  </div>
</div>