<!-- src/lib/components/layout/AppHeader.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CollectionTabs from './CollectionTabs.svelte';
  import UserMenu from './UserMenu.svelte';

  export let currentCollectionId: string | undefined = undefined;
  export let user: unknown = null;
  export let showKeyboardShortcuts: boolean = false;
  export let isDemo: boolean = false;

  const dispatch = createEventDispatcher<{
    moveToCollection: {
      containerId: string;
      targetCollectionId: string;
    };
    newNote: void;
    newNoteWithCode: void;
  }>();

  function handleMoveToCollection(event: CustomEvent<{ containerId: string; targetCollectionId: string }>) {
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

        <!-- Demo Mode Indicator -->
        {#if isDemo}
          <div class="hidden sm:flex items-center px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Demo Mode
          </div>
        {/if}

        <UserMenu {user} {isDemo} />
      </div>
    </div>
  </div>
</header>

<!-- Demo Mode Banner (mobile) -->
{#if isDemo}
  <div class="sm:hidden bg-amber-100 border-b border-amber-200 px-4 py-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center text-amber-800 text-xs">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <span><strong>Demo Mode</strong> - Data saved locally</span>
      </div>
      <a href="/" class="text-xs text-amber-700 hover:text-amber-900 font-medium underline">
        Sign in
      </a>
    </div>
  </div>
{/if}