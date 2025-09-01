<!-- src/routes/app/collections/[collection_id]/+layout.svelte -->
<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { currentCollectionStore, AppDataManager } from '$lib/stores/appDataStore';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { SectionService } from '$lib/services/sectionService';
  import { NoteService } from '$lib/services/noteService';
  import { createSectionDragBehavior } from '$lib/dnd/behaviors/SectionDragBehavior';
  
  export let data;
  
  let hasInitialized = false;
  
  // Get drag context from root DragProvider
  const dragContext = getContext('drag');
  const { registry } = dragContext || {};
  
  onMount(async () => {
    if (!hasInitialized) {
      hasInitialized = true;
      
      console.log('Collection layout: Initializing for collection', data.collectionId);
      
      // Set context immediately (this makes the derived stores active)
      AppDataManager.setCurrentContext(data.collectionId);
      
      // Load data if cache miss
      if (data.needsLoad) {
        console.log('Collection layout: Cache miss detected, loading data');
        try {
          await AppDataManager.ensureCollectionData(data.collectionId);
          console.log('Collection layout: Data loaded successfully');
        } catch (error) {
          console.error('Collection layout: Failed to load data:', error);
        }
      } else {
        console.log('Collection layout: Using cached data, no loading needed');
      }
    }
  });
  
  // Keyboard shortcuts handler
  function handleKeydown(event) {
    // Alt+N - New note
    if (event.altKey && event.key.toLowerCase() === 'n' && !event.shiftKey) {
      event.preventDefault();
      console.log('Alt+N pressed - creating new note in collection:', data.collectionId);
      handleNewNote(false);
    }
    // Alt+Shift+N - New note with code section
    else if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      console.log('Alt+Shift+N pressed - creating new note with code in collection:', data.collectionId);
      handleNewNote(true);
    }
    // Ctrl+M - New note
    else if (event.ctrlKey && event.key.toLowerCase() === 'm' && !event.shiftKey) {
      event.preventDefault();
      console.log('Ctrl+M pressed - creating new note in collection:', data.collectionId);
      handleNewNote(false);
    }
    // Ctrl+Shift+M - New note with code section
    else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
      event.preventDefault();
      console.log('Ctrl+Shift+M pressed - creating new note with code in collection:', data.collectionId);
      handleNewNote(true);
    }
  }
  
  // New note creation function
  async function handleNewNote(withCodeSection = false) {
    try {
      console.log('Creating new note in collection:', data.collectionId);
      
      // Create new container in current collection
      const newContainer = await NoteService.createSimpleNoteContainer(
        data.collectionId,
        `New Note ${new Date().toLocaleDateString()}`
      );
      
      console.log('Created new container:', newContainer.id);
      
      // Update cache
      AppDataManager.invalidateCollection(data.collectionId);
      await AppDataManager.ensureCollectionData(data.collectionId);
      
      if (withCodeSection) {
        // Create a code section and navigate to edit it
        const codeSection = await SectionService.createSection({
          type: 'code',
          note_container_id: newContainer.id,
          title: null,
          content: '',
          meta: { language: 'javascript' }
        });
        
        console.log('Created code section:', codeSection.id);
        goto(`/app/collections/${data.collectionId}/containers/${newContainer.id}/edit/${codeSection.id}`);
      } else {
        // Navigate to the new container
        goto(`/app/collections/${data.collectionId}/containers/${newContainer.id}`);
      }
      
    } catch (error) {
      console.error('Failed to create new note:', error);
    }
  }
  
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
  
  // Handle cross-container section moves (existing logic)
  async function handleCrossContainerMove(event) {
    const { sectionId, fromContainer, toContainer } = event.detail;
    console.log('Collection layout: Optimistic cross-container move:', { sectionId, fromContainer, toContainer });
    
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
      console.log('Cross-container move API succeeded');
    } catch (error) {
      console.error('Cross-container move failed, rolling back:', error);
      // Rollback on error
      AppDataManager.updateSectionsOptimistically(data.collectionId, fromContainer, originalFromSections);
      AppDataManager.updateSectionsOptimistically(data.collectionId, toContainer, originalToSections);
    }
  }
  
  // Handle container reordering within same collection  
  async function handleContainerReorder(event) {
    const { fromIndex, toIndex, collectionId } = event.detail;
    
    console.log('Collection layout: Handling container reorder:', { fromIndex, toIndex, collectionId });
    
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
    console.log('Updating container array optimistically');
    AppDataManager.updateContainerArrayOptimistically(data.collectionId, reorderedContainers);
    
    try {
      console.log('Calling NoteService.reorderNoteContainers...');
      
      // 3. Call API service
      const serverResponse = await NoteService.reorderNoteContainers(data.collectionId, fromIndex, toIndex);
      
      console.log('Container reorder API call successful');
      
      // 4. Compare optimistic vs server order
      if (serverResponse && Array.isArray(serverResponse)) {
        const optimisticOrder = reorderedContainers.map(c => c.id).join(',');
        const serverOrder = serverResponse.map(c => c.id).join(',');
        
        if (optimisticOrder !== serverOrder) {
          console.log('Server container order differs from optimistic, updating with server order');
          AppDataManager.updateContainerArrayOptimistically(data.collectionId, serverResponse);
        } else {
          console.log('Server matches optimistic container update, no change needed');
        }
      }
      
      console.log('Container reorder completed successfully');
      
    } catch (error) {
      console.error('Container reorder failed:', error);
      console.log('Rolling back container reorder');
      AppDataManager.updateContainerArrayOptimistically(data.collectionId, originalContainers);
    }
  }
  
  // Handle cross-collection container moves
  async function handleMoveToCollection(event) {
    const { containerId, targetCollectionId } = event.detail;
    
    console.log('Collection layout: Cross-collection container move:', containerId, '->', targetCollectionId);
    console.log('Collection layout: Event detail:', event.detail);
    
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
    
    console.log('Moving container:', containerToMove.title, 'to collection:', targetCollectionId);
    
    // Store original state for rollback
    const originalSourceContainers = [...sourceContainers];
    
    // 1. Optimistic update: Remove from source collection immediately
    const updatedSourceContainers = sourceContainers.filter(c => c.id !== containerId);
    console.log('Optimistic update: Removing container from source collection');
    AppDataManager.updateContainerArrayOptimistically(sourceCollectionId, updatedSourceContainers);
    
    try {
      // 2. Call API to move container
      console.log('Calling NoteService.moveToCollection API...');
      await NoteService.moveToCollection(containerId, targetCollectionId);
      
      console.log('Cross-collection move API succeeded');
      
      // 3. Invalidate target collection cache to force fresh data load
      AppDataManager.invalidateCollection(targetCollectionId);
      
      // 4. Optionally preload target collection
      AppDataManager.ensureCollectionData(targetCollectionId).catch(error => {
        console.warn('Failed to preload target collection:', error);
      });
      
      console.log('Cross-collection container move completed successfully');
      
    } catch (error) {
      console.error('Cross-collection move failed, rolling back:', error);
      
      // Rollback: restore container to source collection
      AppDataManager.updateContainerArrayOptimistically(sourceCollectionId, originalSourceContainers);
    }
  }
  
  // Register SECTION behaviors with custom drag system when data is available
  $: if (registry && data?.collectionId) {
    try {
      console.log('Registering SECTION drag behaviors for collection:', data.collectionId);
      
      // Clear existing behaviors
      if (registry.clearBehaviors) {
        registry.clearBehaviors();
      }
      
      // Create and register ONLY section behavior (not container - containers use svelte-dnd-action)
      const sectionBehavior = createSectionDragBehavior(
        // Section reorder handler
        async (fromIndex, toIndex, containerId) => {
          console.log('Section reorder with AppDataManager:', fromIndex, '->', toIndex, 'in', containerId);
          
          if (fromIndex === toIndex) return;
          
          // Get current sections directly from cache
          const cachedData = AppDataManager.getContainerSectionsSync(data.collectionId, containerId);
          const currentSections = cachedData?.sections || [];
          
          if (!currentSections || currentSections.length === 0) {
            console.warn('No sections to reorder');
            return;
          }
          
          // Store original order for potential rollback
          const originalSections = [...currentSections];
          
          // 1. Optimistically update cache first
          const reorderedSections = reorderArray(currentSections, fromIndex, toIndex);
          AppDataManager.updateSectionsOptimistically(data.collectionId, containerId, reorderedSections);
          
          try {
            // 2. Call API service
            const updatedSections = await SectionService.reorderSections(containerId, fromIndex, toIndex);
            
            // 3. Validate server response
            if (updatedSections && Array.isArray(updatedSections)) {
              const validUpdatedSections = updatedSections.filter(section => section && section.id);
              
              if (validUpdatedSections.length === reorderedSections.length) {
                const currentOptimisticOrder = reorderedSections.map(s => s.id).join(',');
                const serverOrder = validUpdatedSections.map(s => s.id).join(',');

                if (currentOptimisticOrder !== serverOrder) {
                  console.log('Server order differs from optimistic, updating UI');
                  AppDataManager.updateSectionsOptimistically(data.collectionId, containerId, validUpdatedSections);
                }
              }
            }
            
            console.log('Section reorder completed successfully');
          } catch (error) {
            console.error('Section reorder failed:', error);
            AppDataManager.updateSectionsOptimistically(data.collectionId, containerId, originalSections);
          }
        },
        
        // Cross-container move handler  
        async (sectionId, fromContainer, toContainer) => {
          await handleCrossContainerMove({ 
            detail: { sectionId, fromContainer, toContainer } 
          });
        }
      );
      
      // Register only the section behavior
      registry.register(sectionBehavior);
      
      console.log('Section drag behavior registered successfully');
    } catch (error) {
      console.error('Failed to register section drag behaviors:', error);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $currentCollectionStore.loading}
  <!-- Component-level loading -->
  <div class="flex h-screen bg-gray-50 items-center justify-center">
    <div class="text-center">
      <LoadingSpinner />
      <p class="mt-4 text-gray-600">Loading collection...</p>
    </div>
  </div>
{:else if $currentCollectionStore.collection}
  <!-- Normal layout with data loaded -->
  <div 
    class="flex h-screen bg-gray-50 relative" 
    style="height: calc(100vh - 4rem);"
    data-collection-layout
    on:containersReordered={handleContainerReorder}
    on:crossContainerDrop={handleCrossContainerMove}
    on:moveToCollection={handleMoveToCollection}
  >
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
{:else}
  <!-- Error state -->
  <div class="flex h-screen bg-gray-50 items-center justify-center">
    <div class="text-center">
      <p class="text-gray-600">Collection not found</p>
      {#if $currentCollectionStore.error}
        <p class="mt-2 text-red-600 text-sm">{$currentCollectionStore.error}</p>
      {/if}
      <button 
        on:click={async () => {
          try {
            await AppDataManager.ensureCollectionData(data.collectionId);
          } catch (error) {
            console.error('Retry failed:', error);
          }
        }}
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  </div>
{/if}