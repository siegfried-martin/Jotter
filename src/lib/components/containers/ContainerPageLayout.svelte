<!-- src/lib/components/containers/ContainerPageLayout.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CollectionPageHeader from '$lib/components/layout/CollectionPageHeader.svelte';
  import SectionGridWrapper from '$lib/components/sections/SectionGridWrapper.svelte';
  import ContainerSidebar from '$lib/components/containers/ContainerSidebar.svelte';
  import CreateNoteSectionForm from '$lib/components/sections/CreateNoteSectionForm.svelte';
  
  // Props - removed unused drag behavior props
  export let containers: any[];
  export let selectedContainer: any;
  export let selectedContainerSections: any[];
  export let loading: boolean;
  export let currentCollectionId: string;
  export let currentContainerId: string;
  export let currentCollection: any;
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Event forwarding helpers
  function forwardEvent(eventName: string) {
    return (event: CustomEvent) => dispatch(eventName, event.detail);
  }

  function forwardContainerReorder(event: CustomEvent) {
    console.log('🔥 ContainerPageLayout forwarding containersReordered:', event.detail);
    dispatch('containersReordered', event.detail);
  }

  function handleDeleteSection(event: CustomEvent<string>) {
    console.log('🔥 ContainerPageLayout forwarding deleteSection:', event.detail);
    dispatch('delete', event.detail);
  }
</script>

<svelte:window on:keydown={forwardEvent('keydown')} />

<!-- Removed nested DragProvider - parent layout handles drag context -->
<!-- Main Content Layout -->
<div class="flex h-screen bg-gray-50 relative" style="height: calc(100vh - 4rem);">
  
  <!-- Container Sidebar -->
  <ContainerSidebar 
    {containers}
    {selectedContainer}
    collectionId={currentCollectionId}
    on:selectContainer={forwardEvent('selectContainer')}
    on:createNew={forwardEvent('createNew')}
    on:deleteContainer={forwardEvent('deleteContainer')}
    on:containersReordered={forwardContainerReorder}
    on:crossContainerDrop={forwardEvent('crossContainerDrop')}
  />

  <!-- Main Content Area -->
  <div class="flex-1 p-6 overflow-y-auto" style="padding-bottom: 80px;">
    {#if loading}
      <div class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else}
      <CollectionPageHeader 
        {selectedContainer}
        {loading}
        on:refresh={forwardEvent('refresh')}
        on:updateTitle={forwardEvent('updateTitle')}
      />
      
      <SectionGridWrapper 
        sections={selectedContainerSections}
        collectionName={currentCollection?.name}
        hasSelectedContainer={!!selectedContainer}
        noteContainerId={currentContainerId}
        on:edit={forwardEvent('edit')}
        on:delete={handleDeleteSection}
        on:checkboxChange={forwardEvent('checkboxChange')}
        on:titleSave={forwardEvent('titleSave')}
      />
    {/if}
  </div>

  <!-- Floating Add Section Area -->
  {#if !loading && selectedContainer}
    <div class="floating-add-section">
      <div class="floating-add-section-content">
        <CreateNoteSectionForm on:createSection={forwardEvent('createSection')} />
      </div>
    </div>
  {/if}
</div>

<style>
  .floating-add-section {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 280px; /* Account for sidebar width */
    z-index: 50;
    pointer-events: none; /* Allow clicking through the container */
  }

  .floating-add-section-content {
    background: linear-gradient(to top, rgba(249, 250, 251, 0.95) 60%, transparent);
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(229, 231, 235, 0.8);
    padding: 12px 16px;
    margin: 0 16px 16px 16px;
    border-radius: 8px 8px 0 0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
    pointer-events: auto; /* Re-enable clicks for the content */
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .floating-add-section {
      left: 0; /* Full width on smaller screens */
    }
  }
</style>