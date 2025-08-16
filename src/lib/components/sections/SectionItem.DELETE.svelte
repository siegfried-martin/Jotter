<!-- src/lib/components/sections/SectionItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DraggableItem from '$lib/components/ui/DraggableItem.DELETE.svelte';
  import SectionCard from './SectionCard.svelte';
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let containerIndex: number;
  export let itemIndex: number;
  export let containerId: string;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{
    edit: string;
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
    reorder: {
      itemId: string;
      item: NoteSection;
      fromContainer: string;
      fromIndex: number;
      toContainer: string;
      toIndex: number;
    };
  }>();

  function handleClick(event: CustomEvent<{ item: NoteSection; itemId: string }>) {
    dispatch('edit', event.detail.itemId);
  }

  function handleReorder(event: CustomEvent<{
    itemId: string;
    item: NoteSection;
    fromContainer: string;
    fromIndex: number;
    toContainer: string;
    toIndex: number;
  }>) {
    dispatch('reorder', event.detail);
  }

  // Forward events from SectionCard
  function handleDelete(event: CustomEvent<string>) {
    dispatch('delete', event.detail);
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    dispatch('checkboxChange', event.detail);
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    dispatch('titleSave', event.detail);
  }
</script>

<DraggableItem
  item={section}
  itemId={section.id}
  itemType="section"
  {containerIndex}
  {itemIndex}
  {containerId}
  {disabled}
  on:click={handleClick}
  on:reorder={handleReorder}
>
  <svelte:fragment slot="default" let:item let:isDragging>
    <SectionCard 
      section={item}
      {isDragging}
      on:delete={handleDelete}
      on:checkboxChange={handleCheckboxChange}
      on:titleSave={handleTitleSave}
    />
  </svelte:fragment>
</DraggableItem>