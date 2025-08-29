<!-- src/lib/components/layout/CollectionTabs.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import { allCollectionsStore } from '$lib/stores/appDataStore';
  
  export let currentCollectionId: string;

  // Get drag context for drop zone detection
  const dragContext = getContext('drag');
  const { dragCore } = dragContext || {};

  // Subscribe to drag state
  $: dragState = dragCore?.store;
  $: isDraggingContainer = $dragState?.phase === 'dragging' && $dragState?.itemType === 'container';
  $: collections = $allCollectionsStore.collections || [];
  $: loading = $allCollectionsStore.loading;

  function navigateTo(collection) {
    console.log('CollectionTabs - Navigate to:', collection?.name);
    if (collection?.id) {
      goto(`/app/collections/${collection.id}`);
    } else {
      console.error('Collection missing ID:', collection);
    }
  }

  // Get drop target state for specific collection
  function getDropState(collectionId: string) {
    if (!isDraggingContainer || !$dragState?.dropTarget) return { isOver: false, canDrop: false };
    
    const dropZoneId = `collection-tab-${collectionId}`;
    const isOver = $dragState.dropTarget.zoneId === dropZoneId;
    const canDrop = collectionId !== currentCollectionId; // Can't drop on current collection
    
    return { isOver, canDrop };
  }

  $: {
    console.log('CollectionTabs debug:', {
      hasDragContext: !!dragContext,
      hasDragCore: !!dragCore,
      dragState: $dragState,
      isDraggingContainer: isDraggingContainer,
      collectionsCount: collections.length
    });
  }

  $: {
    console.log('CollectionTabs collections debug:', {
      allCollectionsStore: $allCollectionsStore,
      collections: collections,
      collectionsLength: collections?.length,
      firstCollection: collections?.[0]
    });
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
        {@const dropState = getDropState(collection.id)}
        {@const isCurrentCollection = collection.id === currentCollectionId}
        
        <!-- Collection Tab with Drop Zone -->
        <div
          class={`relative transition-all duration-200 ${
            isDraggingContainer ? 'drop-zone-active' : ''
          } ${
            dropState.isOver && dropState.canDrop ? 'drop-zone-over' : ''
          } ${
            dropState.canDrop ? 'drop-zone-valid' : ''
          } ${
            isCurrentCollection ? 'current-collection' : ''
          }`}
          data-drop-zone="collection-tab-{collection.id}"
          data-collection-id={collection.id}
          data-insert-position="0"
        >
          <button
            on:click={() => navigateTo(collection)}
            class={`relative px-4 py-2 rounded-t-md text-sm font-medium transition-colors duration-200 whitespace-nowrap
              hover:bg-gray-100 dark:hover:bg-gray-700
              ${isCurrentCollection
                ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
                : 'bg-transparent text-gray-600 dark:text-gray-300'}
              ${dropState.isOver && dropState.canDrop ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              ${!dropState.canDrop && isDraggingContainer ? 'opacity-50 cursor-not-allowed' : ''}`}
            style="border-bottom: 3px solid {collection.color || '#3B82F6'}; 
                  {isCurrentCollection ? `background-color: ${collection.color || '#3B82F6'}15;` : ''}"
            disabled={!dropState.canDrop && isDraggingContainer}
          >
            {collection.name}
            
            <!-- Drop indicator -->
            {#if dropState.isOver && dropState.canDrop}
              <div class="absolute inset-0 bg-blue-500 opacity-10 rounded-t-md pointer-events-none"></div>
              <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div class="w-2 h-2 bg-blue-500 rotate-45 border border-white shadow-sm"></div>
              </div>
            {/if}
          </button>
          
          <!-- Enhanced drop feedback when dragging containers -->
          {#if isDraggingContainer}
            <div class={`absolute -top-1 left-0 right-0 h-1 rounded-full transition-all duration-200 ${
              dropState.canDrop 
                ? dropState.isOver 
                  ? 'bg-blue-500 opacity-100' 
                  : 'bg-blue-300 opacity-60'
                : 'bg-gray-300 opacity-30'
            }`}></div>
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
  /* Drop zone visual feedback */
  .drop-zone-active {
    position: relative;
  }
  
  .drop-zone-valid {
    /* Subtle glow for valid drop targets */
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
  }
  
  .drop-zone-over {
    /* Strong visual feedback for active drop target */
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .current-collection {
    /* Current collection is not a valid drop target */
    pointer-events: none;
  }
  
  .drop-zone-active .current-collection {
    opacity: 0.5;
  }

  /* Enhanced hover effects */
  .drop-zone-active button:not(:disabled):hover {
    transform: translateY(-1px);
  }
  
  .drop-zone-over button {
    background-color: rgba(59, 130, 246, 0.05) !important;
  }
</style>