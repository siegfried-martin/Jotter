<!-- src/lib/components/editors/DiagramEditor.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ExcalidrawEditor from './ExcalidrawEditor.svelte';
  
  export let content: string = '';
  export let isFullScreen: boolean = true;
  
  const dispatch = createEventDispatcher<{
    contentChange: string;
  }>();
  
  function handleContentChange(event: CustomEvent<string>) {
    content = event.detail;
    dispatch('contentChange', content);
  }
  
  function handleKeydown(event: KeyboardEvent) {
    // Prevent certain shortcuts from bubbling up
    if (event.ctrlKey && event.key === 's') {
      event.stopPropagation();
    }
  }
</script>

<div class="diagram-editor-container" class:fullscreen={isFullScreen}>
  <div class="diagram-editor-content" on:keydown={handleKeydown}>
    <ExcalidrawEditor 
      {content} 
      on:contentChange={handleContentChange} 
    />
  </div>
</div>

<style>
  .diagram-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }

  .diagram-editor-container.fullscreen {
    height: 100%;
  }

  .diagram-editor-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  /* Ensure proper sizing */
  :global(.diagram-editor-content .excalidraw-container) {
    height: 100%;
    border: none;
    border-radius: 0;
  }
</style>