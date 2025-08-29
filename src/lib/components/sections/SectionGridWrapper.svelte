<!-- src/lib/components/sections/SectionGridWrapper.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SectionGrid from './SectionGrid.svelte';
  import type { NoteSection } from '$lib/types';

  export let sections: NoteSection[] = [];
  export let collectionName: string | undefined = undefined;
  export let hasSelectedContainer: boolean = false;
  export let noteContainerId: string = '';

  const dispatch = createEventDispatcher<{
    edit: string;
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
  }>();

  // Forward all events from SectionGrid
  function handleEdit(event: CustomEvent<string>) {
    dispatch('edit', event.detail);
  }

  function handleDelete(event: CustomEvent<string>) {
    dispatch('delete', event.detail);
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    dispatch('checkboxChange', event.detail);
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    console.log('🔧 handleTitleSave', event.detail);
    dispatch('titleSave', event.detail);
  }

  // Debug logging
  $: console.log('🔧 SectionGridWrapper rendered:', {
    hasSelectedContainer,
    sectionCount: sections?.length || 0,
    noteContainerId,
    collectionName
  });
</script>

{#if hasSelectedContainer && noteContainerId}
  <!-- Container is selected - show sections -->
  <SectionGrid 
    {sections}
    {noteContainerId}
    sortMode={true}
    on:edit={handleEdit}
    on:delete={handleDelete}
    on:checkboxChange={handleCheckboxChange}
    on:titleSave={handleTitleSave}
  />
{:else if !hasSelectedContainer}
  <!-- No container selected - show welcome message -->
  <div class="welcome-state">
    <div class="welcome-content">
      <div class="welcome-icon">
        <svg class="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      
      <h2 class="welcome-title">
        Welcome to {collectionName || 'Your Collection'}
      </h2>
      
      <p class="welcome-description">
        Select a note from the sidebar to view and edit its sections, or create a new note to get started.
      </p>
      
      <div class="welcome-shortcuts">
        <div class="shortcut-item">
          <kbd class="shortcut-key">Ctrl</kbd> + <kbd class="shortcut-key">M</kbd>
          <span class="shortcut-desc">New note</span>
        </div>
        <div class="shortcut-item">
          <kbd class="shortcut-key">Ctrl</kbd> + <kbd class="shortcut-key">Shift</kbd> + <kbd class="shortcut-key">M</kbd>
          <span class="shortcut-desc">New note with code</span>
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- Error state - container ID missing -->
  <div class="error-state">
    <div class="error-content">
      <svg class="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"/>
      </svg>
      <p class="text-red-600 font-medium">Container Error</p>
      <p class="text-red-500 text-sm">Selected container is missing required ID</p>
    </div>
  </div>
{/if}

<style>
  /* Welcome State */
  .welcome-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
  }

  .welcome-content {
    text-align: center;
    max-width: 500px;
  }

  .welcome-icon {
    margin-bottom: 1.5rem;
  }

  .welcome-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 1rem;
  }

  .welcome-description {
    font-size: 1.125rem;
    color: #6b7280;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .welcome-shortcuts {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .shortcut-key {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    min-width: 2rem;
    text-align: center;
  }

  .shortcut-desc {
    color: #4b5563;
  }

  /* Error State */
  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
  }

  .error-content {
    text-align: center;
    padding: 2rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .welcome-title {
      font-size: 1.5rem;
    }

    .welcome-description {
      font-size: 1rem;
    }

    .welcome-shortcuts {
      gap: 0.5rem;
    }

    .shortcut-item {
      flex-direction: column;
      text-align: center;
    }
  }
</style>