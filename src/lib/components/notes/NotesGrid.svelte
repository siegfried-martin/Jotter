<!-- src/lib/components/notes/NotesGrid.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SortableNoteGrid from './SortableNoteGrid.svelte';
  import type { NoteSection } from '$lib/types';

  export let sections: NoteSection[] = [];
  export let collectionName: string = '';
  export let hasSelectedContainer: boolean = false;
  export let noteContainerId: string = '';

  const dispatch = createEventDispatcher<{
    edit: string;
    delete: string;
    checkboxChange: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>;
    createNote: void;
    sectionsReordered: NoteSection[];
  }>();

  function handleEdit(event: CustomEvent<string>) {
    dispatch('edit', event.detail);
  }

  function handleDelete(event: CustomEvent<string>) {
    dispatch('delete', event.detail);
  }

  function handleCheckboxChange(event: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>) {
    dispatch('checkboxChange', event);
  }

  function handleCreateNote() {
    dispatch('createNote');
  }

  function handleSectionsReordered(event: CustomEvent<NoteSection[]>) {
    dispatch('sectionsReordered', event.detail);
  }
</script>

{#if hasSelectedContainer}
  <!-- Sortable Note Sections Grid -->
  <div class="mb-6">
    {#if sections.length > 0}
      <SortableNoteGrid 
        {sections}
        {noteContainerId}
        on:sectionsReordered={handleSectionsReordered}
        on:edit={handleEdit}
        on:delete={handleDelete}
        on:checkboxChange={handleCheckboxChange}
      />
    {:else}
      <div class="text-center text-gray-500 py-12">
        This note is empty. Use the floating panel below to add your first section!
      </div>
    {/if}
  </div>
{:else}
  <!-- Empty State -->
  <div class="text-center text-gray-500 py-12">
    <h1 class="text-2xl font-bold mb-4">Welcome to {collectionName || 'this collection'}</h1>
    <p>Create your first note in this collection!</p>
    <button 
      on:click={handleCreateNote}
      class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Create Note
    </button>
  </div>
{/if}