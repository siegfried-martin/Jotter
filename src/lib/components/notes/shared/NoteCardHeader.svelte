<!-- src/lib/components/notes/shared/NoteCardHeader.svelte -->
<script lang="ts">
  import NoteCardActions from './NoteCardActions.svelte';
  
  export let sectionType: string;
  export let isDragging: boolean = false;
  export let showCopyAction: boolean = false;
  export let onCopy: (() => void) | undefined = undefined;
  export let onDelete: (() => void) | undefined = undefined;
</script>

<div class="flex justify-between items-start mb-3">
  <div class="text-sm font-medium text-gray-700 capitalize flex items-center space-x-2">
    <span>{sectionType}</span>
    {#if isDragging}
      <span class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Moving...</span>
    {/if}
  </div>
  
  <NoteCardActions 
    {isDragging}
    {showCopyAction}
    {onCopy}
    {onDelete}
  />
</div>