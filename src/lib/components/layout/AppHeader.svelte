<!-- src/lib/components/layout/AppHeader.svelte (Updated with all imports) -->
<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import CollectionTabs from './CollectionTabs.svelte';
  import UserMenu from './UserMenu.svelte';
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';

  // DEBUGGING - Let's verify the import
  console.log('🎨 AppHeader - CollectionTabs imported:', !!CollectionTabs);

  export let user: User | null = null;
  export let currentCollectionId: string | undefined = undefined;
  export let showKeyboardShortcuts = false;

  // DEBUGGING - Add this log
  $: console.log('🎨 AppHeader - currentCollectionId prop:', currentCollectionId);
  $: console.log('🎨 AppHeader - should show CollectionTabs:', !!currentCollectionId);

  function handleShortcutAction(event: CustomEvent<{ action: string }>) {
    const { action } = event.detail;
    
    // Dispatch shortcut actions to the window for global handling
    window.dispatchEvent(new CustomEvent('keyboardShortcut', { 
      detail: { action } 
    }));
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
            <img src="/jotter-logo1.svg" alt="Jotter" class="w-8 h-8" />
            <h1 class="text-xl font-semibold text-gray-900">Jotter</h1>
          </a>
        </div>

        <!-- Collections Tabs (only show on collection pages) -->
        {#if currentCollectionId}
          <CollectionTabs {currentCollectionId} />
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