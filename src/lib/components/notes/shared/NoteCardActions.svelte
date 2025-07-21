<!-- src/lib/components/notes/shared/NoteCardActions.svelte -->
<script lang="ts">
  export let isDragging: boolean = false;
  export let showCopyAction: boolean = false;
  export let onCopy: (() => void) | undefined = undefined;
  export let onDelete: (() => void) | undefined = undefined;

  function handleCopy(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (isDragging || !onCopy) return;
    onCopy();
  }

  function handleDelete(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (isDragging || !onDelete) return;
    onDelete();
  }
</script>

<div class="flex items-center space-x-2">
  {#if showCopyAction}
    <button 
      class="copy-button opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity"
      class:opacity-0={isDragging}
      disabled={isDragging}
      on:click={handleCopy}
      title="Copy to clipboard"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
      </svg>
    </button>
  {/if}
  
  <button 
    class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-opacity"
    class:opacity-0={isDragging}
    disabled={isDragging}
    on:click={handleDelete}
    title="Delete section"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
    </svg>
  </button>
</div>