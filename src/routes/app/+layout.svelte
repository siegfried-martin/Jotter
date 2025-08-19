<!-- src/routes/app/+layout.svelte (Updated with App Initialization) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { authStore, isAuthenticated } from '$lib/auth';
  import { appStore } from '$lib/stores/appStore';
  import { goto } from '$app/navigation';
  import { collectionStore, collectionActions } from '$lib/stores/collectionStore';
  import AppHeader from '$lib/components/layout/AppHeader.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  let user = null;
  let hasLoadedOnce = false;

  // Reactive values
  $: currentCollectionId = $page.params.collection_id;
  $: currentRoute = $page.url.pathname;
  
  // Initialize app state when layout first loads
  $: if ($authStore.initialized && !$authStore.loading && $appStore && !$appStore.hasInitialized) {
    console.log('🚀 App layout initializing with route:', currentRoute);
    appStore.initialize(currentRoute);
  }

  onMount(async () => {
    const unsubscribe = authStore.subscribe((auth) => {
      if (!auth.loading && !isAuthenticated(auth)) {
        goto('/');
        return;
      }
      user = auth.user;
      if (!auth.loading) {
        hasLoadedOnce = true;
      }
    });

    return unsubscribe;
  });
</script>

<!-- Only show loading on initial load -->
{#if $authStore.loading && !hasLoadedOnce}
  <LoadingSpinner 
    fullScreen={true} 
    size="lg" 
    text="Loading..." 
  />
{:else}
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