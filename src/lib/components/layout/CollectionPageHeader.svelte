<!-- src/lib/components/layout/CollectionPageHeader.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let selectedContainer: any;
  export let loading: boolean = false;

  const dispatch = createEventDispatcher<{
    refresh: void;
  }>();

  function handleRefresh() {
    dispatch('refresh');
  }
</script>

<div class="flex justify-between items-center mb-6">
  <h1 class="text-2xl font-bold">
    {selectedContainer?.title || 'No note selected'}
  </h1>
  
  <div class="flex items-center gap-2">
    <button 
      on:click={handleRefresh}
      disabled={loading}
      class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
      title="Refresh content"
    >
      <svg 
        class="w-4 h-4 {loading ? 'animate-spin' : ''}" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  </div>
</div>