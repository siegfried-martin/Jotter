<!-- src/lib/components/editors/WysiwygEditor.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import QuillEditor from './QuillEditor.svelte';
  
  export let content: string;
  
  const dispatch = createEventDispatcher<{
    contentChange: string;
  }>();
  
  function handleContentChange(event: CustomEvent<string>) {
    content = event.detail;
    dispatch('contentChange', content);
  }
</script>

<div class="wysiwyg-editor h-full">
  <QuillEditor 
    {content} 
    on:contentChange={handleContentChange} 
  />
</div>

<style>
  .wysiwyg-editor {
    border-radius: 8px;
    overflow: hidden;
  }
</style>