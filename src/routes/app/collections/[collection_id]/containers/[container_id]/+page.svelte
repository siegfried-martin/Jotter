<!-- src/routes/app/collections/[collection_id]/containers/[container_id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  
  // Composables
  import { useCollectionPageManager } from '$lib/composables/useCollectionPageManager';
  import { useNoteOperations } from '$lib/composables/useNoteOperations';
  
  // Stores
  import { noteStore, noteActions } from '$lib/stores/noteStore';
  
  // Types
  import type { PageData } from '../../$types';
  import type { NoteSection, NoteContainer } from '$lib/types';
  
  // NEW: DnD System
  import DragProvider from '$lib/dnd/components/DragProvider.svelte';
  import { createSectionDragBehavior } from '$lib/dnd/behaviors/SectionDragBehavior';
  import { createContainerDragBehavior } from '$lib/dnd/behaviors/ContainerDragBehavior';
  
  // Components
  import CollectionPageHeader from '$lib/components/layout/CollectionPageHeader.svelte';
  import SectionGridWrapper from '$lib/components/sections/SectionGridWrapper.svelte';
  import ContainerSidebar from '$lib/components/containers/ContainerSidebar.svelte';
  import CreateNoteSectionForm from '$lib/components/sections/CreateNoteSectionForm.svelte';
  
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

  // Helper function for array reordering
  function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const newArray = [...array];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray;
  }

  // NEW: Create drag behaviors
  $: sectionBehavior = createSectionDragBehavior(
    // Section reorder handler
    async (fromIndex: number, toIndex: number, containerId: string) => {
      console.log('🎯 Section reorder:', fromIndex, '→', toIndex, 'in', containerId);
      
      if (!selectedContainerSections || fromIndex === toIndex) return;
      
      // Store original order for potential rollback
      const originalSections = [...selectedContainerSections];
      
      // Optimistically update UI
      const reorderedSections = reorderArray(selectedContainerSections, fromIndex, toIndex);
      noteActions.setSelectedSections(reorderedSections);
      
      try {
        // Use the existing SectionService method (similar to how old SectionGrid worked)
        const { SectionService } = await import('$lib/services/sectionService');
        const updatedSections = await SectionService.reorderSections(
          containerId, 
          fromIndex, 
          toIndex
        );
        
        // Update with server response
        noteActions.setSelectedSections(updatedSections);
        console.log('✅ Section reorder completed');
      } catch (error) {
        console.error('❌ Section reorder failed:', error);
        // Rollback on error
        noteActions.setSelectedSections(originalSections);
      }
    },
    
    // Cross-container move handler  
    async (sectionId: string, fromContainer: string, toContainer: string) => {
      console.log('🎯 Section cross-container move:', sectionId, fromContainer, '→', toContainer);
      
      // Use existing cross-container logic
      await handleCrossContainerMove({ 
        detail: { sectionId, fromContainer, toContainer } 
      } as CustomEvent);
    }
  );

  $: containerBehavior = createContainerDragBehavior(
    // Container reorder handler
    async (fromIndex: number, toIndex: number) => {
      console.log('🎯 Container reorder:', fromIndex, '→', toIndex);
      
      if (fromIndex === toIndex) return;
      
      // Store original order for potential rollback
      const originalContainers = [...containers];
      
      // 1. Optimistically update UI first (prevents flicker)
      const reorderedContainers = reorderArray(containers, fromIndex, toIndex);
      noteActions.updateContainers(reorderedContainers);
      
      try {
        console.log('🚀 Calling NoteService.reorderNoteContainers...');
        
        // 2. Call API service
        const { NoteService } = await import('$lib/services/noteService');
        const updatedContainers = await NoteService.reorderNoteContainers(
          currentCollectionId,
          fromIndex,
          toIndex
        );
        
        console.log('✅ API call successful, server order:', updatedContainers.map(c => c.title));
        
        // 3. Update with server response ONLY if it differs from our optimistic update
        const currentOrder = reorderedContainers.map(c => c.title).join(',');
        const serverOrder = updatedContainers.map(c => c.title).join(',');
        
        if (currentOrder !== serverOrder) {
          console.log('⚠️ Server order differs from optimistic update, using server order');
          noteActions.updateContainers(updatedContainers);
        } else {
          console.log('✅ Optimistic update matches server, no additional update needed');
        }
        
        // 4. Skip calling handleContainersReordered to avoid conflicting updates
        // The optimistic update + server response is sufficient
        
        console.log('✅ Container reorder completed successfully');
        
      } catch (error) {
        console.error('❌ Container reorder failed:', error);
        
        // ROLLBACK optimistic update on error
        console.log('🔄 Rolling back optimistic reorder due to error');
        noteActions.updateContainers(originalContainers);
        
        // Optionally show user-friendly error message
        // You could dispatch an error event here if you have error handling UI
      }
    }
  );
  
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
    noteOperations.handleEdit(event.detail, currentCollectionId, selectedContainer?.id || '');
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
  
  // Handle section title updates
  async function handleSectionTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    await noteOperations.handleSectionTitleSave(event, selectedContainerSections, pageManager.selectContainer, selectedContainer);
  }
  
  // Handle note container title updates
  async function handleTitleUpdate(event: CustomEvent<{ containerId: string; newTitle: string }>) {
    if (!selectedContainer) {
      console.warn('No selected container to update title');
      return;
    }
    
    try {
      const { containerId, newTitle } = event.detail;
      
      if (!newTitle?.trim() || newTitle.trim() === selectedContainer.title) {
        return; // No change needed
      }
      
      const trimmedTitle = newTitle.trim();
      
      console.log('🏷️ Updating container title:', containerId, 'to:', trimmedTitle);
      
      await noteOperations.updateNoteTitle(containerId, trimmedTitle);
      
      console.log('✅ Container title updated successfully');
    } catch (error) {
      console.error('❌ Failed to update container title:', error);
    }
  }

  async function handleContainersReordered(event: CustomEvent<{ fromIndex: number; toIndex: number }>) {
    console.log('✅ Note containers reordered successfully:', event.detail);
    
    const { fromIndex, toIndex } = event.detail;
    
    // Create the reordered array locally
    const reorderedContainers = [...containers];
    const [movedContainer] = reorderedContainers.splice(fromIndex, 1);
    reorderedContainers.splice(toIndex, 0, movedContainer);
    
    console.log('📦 New containers order:', reorderedContainers.map(c => c.title));
    
    // Update the note store with the new container order
    noteActions.updateContainers(reorderedContainers);
    
    console.log('📦 Store updated, current containers:', containers.map(c => c.title));
    
    // If the selected container is still in the list, make sure it stays selected
    if (selectedContainer) {
      const stillExists = reorderedContainers.find(c => c.id === selectedContainer.id);
      if (!stillExists) {
        // If somehow the selected container was removed, select the first one
        if (reorderedContainers.length > 0) {
          pageManager.selectContainer(reorderedContainers[0]);
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

  $: console.log('🔧 +page.svelte debug:', {
    hasSelectedContainer: !!selectedContainer,
    selectedContainerSections: selectedContainerSections?.length || 0,
    sections: selectedContainerSections
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- NEW: Wrap everything in DragProvider -->
<DragProvider behaviors={[sectionBehavior, containerBehavior]}>

  <!-- Main Content Layout -->
  <div class="flex h-screen bg-gray-50 relative" style="height: calc(100vh - 4rem);">
    <!-- Improved Sidebar with Auto-Expand -->
    <ContainerSidebar 
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
        
        <SectionGridWrapper 
          sections={selectedContainerSections}
          collectionName={currentCollection?.name}
          hasSelectedContainer={!!selectedContainer}
          noteContainerId={selectedContainer?.id || ''}
          on:edit={handleEdit}
          on:delete={deleteSection}
          on:checkboxChange={handleCheckboxChange}
          on:titleSave={handleSectionTitleSave}
        />
      {/if}
    </div>

    <!-- Floating Add Section Area -->
    {#if !loading && selectedContainer}
      <div class="floating-add-section">
        <div class="floating-add-section-content">
          <CreateNoteSectionForm on:createSection={createSection} />
        </div>
      </div>
    {/if}
  </div>

</DragProvider>

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