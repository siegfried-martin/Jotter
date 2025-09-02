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

  let user = null;
  let hasLoadedOnce = false;
  let layoutElement: HTMLElement;

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
  function handleMoveToCollectionFromHeader(event) {
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

  // Separate function for background loading with proper auth checks
  async function startBackgroundLoading() {
    try {
      console.log('Starting background collection loading...');
      
      // Background load all collections for fast navigation AND header tabs
      const collections = await AppDataManager.ensureAllCollections();
      console.log('Background loaded all collections for header:', collections.length);
      
      // Optional: Also background load the first few collections' containers
      const topCollections = collections.slice(0, 3);
      topCollections.forEach((collection, index) => {
        setTimeout(() => {
          AppDataManager.ensureCollectionData(collection.id).catch(error => {
            console.warn('Failed to preload collection:', collection.id, error);
          });
        }, index * 200); // Stagger requests
      });
    } catch (error) {
      console.warn('Background collection loading failed:', error);
      
      // If it's an auth error, don't spam logs
      if (error.message && error.message.includes('not authenticated')) {
        console.log('Background loading skipped - user not authenticated');
        return;
      }
      
      // Fail silently for other errors - navigation will still work, just slower
    }
  }
</script>

<!-- Only show loading on initial load -->
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