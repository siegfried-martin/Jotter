<!-- src/lib/components/layout/NotesGrid.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import NoteItem from '$lib/components/NoteItem.svelte';
  import CreateNoteItem from '$lib/components/CreateNoteItem.svelte';

  export let sections: any[] = [];
  export let collectionName: string = '';
  export let hasSelectedContainer: boolean = false;

  const dispatch = createEventDispatcher<{
    edit: string;
    delete: string;
    checkboxChange: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>;
    createSection: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
    createNote: void;
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

  function handleCreateSection(event: CustomEvent<'checklist' | 'code' | 'wysiwyg' | 'diagram'>) {
    dispatch('createSection', event.detail);
  }

  function handleCreateNote() {
    dispatch('createNote');
  }
</script>

{#if hasSelectedContainer}
  <!-- Note Items Grid -->
  <div class="grid gap-6 mb-6" style="grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));">
    {#each sections as section (section.id)}
      <NoteItem 
        {section}
        on:edit={handleEdit}
        on:delete={handleDelete}
        on:checkboxChange={handleCheckboxChange}
      />
    {/each}
    
    {#if sections.length === 0}
      <div class="col-span-full text-center text-gray-500 py-12">
        This note is empty. Add a section below to get started!
      </div>
    {/if}
  </div>

  <!-- Add Section Controls -->
  <CreateNoteItem on:createSection={handleCreateSection} />
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