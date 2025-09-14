<!-- src/routes/app/collections/[collection_id]/containers/[container_id]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { currentContainerStore, AppDataManager } from '$lib/stores/appDataStore';
  import ContainerPageLayout from '$lib/components/containers/ContainerPageLayout.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { SectionService } from '$lib/services/sectionService';
  import { NoteService } from '$lib/services/noteService';
  import { useNoteOperations } from '$lib/composables/useNoteOperations';
  import DragProvider from '$lib/dnd/components/DragProvider.svelte';
  import { createSectionDragBehavior } from '$lib/dnd/behaviors/SectionDragBehavior';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let lastContainerId = '';
  
  // Initialize useNoteOperations
  const { createNewNote } = useNoteOperations();
  
  // Utility function for reordering arrays
  function reorderArray(array, fromIndex, toIndex) {
    if (!array || !Array.isArray(array) || array.length === 0) {
      console.warn('reorderArray: invalid array provided', array);
      return array || [];
    }
    
    if (fromIndex < 0 || fromIndex >= array.length || toIndex < 0 || toIndex >= array.length) {
      console.warn('reorderArray: invalid indices', { fromIndex, toIndex, arrayLength: array.length });
      return array;
    }
    
    const result = [...array];
    const [item] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, item);
    
    return result;
  }

  // Create section drag behavior with proper callbacks
  $: sectionBehavior = createSectionDragBehavior(
    // Section reordering within same container
    async (fromIndex, toIndex, containerId) => {
      console.log('Handling section reorder:', { fromIndex, toIndex, containerId });
      
      const currentSections = $currentContainerStore.sections || [];
      if (fromIndex === toIndex || !currentSections.length) return;
      
      // Optimistic reorder
      const reorderedSections = reorderArray(currentSections, fromIndex, toIndex);
      AppDataManager.updateSectionsOptimistically(data.collectionId, containerId, reorderedSections);
      
      try {
        // Call section service to persist the reorder
        await SectionService.reorderSections(containerId, fromIndex, toIndex);
        console.log('Section reorder API succeeded');
      } catch (error) {
        console.error('Section reorder failed, rolling back:', error);
        // Rollback
        AppDataManager.updateSectionsOptimistically(data.collectionId, containerId, currentSections);
      }
    },
    
    // Cross-container section moves
    async (sectionId, fromContainer, toContainer) => {
      console.log('Handling cross-container section move:', { sectionId, fromContainer, toContainer });
      await handleCrossContainerMoveDirect({ detail: { sectionId, fromContainer, toContainer } });
    }
  );

  $: dragBehaviors = [sectionBehavior];
  
  // Reactive initialization - runs when container ID changes
  $: if (data.containerId && data.containerId !== lastContainerId) {
    lastContainerId = data.containerId;
    initializeContainer();
  }
  
  async function initializeContainer() {
    console.log('Container page: Initializing', {
      collectionId: data.collectionId,
      containerId: data.containerId,
      fromCache: data.fromCache,
      needsLoad: data.needsLoad,
      needsLoadSections: data.needsLoadSections
    });
    
    // Set full context (collection + container)
    AppDataManager.setCurrentContext(data.collectionId, data.containerId);
    
    // Handle different loading scenarios
    if (data.needsLoad) {
      console.log('Container page: Full cache miss, loading everything');
      await AppDataManager.ensureContainerSections(data.collectionId, data.containerId);
    } else if (data.needsLoadSections) {
      console.log('Container page: Have container, loading sections only');
      await AppDataManager.ensureContainerSections(data.collectionId, data.containerId);
    } else {
      console.log('Container page: Full cache hit, no loading needed');
    }
  }
  
  // Event handlers for UI interactions
  async function handleSelectContainer(event) {
    const container = event.detail;
    console.log('Navigating to container:', container.title);
    await goto(`/app/collections/${data.collectionId}/containers/${container.id}`);
  }

  // Handle new note creation from sidebar
  async function handleCreateNew() {
    try {
      console.log('Creating new note from sidebar');
      await createNewNote(data.collectionId, async (newContainer) => {
        // Update cache after creation
        AppDataManager.invalidateCollection(data.collectionId);
        await AppDataManager.ensureCollectionData(data.collectionId);
        
        // Navigate to the new container
        console.log('Navigating to new container:', newContainer.id);
        await goto(`/app/collections/${data.collectionId}/containers/${newContainer.id}`);
      });
    } catch (error) {
      console.error('Failed to create new note from sidebar:', error);
    }
  }
  
  async function handleCreateSection(event) {
    const sectionType = event.detail; // This is just the type: 'code', 'wysiwyg', etc.
    console.log('Creating section of type:', sectionType);
    
    // Build the complete section object with container ID
    const newSection = {
      type: sectionType,
      note_container_id: data.containerId, // This was missing!
      title: null,
      content: sectionType === 'checklist' ? '[]' : '', // Empty content based on type
      meta: null,
      checklist_data: sectionType === 'checklist' ? [] : null
    };
    
    console.log('Creating section with data:', newSection);
    
    try {
      // Call API first to get the real section with ID
      const createdSection = await SectionService.createSection(newSection);
      console.log('Section created successfully:', createdSection);
      
      // Then update cache with the real section
      const currentSections = $currentContainerStore.sections || [];
      const updatedSections = [...currentSections, createdSection];
      AppDataManager.updateSectionsOptimistically(
        data.collectionId,
        data.containerId, 
        updatedSections
      );
      
      // Navigate to edit the new section
      console.log('Navigating to edit new section:', createdSection.id);
      await goto(`/app/collections/${data.collectionId}/containers/${data.containerId}/edit/${createdSection.id}`);
      
    } catch (error) {
      console.error('Failed to create section:', error);
    }
  }
  
  function handleOptimisticSectionUpdate(event) {
    const { sections } = event.detail;
    AppDataManager.updateSectionsOptimistically(
      data.collectionId,
      data.containerId,
      sections
    );
  }
  
  // Handle section edit clicks
  async function handleEditSection(event) {
    const sectionId = event.detail;
    console.log('Navigating to edit section:', sectionId);
    await goto(`/app/collections/${data.collectionId}/containers/${data.containerId}/edit/${sectionId}`);
  }

  // Handle section deletion
  async function handleDeleteSection(event) {
    const sectionId = event.detail;
    
    // Find the section to get its title for the confirmation dialog
    const currentSections = $currentContainerStore.sections || [];
    const sectionToDelete = currentSections.find(s => s.id === sectionId);
    const sectionTitle = sectionToDelete?.title || `${sectionToDelete?.type || 'section'}`;
    
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to delete this ${sectionTitle}? This action cannot be undone.`);
    
    if (!confirmed) {
      console.log('Section deletion cancelled');
      return;
    }
    
    console.log('Deleting section:', sectionId);
    
    // Optimistic update - remove from UI immediately
    const updatedSections = currentSections.filter(s => s.id !== sectionId);
    AppDataManager.updateSectionsOptimistically(
      data.collectionId,
      data.containerId,
      updatedSections
    );
    
    try {
      // Background API call
      await SectionService.deleteSection(sectionId);
      console.log('Section deleted successfully');
    } catch (error) {
      console.error('Failed to delete section:', error);
      // Rollback optimistic update
      AppDataManager.updateSectionsOptimistically(
        data.collectionId,
        data.containerId,
        currentSections
      );
      
      // Show error message
      alert('Failed to delete section. Please try again.');
    }
  }
  
  // Handle section title saves
  async function handleSectionTitleSave(event) {
    const { sectionId, title } = event.detail;
    console.log('Saving section title from +page.svelte:', { sectionId, title });
    
    const currentSections = $currentContainerStore.sections || [];
    const originalSection = currentSections.find(s => s.id === sectionId);
    
    if (!originalSection) {
      console.error('Section not found for title save:', sectionId);
      return;
    }
    
    // Optimistic update - immediately update the UI
    const updatedSections = currentSections.map(section => 
      section.id === sectionId ? { ...section, title } : section
    );
    
    AppDataManager.updateSectionsOptimistically(
      data.collectionId,
      data.containerId,
      updatedSections
    );
    
    try {
      // Background API call
      await SectionService.updateSection(sectionId, {
        title: title
      });
      
      console.log('Section title saved successfully');
    } catch (error) {
      console.error('Failed to save section title:', error);
      
      // Rollback optimistic update on error
      AppDataManager.updateSectionsOptimistically(
        data.collectionId,
        data.containerId,
        currentSections
      );
    }
  }

  // NEW: Handle container title updates from CollectionPageHeader
  async function handleUpdateTitle(event) {
    const { containerId, newTitle } = event.detail;
    console.log('Container page: Handling container title update:', { containerId, newTitle });
    
    // Get current containers for optimistic update
    const cachedData = AppDataManager.getCollectionDataSync(data.collectionId);
    const containers = cachedData?.containers || [];
    const originalContainer = containers.find(c => c.id === containerId);
    
    if (!originalContainer) {
      console.error('Container not found for title update:', containerId);
      return;
    }
    
    // Store original containers for rollback
    const originalContainers = [...containers];
    
    // Optimistic update - immediately update the UI
    const updatedContainers = containers.map(container => 
      container.id === containerId ? { ...container, title: newTitle } : container
    );
    
    AppDataManager.updateContainerArrayOptimistically(data.collectionId, updatedContainers);
    
    try {
      // Background API call
      await NoteService.updateNoteContainerTitle(containerId, newTitle);
      console.log('Container title saved successfully');
    } catch (error) {
      console.error('Failed to save container title:', error);
      
      // Rollback optimistic update on error
      AppDataManager.updateContainerArrayOptimistically(data.collectionId, originalContainers);
    }
  }
  
  // Handle container reordering directly (no forwarding needed)
  async function handleContainerReorderDirect(event) {
    const { fromIndex, toIndex, collectionId } = event.detail;
    
    console.log('Container page: Handling container reorder directly', { fromIndex, toIndex, collectionId });
    
    if (fromIndex === toIndex) return;
    
    // Get containers directly from cache
    const cachedData = AppDataManager.getCollectionDataSync(data.collectionId);
    const containers = cachedData?.containers || [];
    
    if (!containers || containers.length === 0) {
      console.error('No containers available for reorder');
      return;
    }
    
    // Store original order for potential rollback
    const originalContainers = [...containers];
    
    // 1. Create reordered array
    const reorderedContainers = reorderArray(containers, fromIndex, toIndex);
    
    // 2. Update the entire container array optimistically
    console.log('Container page: Updating container array optimistically');
    AppDataManager.updateContainerArrayOptimistically(data.collectionId, reorderedContainers);
    
    try {
      console.log('Container page: Calling NoteService.reorderNoteContainers...');
      
      // 3. Call API service
      const serverResponse = await NoteService.reorderNoteContainers(data.collectionId, fromIndex, toIndex);
      
      console.log('Container page: Container reorder API call successful');
      
      // 4. Compare optimistic vs server order
      if (serverResponse && Array.isArray(serverResponse)) {
        const optimisticOrder = reorderedContainers.map(c => c.id).join(',');
        const serverOrder = serverResponse.map(c => c.id).join(',');
        
        if (optimisticOrder !== serverOrder) {
          console.log('Container page: Server container order differs from optimistic, updating with server order');
          AppDataManager.updateContainerArrayOptimistically(data.collectionId, serverResponse);
        } else {
          console.log('Container page: Server matches optimistic container update, no change needed');
        }
      }
      
      console.log('Container page: Container reorder completed successfully');
      
    } catch (error) {
      console.error('Container page: Container reorder failed:', error);
      console.log('Container page: Rolling back container reorder');
      AppDataManager.updateContainerArrayOptimistically(data.collectionId, originalContainers);
    }
  }
  
  // Handle cross-container section moves directly
  async function handleCrossContainerMoveDirect(event) {
    const { sectionId, fromContainer, toContainer } = event.detail;
    console.log('Container page: Handling cross-container move directly:', { sectionId, fromContainer, toContainer });
    
    // Get current data from cache
    const fromData = AppDataManager.getContainerSectionsSync(data.collectionId, fromContainer);
    const toData = AppDataManager.getContainerSectionsSync(data.collectionId, toContainer);
    
    if (!fromData?.sections || !toData?.sections) {
      console.error('Missing container data for optimistic update');
      return;
    }
    
    // Find and remove section from source
    const sectionToMove = fromData.sections.find(s => s.id === sectionId);
    if (!sectionToMove) return;
    
    const newFromSections = fromData.sections.filter(s => s.id !== sectionId);
    const newToSections = [...toData.sections, { ...sectionToMove, note_container_id: toContainer }];
    
    // Store originals for rollback
    const originalFromSections = [...fromData.sections];
    const originalToSections = [...toData.sections];
    
    // 1. Optimistic update - immediate UI change
    AppDataManager.updateSectionsOptimistically(data.collectionId, fromContainer, newFromSections);
    AppDataManager.updateSectionsOptimistically(data.collectionId, toContainer, newToSections);
    
    try {
      // 2. Background API call
      await SectionService.moveSectionToContainer(sectionId, toContainer);
      console.log('Container page: Cross-container move API succeeded');
    } catch (error) {
      console.error('Container page: Cross-container move failed, rolling back:', error);
      // Rollback on error
      AppDataManager.updateSectionsOptimistically(data.collectionId, fromContainer, originalFromSections);
      AppDataManager.updateSectionsOptimistically(data.collectionId, toContainer, originalToSections);
    }
  }
  
  // Handle cross-collection container moves directly
  async function handleMoveToCollectionDirect(event) {
    const { containerId, targetCollectionId } = event.detail;
    
    console.log('Container page: Handling cross-collection move directly:', containerId, '->', targetCollectionId);
    
    const sourceCollectionId = data.collectionId;
    
    if (sourceCollectionId === targetCollectionId) {
      console.warn('Cannot move container to same collection');
      return;
    }
    
    // Get current source collection data
    const sourceData = AppDataManager.getCollectionDataSync(sourceCollectionId);
    const sourceContainers = sourceData?.containers || [];
    
    // Find the container to move
    const containerToMove = sourceContainers.find(c => c.id === containerId);
    if (!containerToMove) {
      console.error('Container not found in source collection');
      return;
    }
    
    console.log('Container page: Moving container:', containerToMove.title, 'to collection:', targetCollectionId);
    
    // Store original state for rollback
    const originalSourceContainers = [...sourceContainers];
    
    // 1. Optimistic update: Remove from source collection immediately
    const updatedSourceContainers = sourceContainers.filter(c => c.id !== containerId);
    AppDataManager.updateContainerArrayOptimistically(sourceCollectionId, updatedSourceContainers);
    
    try {
      // 2. Call API to move container
      await NoteService.moveToCollection(containerId, targetCollectionId);
      
      console.log('Container page: Cross-collection move API succeeded');
      
      // 3. Invalidate target collection cache to force fresh data load
      AppDataManager.invalidateCollection(targetCollectionId);
      
      // 4. Optionally preload target collection
      AppDataManager.ensureCollectionData(targetCollectionId).catch(error => {
        console.warn('Failed to preload target collection:', error);
      });
      
      console.log('Container page: Cross-collection container move completed successfully');
      
    } catch (error) {
      console.error('Container page: Cross-collection move failed, rolling back:', error);
      
      // Rollback: restore container to source collection
      AppDataManager.updateContainerArrayOptimistically(sourceCollectionId, originalSourceContainers);
    }
  }

  // Handle container deletion
  async function handleDeleteContainer(event) {
    const containerId = event.detail;
    console.log('Deleting container:', containerId);
    
    // Find the container to get its title for confirmation
    const currentContainers = $currentContainerStore.allContainers || [];
    const containerToDelete = currentContainers.find(c => c.id === containerId);
    const containerTitle = containerToDelete?.title || 'this note';
    
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to delete "${containerTitle}"? This will also delete all sections inside this note. This action cannot be undone.`);
    
    if (!confirmed) {
      console.log('Container deletion cancelled');
      return;
    }
    
    // If this is the currently viewed container, navigate away first
    if (containerId === data.containerId) {
      console.log('Deleting currently viewed container, navigating to collection');
      // Navigate to collection page before deletion
      await goto(`/app/collections/${data.collectionId}`);
    }
    
    // Optimistic update - remove from cache immediately
    const updatedContainers = currentContainers.filter(c => c.id !== containerId);
    AppDataManager.updateContainerArrayOptimistically(data.collectionId, updatedContainers);
    
    try {
      // API call to delete the container
      await NoteService.deleteNoteContainer(containerId);
      console.log('Container deleted successfully');
      
      // Refresh collection data to ensure consistency
      AppDataManager.invalidateCollection(data.collectionId);
      await AppDataManager.ensureCollectionData(data.collectionId);
      
    } catch (error) {
      console.error('Failed to delete container:', error);
      
      // Rollback optimistic update on error
      AppDataManager.updateContainerArrayOptimistically(data.collectionId, currentContainers);
      
      // Show error message
      alert('Failed to delete note. Please try again.');
    }
  }
</script>

<svelte:head><title>{$currentContainerStore.container?.title} - Jottr</title></svelte:head>

{#if $currentContainerStore.loading}
  <!-- Component-level loading -->
  <div class="flex h-screen bg-gray-50 items-center justify-center">
    <div class="text-center">
      <LoadingSpinner />
      <p class="mt-4 text-gray-600">Loading container...</p>
      {#if $currentContainerStore.error}
        <p class="mt-2 text-red-600 text-sm">{$currentContainerStore.error}</p>
      {/if}
    </div>
  </div>
{:else if $currentContainerStore.container}
  <!-- Normal container display with DragProvider -->
  <DragProvider behaviors={dragBehaviors}>
    <ContainerPageLayout
      containers={$currentContainerStore.allContainers}
      selectedContainer={$currentContainerStore.container}
      selectedContainerSections={$currentContainerStore.sections}
      loading={$currentContainerStore.loading}
      currentCollectionId={data.collectionId}
      currentContainerId={data.containerId}
      currentCollection={$currentContainerStore.collection}
      
      on:selectContainer={handleSelectContainer}
      on:createNew={handleCreateNew}
      on:deleteContainer={handleDeleteContainer}
      on:createSection={handleCreateSection}
      on:optimisticUpdate={handleOptimisticSectionUpdate}
      on:edit={handleEditSection}
      on:delete={handleDeleteSection}
      on:titleSave={handleSectionTitleSave}
      on:updateTitle={handleUpdateTitle}
      
      on:containersReordered={handleContainerReorderDirect}
      on:crossContainerDrop={handleCrossContainerMoveDirect}
      on:moveToCollection={handleMoveToCollectionDirect}
    />
  </DragProvider>
{:else}
  <!-- Error/not found state -->
  <div class="flex h-screen bg-gray-50 items-center justify-center">
    <div class="text-center">
      <p class="text-gray-600">Container not found</p>
      {#if $currentContainerStore.error}
        <p class="mt-2 text-red-600 text-sm">{$currentContainerStore.error}</p>
      {/if}
      <button 
        on:click={() => goto(`/app/collections/${data.collectionId}`)}
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Back to Collection
      </button>
    </div>
  </div>
{/if}