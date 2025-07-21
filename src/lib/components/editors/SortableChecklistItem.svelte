<!-- src/lib/components/editors/SortableChecklistItem.svelte -->
<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import type { ChecklistItem, DateShortcut } from '$lib/types';

  export let item: ChecklistItem;
  export let index: number;

  const dispatch = createEventDispatcher<{
    addItem: { index: number };
    removeItem: { index: number };
    updateItem: { index: number; item: ChecklistItem };
  }>();

  // Date constraints
  $: today = new Date().toISOString().split('T')[0];
  $: nextMonth = (() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  })();

  // Date shortcuts
  const dateShortcuts: DateShortcut[] = [
    { label: 'T', value: new Date().toISOString().split('T')[0], key: 't' },
    { label: 'M', value: new Date(Date.now() + 86400000).toISOString().split('T')[0], key: 'm' },
    { label: 'W', value: new Date(Date.now() + 604800000).toISOString().split('T')[0], key: 'w' }
  ];

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
    // Handle date shortcuts
    else if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      let shortcut = null;
      
      if (key === 't') shortcut = dateShortcuts[0];
      else if (key === 'm') shortcut = dateShortcuts[1];
      else if (key === 'w') shortcut = dateShortcuts[2];
      
      if (shortcut) {
        event.preventDefault();
        setDateShortcut(shortcut.value);
      }
    }
  }

  function handleDateKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      dispatch('addItem', { index });
    }
  }

  function setDateShortcut(dateValue: string) {
    const updatedItem = { ...item, date: dateValue };
    dispatch('updateItem', { index, item: updatedItem });
  }

  function clearDate() {
    const updatedItem = { ...item, date: undefined };
    dispatch('updateItem', { index, item: updatedItem });
  }

  function updateItem(field: keyof ChecklistItem, value: any) {
    const updatedItem = { ...item, [field]: value };
    dispatch('updateItem', { index, item: updatedItem });
  }

  function getPriorityColor(priority?: string | null): string {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  }
</script>

<div class="checklist-item flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 cursor-move">
  <!-- Checkbox -->
  <input 
    type="checkbox" 
    checked={item.checked}
    on:change={(e) => updateItem('checked', e.currentTarget.checked)}
    class="w-5 h-5 text-blue-600 rounded flex-shrink-0"
  >
  
  <!-- Task Input -->
  <input 
    type="text" 
    value={item.text}
    on:input={(e) => updateItem('text', e.currentTarget.value)}
    placeholder="Enter task..."
    data-input-index={index}
    class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-0"
    on:keydown={handleTextKeyDown}
  >
  
  <!-- Date Input with Quick Actions -->
  <div class="flex items-center space-x-1 flex-shrink-0">
    <!-- Quick Date Buttons -->
    {#each dateShortcuts as shortcut}
      <button
        class="text-xs px-2 py-1 bg-gray-200 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded transition-colors"
        on:click={() => setDateShortcut(shortcut.value)}
        title="{shortcut.label === 'T' ? 'Today' : shortcut.label === 'M' ? 'Tomorrow' : 'Next Week'} (Ctrl+{shortcut.key})"
      >
        {shortcut.label}
      </button>
    {/each}
    
    <!-- Native Date Picker -->
    <input 
      type="date" 
      value={item.date || ''}
      on:input={(e) => updateItem('date', e.currentTarget.value || undefined)}
      min={today}
      max={nextMonth}
      class="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
      on:keydown={handleDateKeyDown}
    >
    
    <!-- Clear Date Button -->
    {#if item.date}
      <button
        class="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
        on:click={clearDate}
        title="Clear date"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    {/if}
  </div>
  
  <!-- Priority Selector -->
  <div class="relative flex-shrink-0">
    <select 
      value={item.priority || ''}
      on:change={(e) => updateItem('priority', e.currentTarget.value || null)}
      class="appearance-none border border-gray-300 cursor-pointer w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm {getPriorityColor(item.priority)}"
      title="Priority: {item.priority || 'None'}"
    >
      <option value="">None</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  </div>
  
  <!-- Remove Button -->
  <button 
    on:click={() => dispatch('removeItem', { index })}
    class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
    title="Remove item"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
    </svg>
  </button>
</div>