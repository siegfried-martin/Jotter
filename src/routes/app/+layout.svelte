<!-- src/routes/app/+layout.svelte (Updated to use Navigation Guard) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { authStore, isAuthenticated } from '$lib/auth';
  import { initNavigationGuard, destroyNavigationGuard } from '$lib/navigation/navigationGuard';
  import { collectionStore, collectionActions } from '$lib/stores/collectionStore';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  let user = null;

  // Reactive values
  $: currentCollectionId = $page.params.collection_id;
  $: authState = $authStore;
  $: userAuthenticated = isAuthenticated(authState);
  
  console.log('🏗️ Layout - currentCollectionId changed:', currentCollectionId);

  onMount(async () => {
    console.log('🏗️ App layout mounted, initializing navigation guard');
    
    // Initialize the navigation guard to handle auth-based redirects
    initNavigationGuard();
    
    // Subscribe to auth changes for component state
    const unsubscribeAuth = authStore.subscribe((auth) => {
      user = auth.user;
    });

    return () => {
      unsubscribeAuth();
    };
  });

  onDestroy(() => {
    console.log('🏗️ App layout destroyed, cleaning up navigation guard');
    destroyNavigationGuard();
  });
</script>

<!-- Show loading while auth is initializing -->
{#if !authState.initialized || authState.loading}
  <LoadingSpinner 
    fullScreen={true} 
    size="lg" 
    text="Loading..." 
  />
{:else if !userAuthenticated}
  <!-- This shouldn't happen due to navigation guard, but just in case -->
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
      <p class="text-gray-600">Please sign in to continue.</p>
    </div>
  </div>
{:else}
  <!-- User is authenticated, show app -->
  <div class="min-h-screen bg-gray-50">
    <AppHeader 
      {user} 
      {currentCollectionId}
      showKeyboardShortcuts={true}
    />
    
    <main>
      <slot />
    </main>
  </div>
{/if}