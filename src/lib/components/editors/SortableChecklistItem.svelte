<!-- src/lib/components/editors/SortableChecklistItem.svelte -->
<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type { ChecklistItem } from '$lib/types';
  import { isTouchDevice } from '$lib/utils/deviceUtils';

  export let item: ChecklistItem;
  export let index: number;
  export let isMobile: boolean = false;

  const dispatch = createEventDispatcher<{
    addItem: { index: number };
    removeItem: { index: number };
    updateItem: { index: number; item: ChecklistItem };
  }>();

  async function focusInput() {
    await tick();
    const input = document.querySelector(`[data-input-index="${index}"]`) as HTMLInputElement;
    if (input) {
      input.focus();
      if (!input.value.trim()) {
        input.select();
      }
    }
  }

  function handleTextKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      dispatch('addItem', { index });
    } else if (event.key === 'Backspace' && !item.text.trim()) {
      event.preventDefault();
      dispatch('removeItem', { index });
    }
  }

  function updateItem(field: keyof ChecklistItem, value: any) {
    const updatedItem = { ...item, [field]: value };
    dispatch('updateItem', { index, item: updatedItem });
  }

  function getPriorityStyle(priority?: string | null): string {
    switch (priority) {
      case 'high': return 'background-color: #fee2e2; border-left: 4px solid #dc2626;'; // Red
      case 'medium': return 'background-color: #fef3c7; border-left: 4px solid #d97706;'; // Yellow/Amber
      case 'low': return 'background-color: #dbeafe; border-left: 4px solid #2563eb;'; // Blue
      default: return '';
    }
  }

  $: priorityStyle = getPriorityStyle(item.priority);
</script>

<div 
  class="checklist-item flex items-center p-3 rounded-lg transition-all duration-200 cursor-move hover:bg-gray-50"
  class:space-x-2={isMobile}
  class:space-x-3={!isMobile}
  class:bg-gray-50={!item.priority}
  style={priorityStyle}
>
  <!-- Drag Handle - Hidden on touch devices -->
  {#if !$isTouchDevice}
    <div class="drag-handle cursor-grab active:cursor-grabbing flex-shrink-0 text-gray-400 hover:text-gray-600">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
      </svg>
    </div>
  {/if}

  <!-- Checkbox -->
  <input 
    type="checkbox" 
    checked={item.checked}
    on:change={(e) => updateItem('checked', e.currentTarget.checked)}
    class="w-4 h-4 text-blue-600 rounded flex-shrink-0"
    class:w-5={!isMobile}
    class:h-5={!isMobile}
  >

  <!-- Desktop Controls - Now on the LEFT -->
  {#if !isMobile}
    <!-- Date Input -->
    <input 
      type="date" 
      value={item.date || ''}
      on:input={(e) => updateItem('date', e.currentTarget.value || undefined)}
      class="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm flex-shrink-0"
    >
    
    <!-- Priority Selector -->
    <select 
      value={item.priority || ''}
      on:change={(e) => updateItem('priority', e.currentTarget.value || null)}
      class="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm flex-shrink-0"
    >
      <option value="">None</option>
      <option value="low">◦ Low</option>
      <option value="medium">● Medium</option>
      <option value="high">⚡ High</option>
    </select>
  {/if}
  
  <!-- Task Input - Full width (now on the right) -->
  <input 
    type="text" 
    value={item.text}
    on:input={(e) => updateItem('text', e.currentTarget.value)}
    placeholder="Enter task..."
    data-input-index={index}
    class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-0"
    class:text-sm={isMobile}
    class:py-1={isMobile}
    class:px-2={isMobile}
    on:keydown={handleTextKeyDown}
  >
  
  <!-- Remove Button -->
  <button 
    on:click={() => dispatch('removeItem', { index })}
    class="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
    class:p-2={!isMobile}
    title="Remove item"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
    </svg>
  </button>
</div>