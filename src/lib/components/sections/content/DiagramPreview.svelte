<!-- src/lib/components/notes/content/DiagramPreview.svelte -->
<script lang="ts">
  import DiagramThumbnail from '../../DiagramThumbnail.svelte';
  import { getDiagramElementCount } from '../utils/contentUtils';
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;

  // Add safety checks for undefined section
  $: elementCount = section?.content ? getDiagramElementCount(section.content) : 0;
  $: hasContent = section?.content && section.content.trim() !== '' && elementCount > 0;
</script>

<div class="bg-gray-50 rounded p-4 flex items-center justify-center h-48">
  {#if hasContent}
    <DiagramThumbnail 
      diagramContent={section.content}
      {elementCount}
    />
  {:else}
    <div class="text-center text-gray-500">
      <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
      </svg>
      <div class="text-xs">
        {section?.content && section.content.trim() !== '' ? 'Empty Diagram' : 'New Diagram'}
      </div>
    </div>
  {/if}
</div>