<!-- src/routes/app/collections/[collection_id]/+page.svelte - Fixed render loop -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { AppDataManager } from '$lib/stores/appDataStore';
  import { NoteService } from '$lib/services/noteService';
  import { UserService } from '$lib/services/userService';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let isRedirecting = false;
  let redirectStatus = 'Loading...';
  let hasTriedFresh = false; // PREVENT INFINITE LOOP
  
  onMount(async () => {
    // Only run redirect logic for exact bare collection URL
    const currentPath = $page.url.pathname;
    const expectedPath = `/app/collections/${data.collection?.id || data.collectionId}`;
    
    if (currentPath === expectedPath && !$page.params.container_id) {
      console.log('At bare collection URL, handling redirect');
      await handleCollectionRedirect();
    } else {
      console.log('Not at bare collection URL, no redirect needed');
    }
  });
  
  async function handleCollectionRedirect() {
    console.log('🔥 REDIRECT DEBUG - Starting redirect logic');
    console.log('🔥 Data passed to redirect:', {
      fromCache: data.fromCache,
      containerCount: data.containers?.length || 0,
      containerTitles: data.containers?.map(c => c.title) || [],
      collectionName: data.collection?.name || 'Unknown'
    });

    try {
      isRedirecting = true;
      const collectionId = data.collectionId;
      
      // Use data from layout loader first
      let { collection, containers } = data;
      
      console.log('Redirect using layout data:', {
        fromCache: data.fromCache,
        containerCount: containers?.length || 0,
        collectionName: collection?.name
      });
      
      // FIXED: Only fetch fresh data if we haven't tried AND cache miss occurred
      // Remove the containers.length === 0 condition to prevent loop
      if (!data.fromCache && !hasTriedFresh) {
        redirectStatus = 'Loading collection data...';
        console.log('Fetching fresh collection data due to cache miss');
        hasTriedFresh = true; // PREVENT MULTIPLE ATTEMPTS
        
        // Force fresh data by invalidating first
        AppDataManager.invalidateCollection(collectionId);
        const freshData = await AppDataManager.ensureCollectionData(collectionId);
        
        collection = freshData.collection;
        containers = freshData.containers;
        
        console.log('Fresh data loaded:', {
          containerCount: containers?.length || 0,
          collectionName: collection?.name
        });
      }
      
      // No containers: show create UI (this is valid end state, not an error)
      if (!containers || containers.length === 0) {
        console.log('Collection is empty, showing create UI');
        redirectStatus = 'No notes found. Please create your first note.';
        isRedirecting = false;
        return; // EXIT - don't try to fetch again
      }
      
      // Containers exist: redirect to appropriate one
      let targetContainerId: string;
      
      try {
        const lastVisitedId = await UserService.getLastVisitedContainerId();
        
        if (lastVisitedId && containers.some(c => c.id === lastVisitedId)) {
          targetContainerId = lastVisitedId;
          redirectStatus = `Opening last visited note...`;
        } else {
          targetContainerId = containers[0].id;
          redirectStatus = `Opening first note...`;
          UserService.updateLastVisitedContainer(targetContainerId).catch(console.warn);
        }
      } catch (error) {
        targetContainerId = containers[0].id;
        redirectStatus = `Opening first note...`;
      }
      
      const targetUrl = `/app/collections/${collectionId}/containers/${targetContainerId}`;
      console.log('Redirecting to:', targetUrl);
      
      await goto(targetUrl, { replaceState: true });
      
    } catch (error) {
      console.error('Collection redirect failed:', error);
      redirectStatus = 'Error loading collection. Please try again.';
      isRedirecting = false;
    }
  }
  
  async function createFirstNote() {
    try {
      redirectStatus = 'Creating your first note...';
      
      const newContainer = await NoteService.createSimpleNoteContainer(
        data.collectionId,
        'My First Note'
      );
      
      // Update cache using AppDataManager
      AppDataManager.invalidateCollection(data.collectionId);
      await AppDataManager.ensureCollectionData(data.collectionId);
      
      // Update last visited
      UserService.updateLastVisitedContainer(newContainer.id).catch(console.warn);
      
      // Navigate to new container
      const targetUrl = `/app/collections/${data.collectionId}/containers/${newContainer.id}`;
      await goto(targetUrl, { replaceState: true });
      
    } catch (error) {
      console.error('Failed to create first note:', error);
      redirectStatus = 'Failed to create note. Please try again.';
      isRedirecting = false;
    }
  }
</script>

<svelte:head>
  <title>{data.collection?.name || 'Loading...'} - Jottr</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="max-w-md w-full mx-auto p-6">
    
    {#if isRedirecting}
      <!-- Component-level loading (not SvelteKit) -->
      <div class="text-center">
        <LoadingSpinner />
        <h2 class="mt-4 text-lg font-semibold text-gray-800">
          {data.collection?.name || 'Loading Collection...'}
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          {redirectStatus}
        </p>
      </div>
      
    {:else if !data.containers || data.containers.length === 0}
      <!-- Empty collection state -->
      <div class="text-center">
        <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
        </div>
        
        <h2 class="text-xl font-semibold text-gray-800 mb-2">
          Welcome to {data.collection?.name || 'Your Collection'}
        </h2>
        
        <p class="text-gray-600 mb-6">
          This collection is empty. Create your first note to get started!
        </p>
        
        <button 
          on:click={createFirstNote}
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Create First Note
        </button>
        
        <div class="mt-4">
          <a 
            href="/app" 
            class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            ← Back to Collections
          </a>
        </div>
      </div>
      
    {:else}
      <!-- Error state -->
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
        <p class="text-gray-600 mb-6">{redirectStatus}</p>
        <button 
          on:click={() => handleCollectionRedirect()}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    {/if}
    
  </div>
</div>