<!-- src/lib/components/notes/NoteItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { NoteSection } from '$lib/types';
  
  // Components
  import NoteCardContainer from './shared/NoteCardContainer.svelte';
  import NoteCardHeader from './shared/NoteCardHeader.svelte';
  import ChecklistContent from './content/ChecklistContent.svelte';
  import CodeContent from './content/CodeContent.svelte';
  import WysiwygContent from './content/WysiwygContent.svelte';
  import DiagramPreview from './content/DiagramPreview.svelte';
  
  // Utils
  import { copyToClipboard } from './utils/contentUtils';
  
  export let section: NoteSection;
  export let isDragging: boolean = false;
  
  const dispatch = createEventDispatcher<{
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
  }>();

  $: showCopyAction = section.type === 'code' || section.type === 'wysiwyg';

  function handleCopy() {
    copyToClipboard(section.content);
  }

  function handleDelete() {
    dispatch('delete', section.id);
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    dispatch('checkboxChange', event.detail);
  }
</script>

<NoteCardContainer {isDragging}>
  <NoteCardHeader 
    sectionType={section.type}
    {isDragging}
    {showCopyAction}
    onCopy={handleCopy}
    onDelete={handleDelete}
  />
  
  <div class="note-content-preview overflow-y-auto scrollbar-thin">
    {#if section.type === 'checklist'}
      <ChecklistContent {section} {isDragging} on:checkboxChange={handleCheckboxChange} />
    {:else if section.type === 'code'}
      <CodeContent {section} {isDragging} />
    {:else if section.type === 'wysiwyg'}
      <WysiwygContent {section} {isDragging} />
    {:else if section.type === 'diagram'}
      <DiagramPreview {section} />
    {/if}
  </div>
</NoteCardContainer>

<style>
  .note-content-preview {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* Enable scrolling for content preview */
  .note-content-preview.overflow-y-auto {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
  }

  .note-content-preview.overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .note-content-preview.overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .note-content-preview.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #cbd5e0;
    border-radius: 3px;
  }

  .note-content-preview.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #a0aec0;
  }
</style>