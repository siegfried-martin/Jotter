<!-- src/lib/components/layout/AppHeader.svelte (Updated with Collection Management Navigation) -->
<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import CollectionTabs from './CollectionTabs.svelte';
  import CollectionCreateForm from './CollectionCreateForm.svelte';
  import UserMenu from './UserMenu.svelte';
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';
  import { useCollectionManager } from '$lib/composables/useCollectionManager';
  import { goto } from '$app/navigation';

  export let user: User | null = null;
  export let currentCollectionId: string | undefined = undefined;
  export let showKeyboardShortcuts = false;

  // Initialize collection manager
  const collectionManager = useCollectionManager();
  
  // Reactive values from the store subscription
  $: reactiveState = $collectionManager;
  $: ({ isCreating } = reactiveState);

  function handleShortcutAction(event: CustomEvent<{ action: string }>) {
    const { action } = event.detail;
    
    // Dispatch shortcut actions to the window for global handling
    window.dispatchEvent(new CustomEvent('keyboardShortcut', { 
      detail: { action } 
    }));
  }

  function handleAddCollection() {
    $collectionManager.startCreateCollection();
  }

  function handleManageCollections() {
    goto('/app');
  }
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Left Section: Logo + Branding + Collections -->
      <div class="flex items-center space-x-6 min-w-0 flex-1">
        <!-- Logo and Branding -->
        <div class="flex items-center space-x-3 flex-shrink-0">
          <a href="/app" class="flex items-center space-x-3">
            <!-- <img src="/jotter-logo1.svg" alt="Jotter" class="w-8 h-8" /> -->
            <img src="/favicon_2.png" alt="Jotter" class="w-8 h-8" />
            <h1 class="text-xl font-semibold text-gray-900">Jotter</h1>
          </a>
        </div>

        <!-- Collections Tabs (only show on collection pages) -->
        {#if currentCollectionId}
          <div class="flex items-center space-x-4 min-w-0 flex-1">
            <CollectionTabs {currentCollectionId} />
            
            <!-- Manage Collections Button -->
            <button
              on:click={handleManageCollections}
              class="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
              title="Manage Collections"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
            
            <!-- Add Collection Button or Form -->
            {#if isCreating}
              <CollectionCreateForm {collectionManager} />
            {:else}
              <button
                on:click={handleAddCollection}
                class="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                title="Add new collection"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>Add Collection</span>
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Right Section: Shortcuts + User Menu -->
      <div class="flex items-center space-x-4 flex-shrink-0">
        <!-- Keyboard Shortcuts (only show on collection pages) -->
        {#if showKeyboardShortcuts && currentCollectionId}
          <KeyboardShortcuts 
            variant="full"
            on:shortcut={handleShortcutAction}
          />
        {/if}

        <!-- User Menu -->
        <UserMenu {user} />
      </div>
    </div>
  </div>
</header>