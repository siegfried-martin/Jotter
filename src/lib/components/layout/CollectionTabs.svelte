<!-- src/lib/components/layout/CollectionTabs.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';

  export let currentCollectionId: string;

  import { collectionStore } from '$lib/stores/collectionStore';
  
  // Force reactivity by referencing currentCollectionId in a reactive statement
  $: collections = $collectionStore.collections;
  $: {
    // This reactive block ensures the component re-renders when currentCollectionId changes
    console.log('🔄 CollectionTabs reactive update:', { 
      currentCollectionId, 
      collectionsLength: collections.length 
    });
  }

  function navigateTo(collection) {
    console.log('🧭 CollectionTabs - Navigate to:', collection.name);
    goto(`/app/collections/${collection.id}`);
  }
</script>

<div class="flex space-x-2 overflow-x-auto p-2 border-b border-gray-300 bg-white dark:bg-gray-800">
  {#each collections as collection}
    <button
      on:click={() => navigateTo(collection)}
      class={`relative px-4 py-2 rounded-t-md text-sm font-medium transition-colors duration-200
        hover:bg-gray-100 dark:hover:bg-gray-700
        ${collection.id === currentCollectionId
          ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
          : 'bg-transparent text-gray-600 dark:text-gray-300'}`}
      style="border-bottom: 3px solid {collection.color}; 
            {collection.id === currentCollectionId ? `background-color: ${collection.color}15;` : ''}"
    >
      {collection.name}
    </button>
  {/each}
</div>