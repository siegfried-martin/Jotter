<!-- src/lib/components/editors/ChecklistEditor.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import type { ChecklistItem } from '$lib/types';
  import SortableChecklist from './SortableChecklist.svelte';
  
  export let checklistData: ChecklistItem[] = [];
  
  const dispatch = createEventDispatcher<{
    dataChange: ChecklistItem[];
  }>();
  
  let items: ChecklistItem[] = [];
  let isMobile = false;
  
  // Initialize from props - ensure at least one empty item
  $: if (checklistData.length === 0) {
    items = [{ text: '', checked: false }];
  } else {
    items = [...checklistData];
  }
  
  // Progress calculation
  $: completedCount = items.filter(item => item.checked && item.text.trim()).length;
  $: totalCount = items.filter(item => item.text.trim()).length;
  $: progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Mobile detection
  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 768;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Focus the first input if it's empty
    if (items.length === 1 && !items[0].text.trim()) {
      focusInput(0);
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  });
  
  async function focusInput(index: number) {
    await tick();
    const input = document.querySelector(`[data-input-index="${index}"]`) as HTMLInputElement;
    if (input) {
      input.focus();
      if (!input.value.trim()) {
        input.select();
      }
    }
  }
  
  function handleItemsChanged(event: CustomEvent<ChecklistItem[]>) {
    items = event.detail;
    updateData();
  }
  
  function handleAddItem(event: CustomEvent<{ index: number }>) {
    const insertIndex = event.detail.index + 1;
    const newItem: ChecklistItem = { text: '', checked: false };
    items = [
      ...items.slice(0, insertIndex),
      newItem,
      ...items.slice(insertIndex)
    ];
    updateData();
    tick().then(() => focusInput(insertIndex));
  }
  
  function handleRemoveItem(event: CustomEvent<{ index: number }>) {
    const index = event.detail.index;
    if (items.length === 1) {
      // Keep at least one item, just clear it
      items[0] = { text: '', checked: false };
    } else {
      items = items.filter((_, i) => i !== index);
      if (index > 0) {
        tick().then(() => focusInput(index - 1));
      }
    }
    updateData();
  }
  
  function handleUpdateItem(event: CustomEvent<{ index: number; item: ChecklistItem }>) {
    const { index, item } = event.detail;
    items[index] = item;
    updateData();
  }
  
  function addNewItem() {
    const newItem: ChecklistItem = { text: '', checked: false };
    items = [...items, newItem];
    updateData();
    tick().then(() => focusInput(items.length - 1));
  }
  
  function handleGlobalKeyDown(event: KeyboardEvent) {
    // Enter anywhere should add new item if no input is focused
    if (event.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
      event.preventDefault();
      addNewItem();
    }
  }
  
  function updateData() {
    dispatch('dataChange', items);
  }
</script>

<svelte:window on:keydown={handleGlobalKeyDown} />

<div class="h-full flex flex-col">
  <!-- Progress Header - Hidden on mobile -->
  {#if !isMobile && (totalCount > 0 || items.some(item => item.text.trim()))}
    <div class="mb-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">
          Progress: {completedCount} of {totalCount} completed
        </span>
        <span class="text-sm text-gray-500">{progressPercentage}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style="width: {progressPercentage}%"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Sortable Checklist Items -->
  <div class="flex-1 overflow-y-auto pr-2">
    <SortableChecklist 
      {items}
      {isMobile}
      on:itemsChanged={handleItemsChanged}
      on:addItem={handleAddItem}
      on:removeItem={handleRemoveItem}
      on:updateItem={handleUpdateItem}
    />
  </div>
  
  <!-- Add Item Footer -->
  <div class="mt-6 pt-4 border-t border-gray-200">
    <button 
      on:click={addNewItem}
      class="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 w-full md:w-auto"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      Add new item
      {#if !isMobile}
        <span class="text-gray-400 text-xs ml-2">or press Enter</span>
      {/if}
    </button>
    
    <!-- Keyboard Hints - Hidden on mobile -->
    {#if !isMobile}
      <div class="mt-2 text-xs text-gray-500">
        <div>⌨️ Shortcuts: Enter = new item • Backspace on empty = delete • Drag handle to reorder</div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Enhanced mobile styles */
  @media (max-width: 767px) {
    :global(.checklist-item) {
      padding: 0.5rem !important;
      gap: 0.5rem !important;
    }
    
    :global(.checklist-item input[type="text"]) {
      font-size: 14px !important;
      padding: 0.25rem 0.5rem !important;
    }
    
    :global(.checklist-item .priority-controls) {
      display: none !important;
    }
  }
</style>