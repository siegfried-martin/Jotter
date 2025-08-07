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
  
  // NEW: Handle section title updates
  async function handleSectionTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    await noteOperations.handleSectionTitleSave(event, selectedContainerSections, pageManager.selectContainer, selectedContainer);
  }
  
  // Handle section reordering from drag & drop
  async function handleSectionsReordered(event: CustomEvent<NoteSection[]>) {
    console.log('Sections reordered:', event.detail);
    
    // The reordering is already handled in SortableNoteGrid
    // We just need to update the local state if needed
    // The SectionService.reorderSections call in SortableNoteGrid already updates the database
  }

  async function handleContainersReordered(event: CustomEvent<NoteContainer[]>) {
    console.log('✅ Note containers reordered successfully, updating store');
    console.log('📦 New containers order:', event.detail.map(c => c.title));
    
    // Update the note store with the new container order
    noteActions.updateContainers(event.detail);
    
    console.log('📦 Store updated, current containers:', containers.map(c => c.title));
    
    // If the selected container is still in the list, make sure it stays selected
    const updatedContainers = event.detail;
    if (selectedContainer) {
      const stillExists = updatedContainers.find(c => c.id === selectedContainer.id);
      if (!stillExists) {
        // If somehow the selected container was removed, select the first one
        if (updatedContainers.length > 0) {
          pageManager.selectContainer(updatedContainers[0]);
        }
      }
    }
  }
  
  // Handle cross-container section moves
  async function handleCrossContainerMove(event: CustomEvent<{ sectionId: string; fromContainer: string; toContainer: string }>) {
    await noteOperations.handleCrossContainerMove(event, pageManager.selectContainer, containers);
  }
  
  // Handle cross-container drops from sidebar
  async function handleCrossContainerDrop(event: CustomEvent<{ sectionId: string; fromContainer: string; toContainer: string }>) {
    await noteOperations.handleCrossContainerMove(event, pageManager.selectContainer, containers);
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
<div class="flex h-screen bg-gray-50 relative" style="height: calc(100vh - 4rem);">
  <!-- Sidebar with Drag & Drop Support -->
  <NoteManagementSidebar 
    {containers}
    {selectedContainer}
    collectionId={currentCollectionId}
    on:selectContainer={(e) => pageManager.selectContainer(e.detail)}
    on:createNew={createNewNote}
    on:deleteContainer={deleteContainer}
    on:containersReordered={handleContainersReordered}
    on:crossContainerDrop={handleCrossContainerDrop}
  />

  <!-- Main Content Area -->
  <div class="flex-1 p-6 overflow-y-auto" style="padding-bottom: 80px;">
    {#if loading}
      <div class="flex items-center justify-center h-64">
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
        on:titleSave={handleSectionTitleSave}
        on:crossContainerMove={handleCrossContainerMove}
      />
    {/if}
  </div>

  <!-- Floating Add Section Area -->
  {#if !loading && selectedContainer}
    <div class="floating-add-section">
      <div class="floating-add-section-content">
        <CreateNoteItem on:createSection={createSection} />
      </div>
    </div>
  {/if}
</div>

<style>
  .floating-add-section {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 280px; /* Account for sidebar width */
    z-index: 50;
    pointer-events: none; /* Allow clicking through the container */
  }

  .floating-add-section-content {
    background: linear-gradient(to top, rgba(249, 250, 251, 0.95) 60%, transparent);
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(229, 231, 235, 0.8);
    padding: 12px 16px;
    margin: 0 16px 16px 16px;
    border-radius: 8px 8px 0 0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
    pointer-events: auto; /* Re-enable clicks for the content */
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .floating-add-section {
      left: 0; /* Full width on smaller screens */
    }
  }
</style>