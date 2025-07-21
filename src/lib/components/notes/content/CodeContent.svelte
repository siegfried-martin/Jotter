<!-- src/lib/components/notes/content/CodeContent.svelte -->
<script lang="ts">
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let isDragging: boolean = false;
</script>

<div>
  <pre 
    class="text-sm bg-gray-50 rounded p-3 font-mono text-gray-800 whitespace-pre-wrap break-all" 
    class:select-none={isDragging}
  >{section.content}</pre>
  
  {#if section.meta?.language}
    <div class="mt-2 text-xs text-gray-500">
      {section.meta.language}
    </div>
  {/if}
</div>