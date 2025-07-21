<!-- src/routes/app/collections/[collection_id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  // Composables
  import { useCollectionPageManager } from '$lib/composables/useCollectionPageManager';
  import { useNoteOperations } from '$lib/composables/useNoteOperations';
  
  // Stores
  import { noteStore } from '$lib/stores/noteStore';
  
  // Types
  import type { PageData } from './$types';
  import type { NoteSection } from '$lib/types';
  
  // Components
  import CollectionPageHeader from '$lib/components/layout/CollectionPageHeader.svelte';
  import NotesGrid from '$lib/components/notes/NotesGrid.svelte';
  import NoteManagementSidebar from '$lib/components/layout/NoteManagementSidebar.svelte';
  
  export let data: PageData;
  
  // Initialize composables
  const pageManager = useCollectionPageManager();
  const noteOperations = useNoteOperations();
  
  // Reactive values from stores
  $: ({ containers, selectedContainer, selectedContainerSections, loading } = $noteStore);
  $: currentCollectionId = $page.params.collection_id;
  $: currentCollection = pageManager.getCurrentCollection();
  
  // Handle route changes reactively
  $: if ($pageManager.isInitialized) {
    pageManager.handleRouteChange(currentCollectionId, $pageManager);
  }
  
  onMount(async () => {
    await pageManager.initialize(data);
  });
  
  // Note operations with bound context
  async function createNewNote() {
    await noteOperations.createNewNote(currentCollectionId, pageManager.selectContainer);
  }
  
  async function createNewNoteWithCode() {
    await noteOperations.createNewNoteWithCode(currentCollectionId, pageManager.selectContainer);
  }
  
  async function createSection(event: CustomEvent<'checklist' | 'code' | 'wysiwyg' | 'diagram'>) {
    await noteOperations.createSection(
      event.detail,
      selectedContainer,
      selectedContainerSections,
      currentCollectionId,
      pageManager.selectContainer
    );
  }
  
  function handleEdit(event: CustomEvent<string>) {
    noteOperations.handleEdit(event.detail, currentCollectionId);
  }
  
  async function deleteSection(event: CustomEvent<string>) {
    await noteOperations.deleteSection(event.detail, selectedContainer, pageManager.selectContainer);
  }
  
  async function deleteContainer(event: CustomEvent<string>) {
    await noteOperations.deleteContainer(event.detail, containers, pageManager.selectContainer);
  }
  
  async function handleCheckboxChange(event: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>) {
    await noteOperations.handleCheckboxChange(event, selectedContainerSections, selectedContainer);
  }
  
  // NEW: Handle section reordering from drag & drop
  async function handleSectionsReordered(event: CustomEvent<NoteSection[]>) {
    console.log('Sections reordered:', event.detail);
    
    // The reordering is already handled in SortableNoteGrid
    // We just need to update the local state if needed
    // The SectionService.reorderSections call in SortableNoteGrid already updates the database
  }
  
  // Create keyboard handler
  const handleKeydown = noteOperations.createKeyboardHandler(
    currentCollectionId,
    createNewNote,
    createNewNoteWithCode
  );
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Main Content Layout -->
<div class="flex h-screen bg-gray-50" style="height: calc(100vh - 4rem);">
  <!-- Sidebar -->
  <NoteManagementSidebar 
    {containers}
    {selectedContainer}
    on:selectContainer={(e) => pageManager.selectContainer(e.detail)}
    on:createNew={createNewNote}
    on:deleteContainer={deleteContainer}
  />

  <!-- Main Content Area -->
  <div class="flex-1 p-6 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else}
      <CollectionPageHeader 
        {selectedContainer}
        {loading}
        on:refresh={pageManager.refreshNotes}
      />
      
      <NotesGrid 
        sections={selectedContainerSections}
        collectionName={currentCollection?.name}
        hasSelectedContainer={!!selectedContainer}
        noteContainerId={selectedContainer?.id || ''}
        on:edit={handleEdit}
        on:delete={deleteSection}
        on:checkboxChange={handleCheckboxChange}
        on:createSection={createSection}
        on:createNote={createNewNote}
        on:sectionsReordered={handleSectionsReordered}
      />
    {/if}
  </div>
</div>