<!-- src/routes/app/collections/[collection_id]/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  // Composables
  import { useNoteOperations } from '$lib/composables/useNoteOperations';
  
  // Stores
  import { noteStore, noteActions } from '$lib/stores/noteStore';
  import { collectionStore, collectionActions } from '$lib/stores/collectionStore';
  
  // Services
  import { UserService } from '$lib/services/userService';
  
  // Types
  import type { LayoutData } from './$types';
  import type { NoteContainer } from '$lib/types';
  
  // NEW: DnD System
  import DragProvider from '$lib/dnd/components/DragProvider.svelte';
  import { createContainerDragBehavior } from '$lib/dnd/behaviors/ContainerDragBehavior';
  
  // Components
  import ContainerSidebar from '$lib/components/containers/ContainerSidebar.svelte';
  
  export let data: LayoutData;
  
  // Initialize composables
  const noteOperations = useNoteOperations();
  
  // Reactive values from stores and layout data
  $: ({ containers, selectedContainer, loading } = $noteStore);
  $: currentCollectionId = data.collectionId;
  $: currentCollection = data.collection;
  $: allCollections = data.collections; // NEW: Get all collections for top nav
  
  // Sync layout data with note store
  $: if (data.containers) {
    noteActions.updateContainers(data.containers);
  }
  
  // NEW: Sync collections data with collection store
  $: if (data.collections) {
    collectionActions.setCollections(data.collections);
  }
  
  // NEW: Sync current collection with collection store
  $: if (data.collection) {
    collectionActions.setSelectedCollection(data.collection);
  }
  
  // Get current container ID from URL
  $: currentContainerId = $page.params.container_id || null;
  
  // Sync selected container from URL
  $: if (currentContainerId && containers.length > 0) {
    const containerFromUrl = containers.find(c => c.id === currentContainerId);
    if (containerFromUrl && selectedContainer?.id !== containerFromUrl.id) {
      noteActions.setSelectedContainer(containerFromUrl);
    }
  }

  // Helper function for array reordering
  function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const newArray = [...array];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray;
  }

  // Container drag behavior for reordering
  $: containerBehavior = createContainerDragBehavior(
    // Container reorder handler
    async (fromIndex: number, toIndex: number) => {
      console.log('🎯 Container reorder:', fromIndex, '→', toIndex);
      
      if (fromIndex === toIndex) return;
      
      // Store original order for potential rollback
      const originalContainers = [...containers];
      
      // 1. Optimistically update UI first (prevents flicker)
      const reorderedContainers = reorderArray(containers, fromIndex, toIndex);
      noteActions.updateContainers(reorderedContainers);
      
      try {
        console.log('🚀 Calling NoteService.reorderNoteContainers...');
        
        // 2. Call API service
        const { NoteService } = await import('$lib/services/noteService');
        const updatedContainers = await NoteService.reorderNoteContainers(
          currentCollectionId,
          fromIndex,
          toIndex
        );
        
        console.log('✅ API call successful, server order:', updatedContainers.map(c => c.title));
        
        // 3. Update with server response ONLY if it differs from our optimistic update
        const currentOrder = reorderedContainers.map(c => c.title).join(',');
        const serverOrder = updatedContainers.map(c => c.title).join(',');
        
        if (currentOrder !== serverOrder) {
          console.log('⚠️ Server order differs from optimistic update, using server order');
          noteActions.updateContainers(updatedContainers);
        } else {
          console.log('✅ Optimistic update matches server, no additional update needed');
        }
        
        console.log('✅ Container reorder completed successfully');
        
      } catch (error) {
        console.error('❌ Container reorder failed:', error);
        
        // ROLLBACK optimistic update on error
        console.log('🔄 Rolling back optimistic reorder due to error');
        noteActions.updateContainers(originalContainers);
      }
    }
  );
  
  // ENHANCED: Container selection handler with optimistic updates
  async function handleSelectContainer(event: CustomEvent<NoteContainer>) {
    const container = event.detail;
    console.log('🎯 Container selected:', container.title);
    
    // 1. IMMEDIATE: Optimistically update the UI
    noteActions.setSelectedContainer(container);
    noteActions.setSelectedSections([]); // Clear sections immediately to show loading
    
    // 2. IMMEDIATE: Visual feedback - no delay
    try {
      // Update last visited container (fire and forget)
      UserService.updateLastVisitedContainer(container.id).catch(error => {
        console.warn('⚠️ Could not update last visited container:', error);
      });
      
      // 3. Navigate (this will trigger the page loader)
      await goto(`/app/collections/${currentCollectionId}/containers/${container.id}`);
      
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      // Could revert optimistic update here if needed
    }
  }
  
  // Note operations with bound context
  async function createNewNote() {
    const newContainer = await noteOperations.createNewNote(currentCollectionId);
    if (newContainer) {
      // Navigate to the new container
      await goto(`/app/collections/${currentCollectionId}/containers/${newContainer.id}`);
    }
  }
  
  async function deleteContainer(event: CustomEvent<string>) {
    const containerId = event.detail;
    const containerToDelete = containers.find(c => c.id === containerId);
    
    if (!containerToDelete) return;
    
    // If deleting the currently selected container, we need to navigate away
    const isCurrentContainer = currentContainerId === containerId;
    
    try {
      await noteOperations.deleteContainer(event, containers);
      
      if (isCurrentContainer) {
        // Navigate to first remaining container or collection if none left
        const remainingContainers = containers.filter(c => c.id !== containerId);
        if (remainingContainers.length > 0) {
          await goto(`/app/collections/${currentCollectionId}/containers/${remainingContainers[0].id}`);
        } else {
          await goto(`/app/collections/${currentCollectionId}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to delete container:', error);
    }
  }
  
  // Handle cross-container section drops from sidebar
  async function handleCrossContainerDrop(event: CustomEvent<{ 
    sectionId: string; 
    fromContainer: string; 
    toContainer: string 
  }>) {
    await noteOperations.handleCrossContainerMove(
      event, 
      (container: NoteContainer) => {
        // Navigate to container after cross-container move
        goto(`/app/collections/${currentCollectionId}/containers/${container.id}`);
      }, 
      containers
    );
  }

  onMount(() => {
    console.log('📋 Collection layout mounted:', {
      collectionId: currentCollectionId,
      collectionName: currentCollection.name,
      containerCount: containers.length,
      currentContainerId
    });
  });
</script>

<svelte:head>
  <title>{currentCollection.name} - Jotter</title>
</svelte:head>

<!-- Wrap everything in DragProvider -->
<DragProvider behaviors={[containerBehavior]}>

  <!-- Main Layout with Sidebar -->
  <div class="flex h-screen bg-gray-50 relative" style="height: calc(100vh - 4rem);">
    
    <!-- Persistent Sidebar -->
    <ContainerSidebar 
      {containers}
      {selectedContainer}
      collectionId={currentCollectionId}
      on:selectContainer={handleSelectContainer}
      on:createNew={createNewNote}
      on:deleteContainer={deleteContainer}
      on:containersReordered={() => {}}
      on:crossContainerDrop={handleCrossContainerDrop}
    />

    <!-- Content Area (Child Routes) -->
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>

  </div>

</DragProvider>