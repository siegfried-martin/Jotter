<!-- src/lib/components/containers/ContainerList.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { dragStore } from '$lib/stores/dragStore';
  import ContainerItem from './ContainerItem.svelte';
  import type { NoteContainer } from '$lib/types';
  
  export let containers: NoteContainer[] = [];
  export let selectedContainer: NoteContainer | null = null;
  export let isCollapsed = true;
  
  let isReordering = false;
  
  const dispatch = createEventDispatcher<{
    selectContainer: NoteContainer;
    deleteContainer: string;
    reorder: { fromIndex: number; toIndex: number };
    crossContainerDrop: {
      sectionId: string;
      fromContainer: string;
      toContainer: string;
    };
  }>();
  
  // Transform containers for dnd
  $: dndItems = [...containers];
  $: if (containers) dndItems = [...containers];
  
  // Check if we're receiving a section drag
  $: isReceivingSectionDrag = $dragStore.isDragging && $dragStore.draggedItem;
  
  // DnD Configuration
  $: dndOptions = {
    flipDurationMs: 200,
    dropTargetStyle: {
      outline: '2px dashed #3B82F6',
      backgroundColor: '#EFF6FF'
    }
  };
  
  function handleDndConsider(e: CustomEvent) {
    if (!isReceivingSectionDrag) {
      dndItems = e.detail.items;
    }
  }
  
  function handleDndFinalize(e: CustomEvent) {
    if (isReceivingSectionDrag) return;
    
    const newItems = e.detail.items;
    const oldIds = containers.map(c => c.id);
    const newIds = newItems.map((item: any) => item.id);
    
    let fromIndex = -1;
    let toIndex = -1;
    
    for (let i = 0; i < newIds.length; i++) {
      const oldPosition = oldIds.indexOf(newIds[i]);
      if (oldPosition !== i) {
        fromIndex = oldPosition;
        toIndex = i;
        break;
      }
    }
    
    if (fromIndex !== -1 && toIndex !== -1) {
      isReordering = true;
      dispatch('reorder', { fromIndex, toIndex });
    }
  }
  
  $: if (containers && isReordering) {
    isReordering = false;
  }
  
  function handleSelectContainer(event: CustomEvent<NoteContainer>) {
    dispatch('selectContainer', event.detail);
  }
  
  function handleDeleteContainer(event: CustomEvent<string>) {
    dispatch('deleteContainer', event.detail);
  }
  
  function handleCrossContainerDrop(event: CustomEvent<{
    sectionId: string;
    fromContainer: string;
    toContainer: string;
  }>) {
    dispatch('crossContainerDrop', event.detail);
  }
</script>

{#if isReceivingSectionDrag}
  <!-- When receiving section drag, disable container DnD -->
  <div class="space-y-2">
    {#each containers as container (container.id)}
      <ContainerItem
        {container}
        isSelected={selectedContainer?.id === container.id}
        {isCollapsed}
        on:select={handleSelectContainer}
        on:delete={handleDeleteContainer}
        on:crossContainerDrop={handleCrossContainerDrop}
      />
    {/each}
  </div>
{:else}
  <!-- Normal container DnD mode -->
  <div 
    class="space-y-2"
    use:dndzone={{ items: dndItems, ...dndOptions }}
    on:consider={handleDndConsider}
    on:finalize={handleDndFinalize}
  >
    {#each dndItems as container (container.id)}
      <ContainerItem
        {container}
        isSelected={selectedContainer?.id === container.id}
        {isCollapsed}
        on:select={handleSelectContainer}
        on:delete={handleDeleteContainer}
        on:crossContainerDrop={handleCrossContainerDrop}
      />
    {/each}
  </div>
{/if}

{#if dndItems.length === 0 && !isCollapsed}
  <div class="text-center text-gray-500 text-sm py-8">
    No notes yet.<br>Click "New Note" to get started!
  </div>
{/if}