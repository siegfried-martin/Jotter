<!-- src/routes/app/collections/[collection_id]/containers/[container_id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { noteStore, noteActions } from '$lib/stores/noteStore';
  
  // Composables
  import { useContainerPage } from '$lib/composables/useContainerPage';
  import { useContainerEventHandlers } from '$lib/composables/useContainerEventHandlers';
  import { useContainerDragBehaviors } from '$lib/composables/useContainerDragBehaviors';
  
  // Components
  import ContainerPageLayout from '$lib/components/containers/ContainerPageLayout.svelte';
  
  // Types
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  // ===== SIMPLE APPROACH: Track last processed data =====
  let lastProcessedDataKey = '';
  
  // ===== REACTIVE STORE ACCESS =====
  
  $: storeValues = {
    noteStore: $noteStore,
    currentCollectionId: $page.params.collection_id,
    currentContainerId: $page.params.container_id,
    currentCollection: null
  };
  
  $: ({ containers, selectedContainer, selectedContainerSections, loading } = $noteStore);
  
  // ===== INITIALIZE COMPOSABLES =====
  
  const containerPage = useContainerPage(data);
  const { pageManager, noteOperations } = containerPage;
  
  function getStoreValues() {
    return storeValues;
  }
  
  const eventHandlers = useContainerEventHandlers(pageManager, noteOperations, getStoreValues);
  
  const { sectionBehavior, containerBehavior } = useContainerDragBehaviors(
    pageManager,
    getStoreValues,
    containerPage.reorderArray,
    eventHandlers.handleCrossContainerMove
  );
  
  // ===== FIXED REACTIVE STATEMENT WITH TIMING =====
  
  // ✅ FIXED: Set container and sections together to avoid clearing
  $: if (data.container && data.sections !== undefined) {
    const dataKey = `${data.container.id}-${data.sections.length}`;
    
    if (dataKey !== lastProcessedDataKey) {
      const timestamp = new Date().toISOString();
      console.log('🔄 [PAGE] Processing new page data at', timestamp, ':', {
        containerTitle: data.container.title,
        containerId: data.container.id,
        sectionsCount: data.sections.length
      });
      
      lastProcessedDataKey = dataKey;
      
      // ✅ FIXED: Use atomic action to set both container and sections together
      noteActions.setSelectedContainerWithSections(data.container, data.sections);
      
      console.log('✅ [PAGE] Store updated - container and sections set atomically at', new Date().toISOString());
    }
  }
  
  // ===== DEBUG REACTIVE STATEMENTS =====
  
  // Track when store values change
  $: {
    const timestamp = new Date().toISOString();
    console.log('🔍 [PAGE] Store values reactive at', timestamp, ':', {
      selectedContainer: selectedContainer?.title || 'none',
      selectedContainerId: selectedContainer?.id || 'none',
      selectedSections: selectedContainerSections?.length || 0,
      currentContainerId: $page.params.container_id
    });
  }
  
  // Track when storeValues object changes
  $: {
    const timestamp = new Date().toISOString();
    console.log('🔍 [PAGE] storeValues reactive at', timestamp, ':', {
      currentCollectionId: storeValues.currentCollectionId,
      currentContainerId: storeValues.currentContainerId,
      hasCurrentCollection: !!storeValues.currentCollection
    });
  }
  
  // Create keyboard handler
  $: handleKeydown = eventHandlers.createKeyboardHandler();
  
  // Update current collection in storeValues
  $: storeValues.currentCollection = pageManager.getCurrentCollection();
  
  // ===== LIFECYCLE =====
  
  onMount(async () => {
    await containerPage.initialize();
  });
  
  // ===== DEBUG =====
  $: console.log('🔧 Store state:', {
    selected: selectedContainer?.title || 'none',
    sections: selectedContainerSections?.length || 0,
    pageData: `${data.container?.title || 'none'} (${data.sections?.length || 0})`
  });
</script>

<!-- Layout Component -->
<ContainerPageLayout
  {containers}
  {selectedContainer}
  {selectedContainerSections}
  {loading}
  currentCollectionId={storeValues.currentCollectionId}
  currentContainerId={storeValues.currentContainerId}
  currentCollection={storeValues.currentCollection}
  {sectionBehavior}
  {containerBehavior}
  
  on:keydown={(e) => handleKeydown(e.detail)}
  on:selectContainer={(e) => pageManager.selectContainer(e.detail)}
  on:createNew={eventHandlers.createNewNote}
  on:deleteContainer={eventHandlers.deleteContainer}
  on:containersReordered={eventHandlers.handleContainersReordered}
  on:crossContainerDrop={eventHandlers.handleCrossContainerDrop}
  on:refresh={pageManager.refreshNotes}
  on:updateTitle={eventHandlers.handleTitleUpdate}
  on:edit={eventHandlers.handleEdit}
  on:deleteSection={eventHandlers.deleteSection}
  on:checkboxChange={eventHandlers.handleCheckboxChange}
  on:titleSave={eventHandlers.handleSectionTitleSave}
  on:createSection={eventHandlers.createSection}
/>

<!-- Simple Debug -->
<div class="fixed top-20 left-4 bg-black text-white p-2 text-xs font-mono z-50">
  <div>Selected: {selectedContainer?.title || 'none'}</div>
  <div>Sections: {selectedContainerSections?.length || 0}</div>
  <div>Page: {data.container?.title || 'none'} ({data.sections?.length || 0})</div>
</div>