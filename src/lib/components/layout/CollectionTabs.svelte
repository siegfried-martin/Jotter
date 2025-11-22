<!-- src/lib/components/layout/CollectionTabs.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { allCollectionsStore, AppDataManager } from '$lib/stores/appDataStore';

  export let currentCollectionId: string;

  const dispatch = createEventDispatcher<{
    moveToCollection: {
      containerId: string;
      targetCollectionId: string;
    };
  }>();

  $: collections = $allCollectionsStore.collections || [];
  $: loading = $allCollectionsStore.loading;

  function navigateTo(collection) {
    console.log('CollectionTabs - Navigate to:', collection?.name);
    if (!collection?.id) {
      console.error('Collection missing ID:', collection);
      return;
    }

    // Get cached data for this collection
    const cachedData = AppDataManager.getCollectionDataSync(collection.id);

    // Try to get last visited container for this collection
    let targetContainerId = AppDataManager.getLastVisitedContainer(collection.id);

    // If no last visited, use first container from cache
    if (!targetContainerId && cachedData?.containers && cachedData.containers.length > 0) {
      targetContainerId = cachedData.containers[0].id;
    }

    // If we have a target container, navigate directly to it (bypass collection redirect page)
    if (targetContainerId) {
      console.log('CollectionTabs - Direct navigation to container:', targetContainerId);
      goto(`/app/collections/${collection.id}/containers/${targetContainerId}`);
    } else {
      // No cache or containers - go to collection page which will handle loading/redirect
      console.log('CollectionTabs - No cache, navigating to collection page');
      goto(`/app/collections/${collection.id}`);
    }
  }

  // Handle container drops on collection tabs
  function createDropHandler(collectionId: string) {
    return function handleDrop(e: CustomEvent) {
      const { items, info } = e.detail;
      
      console.log('Collection tab drop event:', { 
        collectionId, 
        info, 
        itemsLength: items.length,
        trigger: info.trigger
      });
      
      // Check for any drop that has a container ID and is on a different collection
      if (info.trigger === 'droppedIntoZone' && info.id && collectionId !== currentCollectionId) {
        console.log('Container dropped on collection tab:', {
          containerId: info.id,
          targetCollectionId: collectionId
        });
        
        dispatch('moveToCollection', {
          containerId: info.id,
          targetCollectionId: collectionId
        });
      } else {
        console.log('Drop ignored:', {
          hasContainerId: !!info.id,
          isSameCollection: collectionId === currentCollectionId,
          trigger: info.trigger
        });
      }
    };
  }
</script>

{#if loading}
  <div class="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500">
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Loading collections...
  </div>
{:else if !collections || collections.length === 0}
  <div class="px-4 py-2 text-sm text-gray-500">
    No collections found
  </div>
{:else}
  <div class="flex space-x-2 overflow-x-auto p-2 border-b border-gray-300 bg-white dark:bg-gray-800">
    {#each collections as collection (collection?.id || Math.random())}
      {#if collection && collection.id && collection.name}
        {@const isCurrentCollection = collection.id === currentCollectionId}
        
        <!-- Collection Tab with Drop Zone -->
        <div class="collection-tab-container">
          {#if !isCurrentCollection}
            <!-- Make non-current tabs into drop zones -->
            <div 
              class="collection-drop-zone lg:w-20 md:w-16 sm:w-12 xl:w-24 2xl:w-28 w-12 overflow-hidden"
              use:dndzone={{
                items: [], // Empty - this is just a drop target
                type: 'containers', // Same type as ContainerList
                dropTargetStyle: {
                  outline: '2px solid #3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)'
                },
                dropFromOthersDisabled: false, // Accept drops from other zones
                dragDisabled: true, // Don't allow dragging from this zone
                morphDisabled: true
              }}
              on:finalize={createDropHandler(collection.id)}
            >
              <button
                on:click={() => navigateTo(collection)}
                class="collection-tab-button px-4 py-2 rounded-t-md text-sm font-medium transition-all duration-200 whitespace-nowrap
                  hover:bg-gray-100 dark:hover:bg-gray-700 bg-transparent text-gray-600 dark:text-gray-300 pl-1 pr-1"
                style="border-bottom: 3px solid {collection.color || '#3B82F6'};"
              >
                {collection.name}
              </button>
            </div>
          {:else}
            <!-- Current collection tab - no drop zone needed -->
            <div class="lg:w-24 md:w-19 sm:w-14 xl:w-28 2xl:w-32 w-14 overflow-hidden">
              <button
                on:click={() => navigateTo(collection)}
                class="collection-tab-button px-4 py-2 rounded-t-md text-sm font-medium transition-all duration-200 whitespace-nowrap
                  bg-gray-200 dark:bg-gray-700 text-black dark:text-white opacity-75 pl-1 pr-1"
                style="border-bottom: 3px solid {collection.color || '#3B82F6'}; 
                      background-color: {collection.color || '#3B82F6'}15;"
                disabled
              >
                {collection.name}
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <!-- Debug: Show invalid collection data -->
        <div class="px-4 py-2 text-sm text-red-500 border border-red-300 rounded">
          Invalid collection: {JSON.stringify(collection)}
        </div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .collection-tab-container {
    position: relative;
    flex-shrink: 0;
  }
  
  .collection-drop-zone {
    min-height: 40px;
    display: flex;
    align-items: center;
  }
  
  .collection-tab-button {
    display: block;
    width: 100%;
    text-align: center;
  }
  
  /* Enhanced hover effects */
  .collection-tab-button:not(:disabled):hover {
    transform: translateY(-1px);
  }
</style>