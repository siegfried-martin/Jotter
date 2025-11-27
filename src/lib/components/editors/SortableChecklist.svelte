<!-- src/lib/components/editors/SortableChecklist.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SortableList from '../ui/SortableList.svelte';
  import SortableChecklistItem from './SortableChecklistItem.svelte';
  import type { ChecklistItem } from '$lib/types';
  import { isTouchDevice } from '$lib/utils/deviceUtils';

  export let items: ChecklistItem[] = [];
  export let isMobile: boolean = false;

  const dispatch = createEventDispatcher<{
    itemsChanged: ChecklistItem[];
    addItem: { index: number };
    removeItem: { index: number };
    updateItem: { index: number; item: ChecklistItem };
  }>();

  function handleReorder(event: CustomEvent<ChecklistItem[]>) {
    dispatch('itemsChanged', event.detail);
  }

  function handleAddItem(event: CustomEvent<{ index: number }>) {
    dispatch('addItem', event.detail);
  }

  function handleRemoveItem(event: CustomEvent<{ index: number }>) {
    dispatch('removeItem', event.detail);
  }

  function handleUpdateItem(event: CustomEvent<{ index: number; item: ChecklistItem }>) {
    dispatch('updateItem', event.detail);
  }
</script>

<SortableList
  {items}
  direction="vertical"
  spacing="space-y-2"
  containerClass={isMobile ? "w-full" : "lg:w-full"}
  disabled={$isTouchDevice}
  on:reorder={handleReorder}
>
  <svelte:fragment slot="default" let:item let:index>
    <SortableChecklistItem 
      {item}
      {index}
      {isMobile}
      on:addItem={handleAddItem}
      on:removeItem={handleRemoveItem}
      on:updateItem={handleUpdateItem}
    />
  </svelte:fragment>
</SortableList>