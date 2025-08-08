<!-- src/lib/components/sections/shared/SectionEditableTitle.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import InlineEditableTitle from '$lib/components/ui/InlineEditableTitle.svelte';
  import { getSectionDisplayTitle, getSectionTypeDisplayName } from '$lib/utils/sectionTitleUtils';
  import type { NoteSection } from '$lib/types';

  export let section: NoteSection;
  export let className: string = 'text-sm font-medium text-gray-700';

  const dispatch = createEventDispatcher<{
    save: string | null;
  }>();

  // Get the display title (custom title or fallback to section type)
  $: displayTitle = getSectionDisplayTitle(section);
  
  // Get the placeholder (always the section type)
  $: placeholder = getSectionTypeDisplayName(section.type);

  function handleTitleSave(newTitle: string) {
    // If the new title is the same as the section type, save as null 
    // (this allows users to "reset" to default by typing the section type)
    const titleToSave = newTitle === getSectionTypeDisplayName(section.type) ? null : newTitle;
    dispatch('save', titleToSave);
  }
</script>

<InlineEditableTitle
  title={displayTitle}
  {placeholder}
  {className}
  maxLength={50}
  on:save={(e) => handleTitleSave(e.detail)}
/>