<!-- src/lib/components/CollectionGrid.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Collection } from '$lib/services/collectionService';

  export let collections: Collection[] = [];

  const dispatch = createEventDispatcher<{
    select: Collection;
    create: void;
  }>();

  function selectCollection(collection: Collection) {
    dispatch('select', collection);
  }

  function createCollection() {
    dispatch('create');
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function truncateDescription(description: string | null, maxLength: number = 100): string {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  }
</script>

<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <!-- Collection Cards -->
  {#each collections as collection (collection.id)}
    <button
      on:click={() => selectCollection(collection)}
      class="group p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-3">
        <div 
          class="w-4 h-4 rounded-full flex-shrink-0" 
          style="background-color: {collection.color}"
        ></div>
        <h3 class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
          {collection.name}
        </h3>
        {#if collection.is_default}
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
            Default
          </span>
        {/if}
      </div>
      
      <!-- Description -->
      {#if collection.description}
        <p class="text-gray-600 text-sm mb-4 line-clamp-3">
          {truncateDescription(collection.description, 80)}
        </p>
      {:else}
        <p class="text-gray-400 text-sm mb-4 italic">
          No description
        </p>
      {/if}
      
      <!-- Footer -->
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span>Created {formatDate(collection.created_at)}</span>
        
        <!-- Collection Stats (if available) -->
        {#if collection.note_count !== undefined}
          <span class="flex items-center space-x-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span>{collection.note_count} notes</span>
          </span>
        {/if}
      </div>
      
      <!-- Hover Effect -->
      <div class="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
        <div class="text-xs text-blue-600 mt-2 text-center">
          Click to open collection
        </div>
      </div>
    </button>
  {/each}

  <!-- Create New Collection Card -->
  <button
    on:click={createCollection}
    class="group p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-100 transition-colors text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    <div class="text-gray-400 group-hover:text-gray-600 transition-colors">
      <!-- Plus Icon -->
      <svg class="w-8 h-8 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      
      <span class="text-gray-600 group-hover:text-gray-800 font-medium transition-colors">
        Create New Collection
      </span>
      
      <p class="text-xs text-gray-500 mt-2 group-hover:text-gray-600 transition-colors">
        Organize your notes into focused collections
      </p>
    </div>
  </button>
</div>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>