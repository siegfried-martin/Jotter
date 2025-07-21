<!-- src/lib/components/ui/SortableList.svelte -->
<!-- Reusable drag & drop wrapper for any list of items -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';

  // Generic props
  export let items: any[] = [];
  export let direction: 'vertical' | 'horizontal' = 'vertical';
  export let spacing: string = 'space-y-4'; // Tailwind spacing class
  export let containerClass: string = '';
  export let flipDuration: number = 200;
  export let disabled: boolean = false;
  export let dragHandle: string | undefined = undefined; // CSS selector for drag handle

  const dispatch = createEventDispatcher<{
    reorder: any[];
  }>();

  // Add IDs for dnd-action if items don't have them
  $: dndItems = items.map((item, index) => {
    // If item already has an id, use it; otherwise create one
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return item;
    }
    return { id: index, ...item };
  });

  function handleDndConsider(e: CustomEvent) {
    dndItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    dndItems = e.detail.items;
    
    // Extract items without the temporary ID and dispatch
    const reorderedItems = dndItems.map(item => {
      if (typeof item === 'object' && 'id' in item && typeof item.id === 'number') {
        // Remove temporary numeric ID we added
        const { id, ...rest } = item;
        return rest;
      }
      return item;
    });
    
    dispatch('reorder', reorderedItems);
  }

  // Dynamic classes based on direction
  $: flexDirection = direction === 'horizontal' ? 'flex-row' : 'flex-col';
  $: spacingClass = direction === 'horizontal' ? spacing.replace('y-', 'x-') : spacing;
  $: containerClasses = `flex ${flexDirection} ${spacingClass} ${containerClass}`.trim();

  // Simple dnd options - we'll handle drag enabling through events
  $: dndOptions = {
    items: dndItems,
    flipDurationMs: flipDuration,
    dropTargetStyle: {},
    dragDisabled: disabled
  };
</script>

<div 
  class={containerClasses}
  use:dndzone={dndOptions}
  on:consider={handleDndConsider}
  on:finalize={handleDndFinalize}
>
  {#each dndItems as item, index (item.id)}
    <slot {item} {index} />
  {/each}
</div>