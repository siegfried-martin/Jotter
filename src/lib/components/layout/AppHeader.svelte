<!-- src/lib/components/layout/AppHeader.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CollectionTabs from './CollectionTabs.svelte';
  import UserMenu from './UserMenu.svelte';
  
  export let currentCollectionId: string | undefined = undefined;
  export let user: any = null;
  export let showKeyboardShortcuts: boolean = false;
  
  const dispatch = createEventDispatcher<{
    moveToCollection: {
      containerId: string;
      targetCollectionId: string;
    };
    newNote: void;
    newNoteWithCode: void;
  }>();
  
  function handleMoveToCollection(event: any) {
    // Forward the event up to the parent
    dispatch('moveToCollection', event.detail);
  }
  
  function handleNewNote() {
    dispatch('newNote');
  }
  
  function handleNewNoteWithCode() {
    dispatch('newNoteWithCode');
  }
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
              {currentCollectionId}
              on:moveToCollection={handleMoveToCollection}
            />
          </div>
        {/if}
      </div>

      <!-- Right Section: Shortcuts + User Menu -->
      <div class="flex items-center space-x-4 flex-shrink-0">
        
        <!-- Keyboard Shortcuts Info -->
        {#if currentCollectionId}
          <div class="hidden lg:flex items-center text-xs text-gray-500 space-x-4 md:hidden">
            <span class="flex items-center space-x-1">
              <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Alt+N</kbd>
              <span>New Note</span>
            </span>
            <span class="flex items-center space-x-1">
              <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Alt+Shift+N</kbd>
              <span>New Note<br/>with Code</span>
            </span>
          </div>
        {/if}

        <!-- Mobile shortcuts hint -->
        <div class="lg:hidden">
          <!-- <span class="text-xs text-gray-400">Alt+N for new note</span> -->
        </div>
        
        <UserMenu {user} />
      </div>
    </div>
  </div>
</header>