<!-- src/routes/app/collections/[collection_id]/+layout.svelte -->
<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { currentCollectionStore, AppDataManager } from '$lib/stores/appDataStore';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { useContainerDragBehaviors } from '$lib/composables/useContainerDragBehaviors';
  import { SectionService } from '$lib/services/sectionService';
  
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
    
    console.log('reorderArray result:', {
      originalLength: array.length,
      resultLength: result.length,
      fromIndex,
      toIndex
    });
    
    return result;
  }
  
  // Handle cross-container section moves
  async function handleCrossContainerMove(event) {
    const { sectionId, fromContainer, toContainer } = event.detail;
    console.log('Optimistic cross-container move:', { sectionId, fromContainer, toContainer });
    
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
  
  // Register drag behaviors when data is available
  $: if (registry && data?.collectionId && $currentCollectionStore.containers) {
    try {
      console.log('Registering drag behaviors for collection:', data.collectionId);
      
      // Create behaviors
      const behaviors = useContainerDragBehaviors(
        null, // pageManager - not used
        () => ({ 
          noteStore: {
            selectedContainerSections: $currentCollectionStore.sections || [],
            selectedContainer: $currentCollectionStore.container,
            containers: $currentCollectionStore.containers
          },
          currentCollectionId: data.collectionId 
        }),
        reorderArray,
        handleCrossContainerMove
      );
      
      // Clear existing behaviors and register new ones
      registry.clearBehaviors?.();
      registry.register(behaviors.containerBehavior);
      registry.register(behaviors.sectionBehavior);
      
      console.log('Both drag behaviors registered with root DragProvider');
    } catch (error) {
      console.error('Failed to register drag behaviors:', error);
    }
  }
</script>

{#if $currentCollectionStore.loading}
  <!-- Component-level loading (not SvelteKit loading) -->
  <div class="flex h-screen bg-gray-50 items-center justify-center">
    <div class="text-center">
      <LoadingSpinner />
      <p class="mt-4 text-gray-600">Loading collection...</p>
    </div>
  </div>
{:else if $currentCollectionStore.collection}
  <!-- Normal layout with data loaded - NO DragProvider here, using root one -->
  <div class="flex h-screen bg-gray-50 relative" style="height: calc(100vh - 4rem);">
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
{:else}
  <!-- Error state or no data -->
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