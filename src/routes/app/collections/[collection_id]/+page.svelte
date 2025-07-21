<!-- src/routes/app/collections/[collection_id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  // Composables
  import { useCollectionPageManager } from '$lib/composables/useCollectionPageManager';
  import { useNoteOperations } from '$lib/composables/useNoteOperations';
  
  // Stores
  import { noteStore, noteActions } from '$lib/stores/noteStore';
  
  // Types
  import type { PageData } from './$types';
  import type { NoteSection, NoteContainer } from '$lib/types';
  
  // Components
  import CollectionPageHeader from '$lib/components/layout/CollectionPageHeader.svelte';
  import NotesGrid from '$lib/components/notes/NotesGrid.svelte';
  import NoteManagementSidebar from '$lib/components/layout/NoteManagementSidebar.svelte';
  import CreateNoteItem from '$lib/components/notes/CreateNoteItem.svelte';
  
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
  
  // Handle section reordering from drag & drop
  async function handleSectionsReordered(event: CustomEvent<NoteSection[]>) {
    console.log('Sections reordered:', event.detail);
    
    // The reordering is already handled in SortableNoteGrid
    // We just need to update the local state if needed
    // The SectionService.reorderSections call in SortableNoteGrid already updates the database
  }
  
  // NEW: Handle note container title updates
  async function handleTitleUpdate(event: CustomEvent<{ containerId: string; newTitle: string }>) {
    const { containerId, newTitle } = event.detail;
    console.log('🏷️ Updating note title:', { containerId, newTitle });
    
    try {
      await noteOperations.updateNoteTitle(containerId, newTitle);
    } catch (error) {
      console.error('❌ Failed to update title:', error);
      // You could show a toast notification here
    }
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
<div class="app-layout">
  <!-- Sidebar with Drag & Drop Support -->
  <NoteManagementSidebar 
    {containers}
    {selectedContainer}
    collectionId={currentCollectionId}
    on:selectContainer={(e) => pageManager.selectContainer(e.detail)}
    on:createNew={createNewNote}
    on:deleteContainer={deleteContainer}
    on:containersReordered={handleContainersReordered}
  />

  <!-- Main Content Area -->
  <div class="main-content">
    {#if loading}
      <div class="loading-container">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else}
      <CollectionPageHeader 
        {selectedContainer}
        {loading}
        on:refresh={pageManager.refreshNotes}
        on:updateTitle={handleTitleUpdate}
      />
      
      <NotesGrid 
        sections={selectedContainerSections}
        collectionName={currentCollection?.name}
        hasSelectedContainer={!!selectedContainer}
        noteContainerId={selectedContainer?.id || ''}
        on:edit={handleEdit}
        on:delete={deleteSection}
        on:checkboxChange={handleCheckboxChange}
        on:sectionsReordered={handleSectionsReordered}
      />
    {/if}
  </div>

  <!-- Streamlined Add Section Bar -->
  {#if !loading && selectedContainer}
    <div class="add-section-bar">
      <CreateNoteItem on:createSection={createSection} />
    </div>
  {/if}
</div>

<style>
  .app-layout {
    display: flex;
    height: calc(100vh - 4rem);
    background-color: #f9fafb;
    position: relative;
    overflow: hidden; /* Prevent double scrollbars */
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    padding-bottom: 4rem; /* Space for add bar */
    box-sizing: border-box;
  }

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16rem;
  }

  .add-section-bar {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 280px; /* Account for sidebar width */
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(229, 231, 235, 0.6);
    z-index: 40;
    transition: all 0.2s ease;
  }

  .add-section-bar::before {
    content: '';
    position: absolute;
    top: -8px;
    left: 0;
    right: 0;
    height: 8px;
    background: linear-gradient(to top, rgba(249, 250, 251, 0.8), transparent);
    pointer-events: none;
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .add-section-bar {
      left: 0; /* Full width on smaller screens */
    }
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 1rem;
      padding-bottom: 3.5rem;
    }
  }
</style>