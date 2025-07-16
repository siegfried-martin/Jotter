<!-- src/routes/app/+page.svelte (Updated to use new components) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { CollectionService } from '$lib/services/collectionService';
  import { NavigationService } from '$lib/services/navigationService';
  import CollectionGrid from '$lib/components/CollectionGrid.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import type { Collection } from '$lib/services/collectionService';

  let collections: Collection[] = [];
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    // Check if user should be redirected to last visited collection
    const redirected = await NavigationService.redirectToLastVisited();
    
    if (!redirected) {
      // If we're still here, load collections for dashboard
      await loadCollections();
    }
  });

  async function loadCollections() {
    try {
      loading = true;
      error = null;
      collections = await CollectionService.getCollections();
    } catch (err) {
      console.error('Failed to load collections:', err);
      error = 'Failed to load collections. Please try again.';
    } finally {
      loading = false;
    }
  }

  function handleCollectionSelect(event: CustomEvent<Collection>) {
    NavigationService.navigateToCollection(event.detail);
  }

  function handleCreateCollection() {
    NavigationService.navigateToCreateCollection();
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {#if loading}
    <LoadingSpinner 
      centered={true} 
      size="lg" 
      text="Loading collections..." 
    />
  {:else if error}
    <div class="text-center py-12">
      <div class="text-red-600 mb-4">
        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p class="text-gray-600 mb-4">{error}</p>
      <button 
        on:click={loadCollections}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  {:else}
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Your Collections</h1>
      <p class="text-gray-600">Organize your notes into collections</p>
    </div>

    {#if collections.length === 0}
      <!-- Empty State -->
      <div class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">No collections yet</h2>
        <p class="text-gray-600 mb-6">Create your first collection to start organizing your notes</p>
        <button 
          on:click={handleCreateCollection}
          class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Create Your First Collection
        </button>
      </div>
    {:else}
      <CollectionGrid 
        {collections} 
        on:select={handleCollectionSelect}
        on:create={handleCreateCollection}
      />
    {/if}
  {/if}
</div>