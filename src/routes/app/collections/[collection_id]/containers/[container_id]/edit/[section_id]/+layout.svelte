<!-- src/routes/app/collections/[collection_id]/containers/[container_id]/edit/+layout.svelte -->
<script lang="ts">
  // This layout overrides the parent collection layout to provide
  // a clean full-screen experience for editing
  import { page } from '$app/stores';
  import { authStore, isAuthenticated } from '$lib/auth';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  $: authState = $authStore;
  $: userAuthenticated = isAuthenticated(authState);
</script>

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
  <!-- Clean full-screen layout for editing - NO sidebar, NO collection header -->
  <div class="min-h-screen bg-gray-50">
    <slot />
  </div>
{/if}