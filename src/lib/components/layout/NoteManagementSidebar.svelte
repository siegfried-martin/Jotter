<!-- src/lib/components/layout/NoteManagementSidebar.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SortableNoteContainerList from '$lib/components/notes/SortableNoteContainerList.svelte';
  import { useNoteContainerDnD } from '$lib/composables/useNoteContainerDnD';
  import type { NoteContainer } from '$lib/types';

  export let containers: NoteContainer[] = [];
  export let selectedContainer: NoteContainer | null = null;
  export let collectionId: string; // Required for drag & drop

  let isCollapsed = false;

  const dispatch = createEventDispatcher<{
    selectContainer: NoteContainer;
    createNew: void;
    deleteContainer: string;
    containersReordered: NoteContainer[]; // New event for reorder updates
  }>();

  // Initialize drag & drop functionality
  const dnd = useNoteContainerDnD({
    collectionId,
    onSuccess: (updatedContainers) => {
      console.log('✅ Containers reordered successfully');
      dispatch('containersReordered', updatedContainers);
    },
    onError: (error) => {
      console.error('❌ Reorder failed:', error);
      // You could show a toast notification here
    }
  });

  function handleSelectContainer(event: CustomEvent<NoteContainer>) {
    dispatch('selectContainer', event.detail);
  }

  function handleCreateNew() {
    dispatch('createNew');
  }

  function handleToggleCollapse(event: CustomEvent<boolean>) {
    isCollapsed = event.detail;
  }

  function handleDeleteContainer(event: CustomEvent<string>) {
    dispatch('deleteContainer', event.detail);
  }

  function handleReorder(event: CustomEvent<{ fromIndex: number; toIndex: number }>) {
    const { fromIndex, toIndex } = event.detail;
    dnd.handleReorder(fromIndex, toIndex);
  }
</script>

<SortableNoteContainerList 
  {containers}
  {selectedContainer}
  {isCollapsed}
  {collectionId}
  on:selectContainer={handleSelectContainer}
  on:createNew={handleCreateNew}
  on:toggleCollapse={handleToggleCollapse}
  on:deleteContainer={handleDeleteContainer}
  on:reorder={handleReorder}
/>