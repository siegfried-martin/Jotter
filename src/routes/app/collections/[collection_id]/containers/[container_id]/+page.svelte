<!-- src/routes/app/collections/[collection_id]/containers/[container_id]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  
  // Composables
  import { useNoteOperations } from '$lib/composables/useNoteOperations';
  
  // Stores
  import { noteStore, noteActions } from '$lib/stores/noteStore';
  
  // Types
  import type { PageData } from './$types';
  import type { NoteSection } from '$lib/types';
  
  // NEW: DnD System for sections
  import DragProvider from '$lib/dnd/components/DragProvider.svelte';
  import { createSectionDragBehavior } from '$lib/dnd/behaviors/SectionDragBehavior';
  
  // Components
  import CollectionPageHeader from '$lib/components/layout/CollectionPageHeader.svelte';
  import SectionGridWrapper from '$lib/components/sections/SectionGridWrapper.svelte';
  import CreateNoteSectionForm from '$lib/components/sections/CreateNoteSectionForm.svelte';
  
  export let data: PageData;
  
  // Initialize composables
  const noteOperations = useNoteOperations();
  
  // Reactive values from stores and page data
  $: ({ selectedContainer, selectedContainerSections, loading } = $noteStore);
  $: currentCollectionId = $page.params.collection_id;
  $: currentContainerId = $page.params.container_id;
  
  // FIXED: Force sync page data with store immediately and properly
  $: {
    if (data.container) {
      console.log('🔄 Syncing container to store:', data.container.title, data.container.id);
      noteActions.setSelectedContainer(data.container);
    }
  }
  
  $: {
    if (data.sections && data.container) {
      console.log('🔄 Syncing sections to store:', data.sections.length, 'sections for container', data.container.id);
      noteActions.setSelectedSections(data.sections);
    }
  }

  // Additional reactive check to ensure data consistency
  $: {
    if (selectedContainer && data.container && selectedContainer.id !== data.container.id) {
      console.log('⚠️ Container mismatch detected, forcing sync:', {
        storeContainer: selectedContainer.id,
        dataContainer: data.container.id
      });
      noteActions.setSelectedContainer(data.container);
      noteActions.setSelectedSections(data.sections || []);
    }
  }

  // Helper function for array reordering
  function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const newArray = [...array];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray;
  }

  // Section drag behavior
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
        // Use the existing SectionService method
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
  
  function createSection(event: CustomEvent<'checklist' | 'code' | 'wysiwyg' | 'diagram'>) {
    noteOperations.createSection(
      event.detail,
      selectedContainer,
      selectedContainerSections,
      currentCollectionId
    );
  }
  
  function handleEdit(event: CustomEvent<string>) {
    noteOperations.handleEdit(event.detail, currentCollectionId, currentContainerId);
  }
  
  async function deleteSection(event: CustomEvent<string>) {
    await noteOperations.deleteSection(event.detail, selectedContainer);
  }
  
  async function handleCheckboxChange(event: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>) {
    await noteOperations.handleCheckboxChange(event, selectedContainerSections, selectedContainer);
  }
  
  // Handle section title updates
  async function handleSectionTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    await noteOperations.handleSectionTitleSave(event, selectedContainerSections, selectedContainer);
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
  
  // Handle cross-container section moves
  async function handleCrossContainerMove(event: CustomEvent<{ sectionId: string; fromContainer: string; toContainer: string }>) {
    await noteOperations.handleCrossContainerMove(event, undefined); // No navigation needed - layout handles it
  }
  
  // Create keyboard handler
  const handleKeydown = noteOperations.createKeyboardHandler(
    currentCollectionId,
    () => {}, // Note creation handled by layout
    () => {}  // Note creation handled by layout
  );

  onMount(() => {
    console.log('📄 Container page mounted:', {
      containerId: currentContainerId,
      containerTitle: data.container?.title,
      sectionCount: data.sections?.length || 0,
      dataContainer: data.container?.id,
      storeContainer: selectedContainer?.id
    });
    
    // FORCE initial sync on mount to ensure data consistency
    if (data.container) {
      console.log('🔄 Force syncing on mount...');
      noteActions.setSelectedContainer(data.container);
      noteActions.setSelectedSections(data.sections || []);
    }
  });

  onDestroy(() => {
    console.log('🧹 Container page destroyed');
  });

  $: console.log('🔧 Container page debug:', {
    hasSelectedContainer: !!selectedContainer,
    selectedContainerSections: selectedContainerSections?.length || 0,
    dataContainer: data.container?.id,
    storeContainer: selectedContainer?.id,
    containerFromData: data.container?.title,
    dataSections: data.sections?.length || 0
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Section DnD Provider -->
<DragProvider behaviors={[sectionBehavior]}>

  <!-- Main Content Area (No Sidebar) -->
  <div class="flex-1 p-6 overflow-y-auto" style="padding-bottom: 80px;">
    {#if loading}
      <div class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else if !selectedContainer && !data.container}
      <div class="flex items-center justify-center h-64">
        <div class="text-center text-gray-500">
          <p>Container not found</p>
        </div>
      </div>
    {:else}
      <!-- Use data.container as fallback if store isn't synced yet -->
      {#if selectedContainer || data.container}
        <CollectionPageHeader 
          selectedContainer={selectedContainer || data.container}
          {loading}
          on:refresh={() => {}}
          on:updateTitle={handleTitleUpdate}
        />
        
        <SectionGridWrapper 
          sections={selectedContainerSections?.length ? selectedContainerSections : data.sections}
          collectionName={data.collection?.name}
          hasSelectedContainer={!!(selectedContainer || data.container)}
          noteContainerId={(selectedContainer || data.container)?.id || ''}
          on:edit={handleEdit}
          on:delete={deleteSection}
          on:checkboxChange={handleCheckboxChange}
          on:titleSave={handleSectionTitleSave}
        />
      {/if}
    {/if}
  </div>

  <!-- Floating Add Section Area -->
  {#if !loading && (selectedContainer || data.container)}
    <div class="floating-add-section">
      <div class="floating-add-section-content">
        <CreateNoteSectionForm on:createSection={createSection} />
      </div>
    </div>
  {/if}

</DragProvider>

<style>
  .floating-add-section {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 0; /* Full width since sidebar is in layout */
    z-index: 50;
    pointer-events: none;
  }

  .floating-add-section-content {
    background: linear-gradient(to top, rgba(249, 250, 251, 0.95) 60%, transparent);
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(229, 231, 235, 0.8);
    padding: 12px 16px;
    margin: 0 16px 16px 16px;
    border-radius: 8px 8px 0 0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
    pointer-events: auto;
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .floating-add-section {
      left: 0; /* Full width on smaller screens */
    }
  }
</style>