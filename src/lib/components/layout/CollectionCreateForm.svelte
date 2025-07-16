<!-- src/lib/components/layout/CollectionCreateForm.svelte -->
<script lang="ts">
  import type { useCollectionManager } from '$lib/composables/useCollectionManager';

  export let collectionManager: ReturnType<typeof useCollectionManager>;

  // Reactive values from the composable
  $: ({ newCollectionName, newCollectionColor, loading } = $collectionManager);

  function handleKeydown(event: KeyboardEvent) {
    collectionManager.handleCollectionKeydown(event);
  }

  function handleColorSelect(color: string) {
    collectionManager.setCollectionColor(color);
  }

  function handleNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    collectionManager.setCollectionName(target.value);
  }

  function handleCreate() {
    collectionManager.createCollection();
  }

  function handleCancel() {
    collectionManager.cancelCreate();
  }
</script>

<div class="flex items-center space-x-2 flex-shrink-0">
  <!-- Main Form Container -->
  <div class="flex items-center space-x-2 px-2 py-1 bg-white border border-gray-300 rounded-md">
    <!-- Color Indicator -->
    <div 
      class="w-2.5 h-2.5 rounded-full cursor-pointer flex-shrink-0" 
      style="background-color: {newCollectionColor}"
      title="Click colors below to change"
    ></div>
    
    <!-- Name Input -->
    <input
      type="text"
      value={newCollectionName}
      on:input={handleNameChange}
      on:keydown={handleKeydown}
      placeholder="Collection name"
      class="text-sm border-none outline-none bg-transparent min-w-0 w-24 focus:w-32 transition-all"
      disabled={loading}
      autofocus
    />
    
    <!-- Action Buttons -->
    <div class="flex items-center space-x-1 flex-shrink-0">
      <button
        on:click={handleCreate}
        disabled={loading || !newCollectionName.trim()}
        class="p-0.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create collection"
      >
        {#if loading}
          <div class="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
        {:else}
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        {/if}
      </button>
      
      <button
        on:click={handleCancel}
        disabled={loading}
        class="p-0.5 text-gray-500 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
        title="Cancel"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Color Picker -->
  <div class="flex items-center space-x-1 flex-shrink-0">
    {#each collectionManager.defaultColors as color}
      <button
        class="w-4 h-4 rounded-full border transition-all flex-shrink-0 hover:scale-110"
        class:border-gray-800={newCollectionColor === color}
        class:border-2={newCollectionColor === color}
        class:border-gray-300={newCollectionColor !== color}
        style="background-color: {color}"
        on:click={() => handleColorSelect(color)}
        disabled={loading}
        title="Select {color}"
      ></button>
    {/each}
  </div>
</div>