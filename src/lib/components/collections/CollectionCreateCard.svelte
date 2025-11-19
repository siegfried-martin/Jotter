<!-- src/lib/components/collections/CollectionCreateCard.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    create: { name: string; color: string; description?: string };
  }>();

  let showForm: boolean = false;
  let name: string = '';
  let color: string = '#3B82F6';
  let description: string = '';

  const defaultColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ];

  function startCreate() {
    showForm = true;
    name = '';
    color = '#3B82F6';
    description = '';
  }

  function submitCreate() {
    console.log("submitting create event with name, color, description", { name, color, description });
    if (name.trim()) {
      dispatch('create', {
        name: name.trim(),
        color,
        description: description.trim() || undefined
      });
      cancelCreate();
    }
  }

  function cancelCreate() {
    showForm = false;
    name = '';
    color = '#3B82F6';
    description = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitCreate();
    } else if (event.key === 'Escape') {
      cancelCreate();
    }
  }
</script>

<div class="group relative p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-100 transition-colors min-h-[200px]">
  {#if showForm}
    <!-- Create Form -->
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-4">
        <div 
          class="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" 
          style="background-color: {color}"
          title="Collection color"
        ></div>
        <h3 class="font-semibold text-gray-900">New Collection</h3>
      </div>

      <!-- Name Input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
        <input
          type="text"
          bind:value={name}
          on:keydown={handleKeydown}
          placeholder="Collection name"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autofocus
        />
      </div>

      <!-- Color Picker -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div class="flex flex-wrap gap-2">
          {#each defaultColors as colorOption}
            <button
              type="button"
              class="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
              class:border-gray-800={color === colorOption}
              class:border-gray-300={color !== colorOption}
              style="background-color: {colorOption}"
              on:click={() => color = colorOption}
              title="Select {colorOption}"
            ></button>
          {/each}
        </div>
      </div>

      <!-- Description Input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
        <textarea
          bind:value={description}
          on:keydown={handleKeydown}
          placeholder="What will you store in this collection?"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-2 pt-2">
        <button
          on:click={submitCreate}
          disabled={!name.trim()}
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Create Collection
        </button>
        <button
          on:click={cancelCreate}
          class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <!-- Create Button -->
    <button
      on:click={startCreate}
      class="w-full h-full flex items-center justify-center text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
    >
      <div class="text-gray-400 group-hover:text-gray-600 transition-colors">
        <!-- Plus Icon -->
        <svg class="w-8 h-8 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        
        <span class="text-gray-600 group-hover:text-gray-800 font-medium transition-colors block">
          Create New Collection
        </span>
        
        <p class="text-xs text-gray-500 mt-2 group-hover:text-gray-600 transition-colors">
          Organize your notes into focused collections
        </p>
      </div>
    </button>
  {/if}
</div>