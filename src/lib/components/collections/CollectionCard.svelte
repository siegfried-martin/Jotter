<!-- src/lib/components/collections/CollectionCard.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Collection } from '$lib/types';

  export let collection: Collection;
  export let isEditing: boolean = false;

  const dispatch = createEventDispatcher<{
    select: Collection;
    edit: Collection;
    delete: Collection;
    startEdit: Collection;
    cancelEdit: void;
  }>();

  let editName: string = collection.name;
  let editColor: string = collection.color;
  let editDescription: string = collection.description || '';

  const defaultColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ];

  function handleSelect() {
    if (!isEditing) {
      dispatch('select', collection);
    }
  }

  function startEdit(event: Event) {
    event.stopPropagation();
    editName = collection.name;
    editColor = collection.color;
    editDescription = collection.description || '';
    dispatch('startEdit', collection);
  }

  function saveEdit() {
    if (editName.trim()) {
      dispatch('edit', {
        ...collection,
        name: editName.trim(),
        color: editColor,
        description: editDescription.trim() || undefined
      });
    }
  }

  function cancelEdit() {
    editName = collection.name;
    editColor = collection.color;
    editDescription = collection.description || '';
    dispatch('cancelEdit');
  }

  function confirmDelete(event: Event) {
    event.stopPropagation();
    dispatch('delete', collection);
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function truncateDescription(description: string | null, maxLength: number = 100): string {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength).trim() + '...';
  }
</script>

<div class="group relative p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 min-h-[200px]">
  <!-- Management Icons (show on hover, positioned at top-right) -->
  {#if !isEditing}
    <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <div class="flex items-center space-x-1">
        <button
          on:click={startEdit}
          class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit collection"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        
        <button
          on:click={confirmDelete}
          class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete collection"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Main Card Content -->
  <button
    on:click={handleSelect}
    class="text-left w-full focus:outline-none"
    disabled={isEditing}
  >
    {#if isEditing}
      <!-- Edit Mode -->
      <div class="space-y-4">
        <!-- Header with Color and Name -->
        <div class="flex items-start space-x-3">
          <div 
            class="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0 mt-1" 
            style="background-color: {editColor}"
          ></div>
          <div class="flex-1 space-y-3">
            <input
              type="text"
              bind:value={editName}
              on:keydown={handleEditKeydown}
              class="w-full font-semibold text-gray-900 bg-transparent border-b border-blue-500 outline-none focus:border-blue-600 pb-1"
              placeholder="Collection name"
              autofocus
            />
            
            <!-- Color Picker -->
            <div class="flex flex-wrap gap-2">
              {#each defaultColors as color}
                <button
                  type="button"
                  class="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  class:border-gray-800={editColor === color}
                  class:border-gray-300={editColor !== color}
                  style="background-color: {color}"
                  on:click={() => editColor = color}
                  title="Select {color}"
                ></button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Description Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            bind:value={editDescription}
            on:keydown={handleEditKeydown}
            placeholder="What will you store in this collection?"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-2 pt-2">
          <button
            type="button"
            on:click={saveEdit}
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Save Changes
          </button>
          <button
            type="button"
            on:click={cancelEdit}
            class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    {:else}
      <!-- View Mode -->
      <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center space-x-3">
          <div 
            class="w-4 h-4 rounded-full flex-shrink-0" 
            style="background-color: {collection.color}"
          ></div>
          <h3 class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate flex-1">
            {collection.name}
          </h3>
          {#if collection.is_default}
            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
              Default
            </span>
          {/if}
        </div>
        
        <!-- Description -->
        <div class="min-h-[60px]">
          {#if collection.description}
            <p class="text-gray-600 text-sm line-clamp-3">
              {truncateDescription(collection.description, 120)}
            </p>
          {:else}
            <p class="text-gray-400 text-sm italic">
              No description
            </p>
          {/if}
        </div>
        
        <!-- Footer -->
        <div class="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>Created {formatDate(collection.created_at)}</span>
        </div>
        
        <!-- Hover Effect -->
        <div class="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
          <div class="text-xs text-blue-600 mt-2 text-center">
            Click to open collection
          </div>
        </div>
      </div>
    {/if}
  </button>
</div>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>