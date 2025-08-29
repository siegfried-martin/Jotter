<!-- src/lib/components/layout/AppHeader.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { allCollectionsStore, AppDataManager } from '$lib/stores/appDataStore';
  import CollectionTabs from './CollectionTabs.svelte';
  import UserMenu from './UserMenu.svelte';
  
  export let currentCollectionId: string | undefined = undefined;
  export let user: any = null;

  onMount(async () => {
    try {
      console.log('AppHeader: Loading all collections for tabs');
      await AppDataManager.ensureAllCollections();
      console.log('AppHeader: All collections loaded successfully');
    } catch (error) {
      console.error('AppHeader: Failed to load collections:', error);
    }
  });
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      
      <!-- Left Section: Logo + Collections -->
      <div class="flex items-center space-x-6 min-w-0 flex-1">
        <!-- Logo and Branding -->
        <div class="flex items-center space-x-3 flex-shrink-0">
          <a href="/app" class="flex items-center space-x-3">
            <img src="/favicon_2.png" alt="Jotter" class="w-8 h-8" />
            <h1 class="text-xl font-semibold text-gray-900">Jotter</h1>
          </a>
        </div>

        <!-- Collections Tabs -->
        {#if currentCollectionId}
          <div class="flex items-center space-x-4 min-w-0 flex-1">
            <CollectionTabs 
              currentCollectionId={currentCollectionId}
            />
          </div>
        {/if}
      </div>

      <!-- Right Section: User Menu -->
      <div class="flex items-center space-x-4 flex-shrink-0">
        <UserMenu {user} />
      </div>
    </div>
  </div>
</header>