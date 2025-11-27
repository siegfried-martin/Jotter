<!-- src/routes/app/+page.svelte (Simplified with App Store) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { CollectionService } from '$lib/services/collectionService';
  import { NavigationService } from '$lib/services/navigationService';
  import { appStore } from '$lib/stores/appStore';
  import { AppDataManager } from '$lib/stores/appDataStore';
  import CollectionGrid from '$lib/components/collections/CollectionGrid.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import type { Collection } from '$lib/types';

  let collections: Collection[] = [];
  let loading = true;
  let error: string | null = null;
  let shouldShowCollections = false;

  onMount(async () => {
    console.log('📱 Collections page loaded');
    console.log('📱 App state:', $appStore);

    // DISABLED: Auto-redirect to last visited location
    // This legacy behavior was causing issues with E2E tests and confusing UX.
    // When users navigate to /app, they should see the collections page.
    //
    // const shouldRedirect = await NavigationService.shouldRedirectToLastVisited();
    // console.log('📱 Should redirect to last visited?', shouldRedirect);
    //
    // if (shouldRedirect) {
    //   console.log('🚀 Redirecting to last visited location');
    //   const redirected = await NavigationService.redirectToLastVisited();
    //   console.log('🚀 Redirect completed?', redirected);
    //
    //   if (redirected) {
    //     // Successfully redirected, don't load collections
    //     console.log('✅ Successfully redirected, exiting');
    //     return;
    //   }
    // }

    // Show collections page directly
    console.log('📋 Showing collections page');
    shouldShowCollections = true;
    await loadCollections();
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

  async function handleCreateCollection(event: CustomEvent<{ name: string; color: string; description?: string }>) {
    try {
      const { name, color, description } = event.detail;

      console.log('📦 Creating new collection:', name);
      const newCollection = await CollectionService.createCollection({
        name: name.trim(),
        color,
        description: description?.trim()
      });
      console.log('✅ Collection created in DB:', newCollection.id);

      // CRITICAL: Add to cache BEFORE navigation
      console.log('📥 Adding to AppDataManager cache...');
      AppDataManager.addCollectionOptimistically(newCollection);

      // Navigate to the new collection
      console.log('🧭 Navigating to new collection:', newCollection.id);
      NavigationService.navigateToCollection(newCollection);
    } catch (err) {
      console.error('Failed to create collection:', err);
      error = 'Failed to create collection. Please try again.';
    }
  }

  async function handleEditCollection(event: CustomEvent<Collection>) {
    try {
      const collection = event.detail;
      await CollectionService.updateCollection(collection.id, {
        name: collection.name,
        color: collection.color,
        description: collection.description
      });
      
      // Reload collections to reflect changes
      await loadCollections();
    } catch (err) {
      console.error('Failed to update collection:', err);
      error = 'Failed to update collection. Please try again.';
    }
  }

  async function handleDeleteCollection(event: CustomEvent<Collection>) {
    try {
      const collection = event.detail;
      
      await CollectionService.deleteCollection(collection.id);
      
      // Reload collections to reflect changes
      await loadCollections();
      
      // Clear any previous errors
      error = null;
    } catch (err) {
      console.error('Failed to delete collection:', err);
      error = 'Failed to delete collection. Please try again.';
    }
  }
</script>

{#if !shouldShowCollections}
  <!-- Show minimal loading while checking redirect -->
  <LoadingSpinner 
    centered={true} 
    size="lg" 
    text="Loading..." 
  />
{:else}
  <div class="collections-page-wrapper overflow-y-auto" style="height: calc(100vh - 4rem);">
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
          <h1 class="text-3xl font-bold text-gray-900 mb-2">My Collections</h1>
          <p class="text-gray-600">Organize notes into collections</p>
        </div>

        <CollectionGrid
          {collections}
          on:select={handleCollectionSelect}
          on:create={handleCreateCollection}
          on:edit={handleEditCollection}
          on:delete={handleDeleteCollection}
        />
      {/if}
    </div>
  </div>
{/if}