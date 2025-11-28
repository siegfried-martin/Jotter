<!-- src/lib/components/layout/CollectionTabs.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { allCollectionsStore, AppDataManager } from '$lib/stores/appDataStore';
  import { isTouchDevice } from '$lib/utils/deviceUtils';

  export let currentCollectionId: string;

  const dispatch = createEventDispatcher<{
    moveToCollection: {
      containerId: string;
      targetCollectionId: string;
    };
  }>();

  $: collections = $allCollectionsStore.collections || [];
  $: loading = $allCollectionsStore.loading;
  $: currentCollection = collections.find(c => c.id === currentCollectionId);

  function navigateTo(collection: any) {
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

  function handleSelectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const collection = collections.find(c => c.id === select.value);
    if (collection) {
      navigateTo(collection);
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
    Loading...
  </div>
{:else if !collections || collections.length === 0}
  <div class="px-4 py-2 text-sm text-gray-500">
    No collections
  </div>
{:else}
  <!-- Mobile: Dropdown selector (< 640px) -->
  <div class="mobile-dropdown sm:hidden">
    <select
      value={currentCollectionId}
      on:change={handleSelectChange}
      class="collection-select"
      style="border-left: 4px solid {currentCollection?.color || '#3B82F6'};"
    >
      {#each collections as collection (collection.id)}
        <option value={collection.id}>{collection.name}</option>
      {/each}
    </select>
  </div>

  <!-- Desktop: Horizontal tabs (>= 640px) -->
  <div class="desktop-tabs hidden sm:flex space-x-1 overflow-x-auto p-1 border-b border-gray-200 bg-white">
    {#each collections as collection (collection?.id || Math.random())}
      {#if collection && collection.id && collection.name}
        {@const isCurrentCollection = collection.id === currentCollectionId}

        <!-- Collection Tab with Drop Zone -->
        <div class="collection-tab-container">
          {#if !isCurrentCollection}
            <!-- Make non-current tabs into drop zones -->
            <div
              class="collection-drop-zone"
              use:dndzone={{
                items: [],
                type: 'containers',
                dropTargetStyle: {
                  outline: '2px solid #3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)'
                },
                dropFromOthersDisabled: false,
                dragDisabled: true,
                morphDisabled: true
              }}
              on:finalize={createDropHandler(collection.id)}
            >
              <button
                on:click={() => navigateTo(collection)}
                class="collection-tab-button"
                style="border-bottom: 3px solid {collection.color || '#3B82F6'};"
              >
                {collection.name}
              </button>
            </div>
          {:else}
            <!-- Current collection tab - no drop zone needed -->
            <div class="collection-tab-current">
              <button
                class="collection-tab-button current"
                style="border-bottom: 3px solid {collection.color || '#3B82F6'};
                      background-color: {collection.color || '#3B82F6'}15;"
                disabled
              >
                {collection.name}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  /* Mobile dropdown styles */
  .mobile-dropdown {
    padding: 0.25rem;
  }

  .collection-select {
    width: 100%;
    max-width: 150px;
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    appearance: auto;
  }

  .collection-select:focus {
    outline: none;
    ring: 2px;
    ring-color: #3b82f6;
    border-color: #3b82f6;
  }

  /* Desktop tab styles */
  .collection-tab-container {
    position: relative;
    flex-shrink: 0;
  }

  .collection-drop-zone,
  .collection-tab-current {
    min-height: 36px;
    display: flex;
    align-items: center;
  }

  .collection-tab-button {
    display: block;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #4b5563;
    background: transparent;
    border: none;
    border-radius: 0.25rem 0.25rem 0 0;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s ease;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-tab-button:hover:not(:disabled) {
    background-color: #f3f4f6;
    transform: translateY(-1px);
  }

  .collection-tab-button.current {
    color: #111827;
    cursor: default;
  }
</style>
