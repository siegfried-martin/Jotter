<!-- src/lib/components/notes/NotesGrid.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CustomNoteGrid from './CustomNoteGrid.svelte';
  // import SortableJSNoteGrid from './SortableJSNoteGrid.svelte'; // Keep as fallback
  // import DndKitNoteGrid from './DndKitNoteGrid.svelte'; // Failed due to React dependency
  import type { NoteSection } from '$lib/types';

  export let sections: NoteSection[] = [];
  export let collectionName: string = '';
  export let hasSelectedContainer: boolean = false;
  export let noteContainerId: string = '';
  export let sortMode: boolean = true; // Enable sorting by default

  // Toggle between implementations for testing
  export let useCustomDrag: boolean = true; // Set to false to use SortableJS fallback

  const dispatch = createEventDispatcher<{
    edit: string;
    delete: string;
    checkboxChange: {sectionId: string; checked: boolean; lineIndex: number};
    createNote: void;
    sectionsReordered: NoteSection[];
    titleSave: { sectionId: string; title: string | null };
    crossContainerMove: {
      sectionId: string;
      fromContainer: string;
      toContainer: string;
    };
  }>();

  function handleEdit(event: CustomEvent<string>) {
    dispatch('edit', event.detail);
  }

  function handleDelete(event: CustomEvent<string>) {
    dispatch('delete', event.detail);
  }

  function handleCheckboxChange(event: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>) {
    dispatch('checkboxChange', event.detail);
  }

  function handleCreateNote() {
    dispatch('createNote');
  }

  function handleSectionsReordered(event: CustomEvent<NoteSection[]>) {
    dispatch('sectionsReordered', event.detail);
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    dispatch('titleSave', event.detail);
  }

  function handleCrossContainerMove(event: CustomEvent<{
    sectionId: string;
    fromContainer: string;
    toContainer: string;
  }>) {
    dispatch('crossContainerMove', event.detail);
  }
</script>

{#if hasSelectedContainer}
  <!-- DnD Note Sections Grid -->
  <div class="mb-6">
    {#if sections.length > 0}
      {#if useCustomDrag}
        <CustomNoteGrid 
          {sections}
          {noteContainerId}
          {sortMode}
          on:sectionsReordered={handleSectionsReordered}
          on:edit={handleEdit}
          on:delete={handleDelete}
          on:checkboxChange={handleCheckboxChange}
          on:titleSave={handleTitleSave}
          on:crossContainerMove={handleCrossContainerMove}
        />
      {:else}
        <!-- Fallback to SortableJS implementation -->
        <!-- Uncomment when needed:
        <SortableJSNoteGrid 
          {sections}
          {noteContainerId}
          {sortMode}
          on:sectionsReordered={handleSectionsReordered}
          on:edit={handleEdit}
          on:delete={handleDelete}
          on:checkboxChange={handleCheckboxChange}
          on:titleSave={handleTitleSave}
        />
        -->
        <div class="text-center text-gray-500 py-12">
          <p>SortableJS fallback disabled. Set useCustomDrag to true.</p>
        </div>
      {/if}
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