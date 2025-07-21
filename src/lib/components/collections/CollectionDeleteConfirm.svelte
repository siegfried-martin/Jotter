<!-- src/lib/components/collections/CollectionDeleteConfirm.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Collection } from '$lib/types';

  export let collection: Collection;

  const dispatch = createEventDispatcher<{
    confirm: Collection;
    cancel: void;
  }>();

  function confirmDelete() {
    dispatch('confirm', collection);
  }

  function cancelDelete() {
    dispatch('cancel');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      confirmDelete();
    } else if (event.key === 'Escape') {
      cancelDelete();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="absolute inset-0 bg-white bg-opacity-95 rounded-lg flex items-center justify-center z-20 backdrop-blur-sm">
  <div class="text-center p-6 max-w-sm">
    <!-- Warning Icon -->
    <div class="text-red-600 mb-4">
      <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
    </div>

    <!-- Warning Text -->
    <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Collection</h3>
    <p class="text-sm text-gray-700 mb-1 font-medium">
      Are you sure you want to delete "{collection.name}"?
    </p>
    <p class="text-xs text-gray-600 mb-6">
      This action cannot be undone. Notes in this collection will be moved to your uncategorized notes.
    </p>

    <!-- Action Buttons -->
    <div class="flex items-center justify-center space-x-3">
      <button
        on:click={confirmDelete}
        class="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        autofocus
      >
        Delete Collection
      </button>
      <button
        on:click={cancelDelete}
        class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        Cancel
      </button>
    </div>

    <!-- Keyboard Hint -->
    <p class="text-xs text-gray-500 mt-4">
      Press Enter to delete, Escape to cancel
    </p>
  </div>
</div>