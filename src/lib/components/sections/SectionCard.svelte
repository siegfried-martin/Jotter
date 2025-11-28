<!-- src/lib/components/sections/SectionCard.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { NoteSection } from '$lib/types';
  
  // Components
  import SectionCardContainer from './shared/SectionCardContainer.svelte';
  import SectionCardHeader from './shared/SectionCardHeader.svelte';
  import ChecklistContent from './content/ChecklistContent.svelte';
  import CodeContent from './content/CodeContent.svelte';
  import WysiwygContent from './content/WysiwygContent.svelte';
  import DiagramPreview from './content/DiagramPreview.svelte';
  
  // Utils
  import { copyToClipboard, copyHtmlToClipboard } from './utils/sectionUtils';
  
  export let section: NoteSection;
  export let isDragging: boolean = false;
  
  const dispatch = createEventDispatcher<{
    delete: string;
    checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
    titleSave: { sectionId: string; title: string | null };
  }>();

  $: showCopyAction = section.type === 'code' || section.type === 'wysiwyg';

  function handleCopy() {
    if (section.type === 'wysiwyg') {
      // Copy as rich text for text sections
      copyHtmlToClipboard(section.content);
    } else {
      // Copy as plain text for code sections
      copyToClipboard(section.content);
    }
  }

  function handleDelete() {
    dispatch('delete', section.id);
  }

  function handleCheckboxChange(event: CustomEvent<{ sectionId: string; checked: boolean; lineIndex: number }>) {
    dispatch('checkboxChange', event.detail);
  }

  function handleTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>) {
    dispatch('titleSave', event.detail);
  }
</script>

<SectionCardContainer {isDragging}>
  <SectionCardHeader 
    {section}
    {isDragging}
    {showCopyAction}
    onCopy={handleCopy}
    onDelete={handleDelete}
    on:titleSave={handleTitleSave}
  />
  <div class="section-content-preview overflow-y-auto scrollbar-thin">
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
</SectionCardContainer>

<style>
  .section-content-preview {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* Enable scrolling for content preview */
  .section-content-preview.overflow-y-auto {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 transparent;
  }

  .section-content-preview.overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .section-content-preview.overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .section-content-preview.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #cbd5e0;
    border-radius: 3px;
  }

  .section-content-preview.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #a0aec0;
  }
</style>