<!-- src/routes/app/+layout.svelte (Fixed with missing functions) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { authStore, isAuthenticated } from '$lib/auth';
  import { appStore } from '$lib/stores/appStore';
  import { goto } from '$app/navigation';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { AppDataManager } from '$lib/stores/appDataStore';
  import DragProvider from '$lib/dnd/components/DragProvider.svelte';

  let user: any = null;
  let hasLoadedOnce = false;
  let layoutElement: HTMLElement;
  let cacheReady = false; // Track when cache is fully populated
  let cacheLoadError: string | null = null; // Debug: track cache load errors

  // Reactive values
  $: currentCollectionId = $page.params.collection_id;
  $: currentRoute = $page.url.pathname;
  $: userIsAuthenticated = isAuthenticated($authStore);
  
  // Initialize app state when layout first loads
  $: if ($authStore.initialized && !$authStore.loading && $appStore && !$appStore.hasInitialized) {
    console.log('App layout initializing with route:', currentRoute);
    appStore.initialize(currentRoute);
  }

  // Handle cross-collection container moves from AppHeader
  function handleMoveToCollectionFromHeader(event: any) {
    console.log('App layout: Received moveToCollection from header:', event.detail);
    console.log('App layout: Forwarding event to slot content...');
    
    // Create a custom event that will be dispatched on the slot wrapper
    setTimeout(() => {
      const slotWrapper = document.querySelector('[data-collection-layout]');
      if (slotWrapper) {
        console.log('App layout: Dispatching to slot wrapper element');
        const moveEvent = new CustomEvent('moveToCollection', {
          detail: event.detail,
          bubbles: true
        });
        slotWrapper.dispatchEvent(moveEvent);
      } else {
        console.error('App layout: Could not find slot wrapper element');
      }
    }, 0);
  }

  // Handle new note creation from header shortcuts
  function handleNewNote(isCodeNote = false) {
    console.log('New note requested:', { isCodeNote });
    // This should be handled by the current page/component
    // For now, we'll dispatch an event that pages can listen to
    window.dispatchEvent(new CustomEvent('createNewNote', { 
      detail: { isCodeNote } 
    }));
  }

  onMount(async () => {
    const unsubscribe = authStore.subscribe((auth) => {
      if (!auth.loading && !isAuthenticated(auth)) {
        console.log('User not authenticated, redirecting to landing page');
        goto('/');
        return;
      }
      user = auth.user;
      if (!auth.loading) {
        hasLoadedOnce = true;
        
        // Only start background loading if user is authenticated
        if (isAuthenticated(auth)) {
          startBackgroundLoading();
        }
      }
    });

    return unsubscribe;
  });

  // Load all collections + containers synchronously on app start
  async function startBackgroundLoading() {
    try {
      console.log('🚀 Loading all collections and containers into cache...');

      // BLOCKING: Wait for all collections + first 10 containers per collection to load
      const collections = await AppDataManager.ensureAllCollections();
      console.log('✅ Cache populated with all collections and containers:', collections.length);

      // Mark cache as ready - app can now render
      cacheReady = true;
      cacheLoadError = null;

    } catch (error) {
      console.error('❌ Cache loading failed:', error);

      // Store error for debugging
      cacheLoadError = error instanceof Error ? error.message : String(error);

      // If it's an auth error, don't spam logs
      if (error instanceof Error && error.message.includes('not authenticated')) {
        console.log('Cache loading skipped - user not authenticated');
        return;
      }

      // Even if cache loading fails, allow app to render (will fetch on demand)
      cacheReady = true;
    }
  }
</script>

<!-- Only show loading on initial load or while populating cache -->
{#if $authStore.loading && !hasLoadedOnce}
  <LoadingSpinner
    fullScreen={true}
    size="lg"
    text="Loading..."
  />
{:else if !userIsAuthenticated}
  <!-- User not authenticated, redirect should happen automatically -->
  <LoadingSpinner
    fullScreen={true}
    size="lg"
    text="Redirecting..."
  />
{:else if !cacheReady}
  <!-- Wait for cache to populate before showing app -->
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <LoadingSpinner
        centered={true}
        size="lg"
        text="Loading collections..."
      />
      {#if cacheLoadError}
        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded text-left max-w-2xl" data-test-error="cache-load-error">
          <p class="text-red-800 font-semibold mb-2">Debug: Cache Load Error</p>
          <p class="text-red-600 text-sm font-mono">{cacheLoadError}</p>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Wrap everything in DragProvider so header can access drag context -->
  <DragProvider behaviors={[]}>
    <div class="min-h-screen bg-gray-50" bind:this={layoutElement}>
      <AppHeader
        {user}
        {currentCollectionId}
        showKeyboardShortcuts={true}
        on:moveToCollection={handleMoveToCollectionFromHeader}
        on:newNote={() => handleNewNote(false)}
        on:newNoteWithCode={() => handleNewNote(true)}
      />

      <main>
        <slot />
      </main>
    </div>
  </DragProvider>
{/if}