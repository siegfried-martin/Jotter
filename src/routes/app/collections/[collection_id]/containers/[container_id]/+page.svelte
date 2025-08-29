<!-- src/routes/app/collections/[collection_id]/containers/[container_id]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { currentContainerStore, AppDataManager } from '$lib/stores/appDataStore';
  import ContainerPageLayout from '$lib/components/containers/ContainerPageLayout.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { SectionService } from '$lib/services/sectionService';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let lastContainerId = '';
  
  // Reactive initialization - runs when container ID changes
  $: if (data.containerId && data.containerId !== lastContainerId) {
    lastContainerId = data.containerId;
    initializeContainer();
  }
  
  async function initializeContainer() {
    console.log('Container page: Initializing', {
      collectionId: data.collectionId,
      containerId: data.containerId,
      fromCache: data.fromCache,
      needsLoad: data.needsLoad,
      needsLoadSections: data.needsLoadSections
    });
    
    // Set full context (collection + container)
    AppDataManager.setCurrentContext(data.collectionId, data.containerId);
    
    // Handle different loading scenarios
    if (data.needsLoad) {
      console.log('Container page: Full cache miss, loading everything');
      await AppDataManager.ensureContainerSections(data.collectionId, data.containerId);
    } else if (data.needsLoadSections) {
      console.log('Container page: Have container, loading sections only');
      await AppDataManager.ensureContainerSections(data.collectionId, data.containerId);
    } else {
      console.log('Container page: Full cache hit, no loading needed');
    }
  }
  
  // Event handlers for UI interactions
  async function handleSelectContainer(event) {
    const container = event.detail;
    console.log('Navigating to container:', container.title);
    await goto(`/app/collections/${data.collectionId}/containers/${container.id}`);
  }
  
  async function handleCreateSection(event) {
    const newSection = event.detail;
    const currentSections = $currentContainerStore.sections || [];
    
    // Optimistic update first
    const updatedSections = [...currentSections, newSection];
    AppDataManager.updateSectionsOptimistically(
      data.collectionId,
      data.containerId, 
      updatedSections
    );
    
    try {
      // Background API call
      await SectionService.createSection(newSection);
      console.log('Section created successfully');
    } catch (error) {
      console.error('Failed to create section:', error);
      // Rollback optimistic update
      AppDataManager.updateSectionsOptimistically(
        data.collectionId,
        data.containerId,
        currentSections
      );
    }
  }
  
  function handleOptimisticSectionUpdate(event) {
    const { sections } = event.detail;
    AppDataManager.updateSectionsOptimistically(
      data.collectionId,
      data.containerId,
      sections
    );
  }
  
  // Handle section edit clicks
  async function handleEditSection(event) {
    const sectionId = event.detail;
    console.log('Navigating to edit section:', sectionId);
    await goto(`/app/collections/${data.collectionId}/containers/${data.containerId}/edit/${sectionId}`);
  }
  
  // Handle section title saves
  async function handleSectionTitleSave(event) {
    const { sectionId, title } = event.detail;
    console.log('Saving section title from +page.svelte:', { sectionId, title });
    
    const currentSections = $currentContainerStore.sections || [];
    const originalSection = currentSections.find(s => s.id === sectionId);
    
    if (!originalSection) {
      console.error('Section not found for title save:', sectionId);
      return;
    }
    
    // Optimistic update - immediately update the UI
    const updatedSections = currentSections.map(section => 
      section.id === sectionId ? { ...section, title } : section
    );
    
    AppDataManager.updateSectionsOptimistically(
      data.collectionId,
      data.containerId,
      updatedSections
    );
    
    try {
      // Background API call
      await SectionService.updateSection(sectionId, {
        title: title
      });
      
      console.log('Section title saved successfully');
    } catch (error) {
      console.error('Failed to save section title:', error);
      
      // Rollback optimistic update on error
      AppDataManager.updateSectionsOptimistically(
        data.collectionId,
        data.containerId,
        currentSections
      );
    }
  }
</script>

{#if $currentContainerStore.loading}
  <!-- Component-level loading -->
  <div class="flex h-screen bg-gray-50 items-center justify-center">
    <div class="text-center">
      <LoadingSpinner />
      <p class="mt-4 text-gray-600">Loading container...</p>
      {#if $currentContainerStore.error}
        <p class="mt-2 text-red-600 text-sm">{$currentContainerStore.error}</p>
      {/if}
    </div>
  </div>
{:else if $currentContainerStore.container}
  <!-- Normal container display -->
  <ContainerPageLayout
    containers={$currentContainerStore.allContainers}
    selectedContainer={$currentContainerStore.container}
    selectedContainerSections={$currentContainerStore.sections}
    loading={$currentContainerStore.loading}
    currentCollectionId={data.collectionId}
    currentContainerId={data.containerId}
    currentCollection={$currentContainerStore.collection}
    
    on:selectContainer={handleSelectContainer}
    on:createSection={handleCreateSection}
    on:optimisticUpdate={handleOptimisticSectionUpdate}
    on:edit={handleEditSection}
    on:titleSave={handleSectionTitleSave}
  />
{:else}
  <!-- Error/not found state -->
  <div class="flex h-screen bg-gray-50 items-center justify-center">
    <div class="text-center">
      <p class="text-gray-600">Container not found</p>
      {#if $currentContainerStore.error}
        <p class="mt-2 text-red-600 text-sm">{$currentContainerStore.error}</p>
      {/if}
      <button 
        on:click={() => goto(`/app/collections/${data.collectionId}`)}
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Back to Collection
      </button>
    </div>
  </div>
{/if}