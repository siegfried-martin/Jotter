<!-- src/lib/components/layout/NoteManagementSidebar.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import NoteContainerList from '$lib/components/NoteContainerList.svelte';

  export let containers: any[] = [];
  export let selectedContainer: any = null;

  let isCollapsed = false;

  const dispatch = createEventDispatcher<{
    selectContainer: any;
    createNew: void;
    deleteContainer: string;
  }>();

  function handleSelectContainer(event: CustomEvent<any>) {
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
</script>

<NoteContainerList 
  {containers}
  {selectedContainer}
  {isCollapsed}
  on:selectContainer={handleSelectContainer}
  on:createNew={handleCreateNew}
  on:toggleCollapse={handleToggleCollapse}
  on:deleteContainer={handleDeleteContainer}
/>