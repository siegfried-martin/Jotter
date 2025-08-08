<!-- src/lib/components/notes/content/WysiwygContent.svelte -->
<script lang="ts">
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let isDragging: boolean = false;
</script>

<div 
  class="prose prose-sm max-w-none text-sm leading-relaxed break-words" 
  class:select-none={isDragging}
>
  {@html section.content}
</div>