<!-- src/routes/app/collections/[collection_id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { NoteService } from '$lib/services/noteService';
  import { UserService } from '$lib/services/userService';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let isRedirecting = false;
  let redirectStatus = 'Loading...';
  
  onMount(async () => {
    await handleCollectionRedirect();
  });
  
  async function handleCollectionRedirect() {
    try {
      isRedirecting = true;
      
      const { collection, containers, lastVisitedContainerId, collectionId } = data;
      
      console.log('🔄 Collection redirect logic:', {
        collectionId,
        containerCount: containers.length,
        lastVisitedContainerId,
        currentUrl: $page.url.href
      });
      
      // If no containers exist, show create first note state
      if (containers.length === 0) {
        console.log('📝 Collection is empty, showing create first note UI');
        
        // If we have a last visited container, it's in a different collection
        if (lastVisitedContainerId) {
          console.log('🔄 Last visited container is in different collection, checking...');
          
          try {
            // Check which collection the last visited container belongs to
            const containerCollectionId = await UserService.getContainerCollection(lastVisitedContainerId);
            
            if (containerCollectionId && containerCollectionId !== collectionId) {
              console.log('🚀 Redirecting to correct collection for last visited container');
              redirectStatus = 'Redirecting to your last visited note...';
              
              // Redirect to the correct collection with the container
              const correctUrl = `/app/collections/${containerCollectionId}/containers/${lastVisitedContainerId}`;
              await goto(correctUrl, { replaceState: true });
              return; // Exit early
            }
          } catch (error) {
            console.warn('⚠️ Could not check container collection:', error);
            // Continue with empty collection logic
          }
        }
        
        redirectStatus = 'No notes found. Please create your first note.';
        isRedirecting = false;
        return;
      }
      
      // Collection has containers - determine target
      let targetContainerId: string;
      
      if (lastVisitedContainerId) {
        // Check if last visited container exists IN THIS COLLECTION
        const lastVisitedContainer = containers.find(c => c.id === lastVisitedContainerId);
        
        if (lastVisitedContainer) {
          targetContainerId = lastVisitedContainerId;
          redirectStatus = `Redirecting to last visited note: ${lastVisitedContainer.title}...`;
          console.log('✅ Using last visited container in this collection:', lastVisitedContainer.title);
        } else {
          console.log('🔄 Last visited container not in this collection, checking if it exists elsewhere...');
          
          try {
            // Check if the last visited container exists in a different collection
            const containerCollectionId = await UserService.getContainerCollection(lastVisitedContainerId);
            
            if (containerCollectionId && containerCollectionId !== collectionId) {
              console.log('🚀 Last visited container found in different collection, redirecting...');
              redirectStatus = 'Redirecting to your last visited note...';
              
              // Redirect to the correct collection
              const correctUrl = `/app/collections/${containerCollectionId}/containers/${lastVisitedContainerId}`;
              await goto(correctUrl, { replaceState: true });
              return; // Exit early
            }
          } catch (error) {
            console.warn('⚠️ Could not check container collection:', error);
          }
          
          // Last visited container doesn't exist or error occurred, use first container
          targetContainerId = containers[0].id;
          redirectStatus = `Redirecting to first note: ${containers[0].title}...`;
          console.log('⚠️ Using first container in this collection');
          
          // Update last visited to the first container in this collection
          try {
            await UserService.updateLastVisitedContainer(targetContainerId);
            console.log('✅ Updated last visited to first container in this collection');
          } catch (error) {
            console.warn('⚠️ Could not update last visited container:', error);
          }
        }
      } else {
        // No last visited container, use first one
        targetContainerId = containers[0].id;
        redirectStatus = `Redirecting to first note: ${containers[0].title}...`;
        console.log('ℹ️ No last visited container, using first container');
        
        // Set this as the last visited
        try {
          await UserService.updateLastVisitedContainer(targetContainerId);
          console.log('✅ Set first container as last visited');
        } catch (error) {
          console.warn('⚠️ Could not set last visited container:', error);
        }
      }
      
      // Redirect to container route in this collection
      const targetUrl = `/app/collections/${collectionId}/containers/${targetContainerId}`;
      console.log('🚀 Redirecting to container in this collection:', targetUrl);
      
      await goto(targetUrl, { replaceState: true });
      
    } catch (error) {
      console.error('❌ Collection redirect failed:', error);
      redirectStatus = 'Error loading collection. Please try again.';
      isRedirecting = false;
    }
  }
  
  async function createFirstNote() {
    try {
      redirectStatus = 'Creating your first note...';
      
      // Create new note container
      const newContainer = await NoteService.createSimpleNoteContainer(
        data.collectionId,
        'My First Note'
      );
      
      console.log('✅ Created first note:', newContainer.title);
      
      // Update last visited
      await UserService.updateLastVisitedContainer(newContainer.id);
      
      // Redirect to new container
      const targetUrl = `/app/collections/${data.collectionId}/containers/${newContainer.id}`;
      await goto(targetUrl, { replaceState: true });
      
    } catch (error) {
      console.error('❌ Failed to create first note:', error);
      redirectStatus = 'Failed to create note. Please try again.';
      isRedirecting = false;
    }
  }
</script>

<svelte:head>
  <title>{data.collection.name} - Jotter</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="max-w-md w-full mx-auto p-6">
    
    {#if isRedirecting}
      <!-- Redirecting State -->
      <div class="text-center">
        <LoadingSpinner />
        <h2 class="mt-4 text-lg font-semibold text-gray-800">
          {data.collection.name}
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          {redirectStatus}
        </p>
      </div>
      
    {:else if data.containers.length === 0}
      <!-- No Containers State -->
      <div class="text-center">
        <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
        </div>
        
        <h2 class="text-xl font-semibold text-gray-800 mb-2">
          Welcome to {data.collection.name}
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
      <!-- Error State -->
      <div class="text-center">
        <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        
        <h2 class="text-xl font-semibold text-gray-800 mb-2">
          Something went wrong
        </h2>
        
        <p class="text-gray-600 mb-6">
          {redirectStatus}
        </p>
        
        <button 
          on:click={handleCollectionRedirect}
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    {/if}
    
  </div>
</div>