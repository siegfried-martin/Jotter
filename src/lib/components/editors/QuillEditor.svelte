<!-- src/lib/components/editors/QuillEditor.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { setupQuillEditor } from '$lib/config/quill/quill-config';
  
  export let content: string = '';
  
  const dispatch = createEventDispatcher<{
    contentChange: string;
  }>();
  
  let editorElement: HTMLDivElement;
  let quill: any;
  let mounted = false;
  
  onMount(async () => {
    if (!browser) return;
    
    try {
      // Setup Quill editor with all configurations
      quill = await setupQuillEditor(editorElement);
      
      // Set initial content only if there's actual content
      if (content && content.trim()) {
        quill.clipboard.dangerouslyPasteHTML(content);
      }
      
      // Listen for content changes
      quill.on('text-change', () => {
        const newContent = quill.root.innerHTML;
        if (newContent !== content) {
          content = newContent;
          dispatch('contentChange', content);
        }
      });
      
      mounted = true;
      
    } catch (error) {
      console.error('Failed to initialize Quill editor:', error);
    }
  });
  
  onDestroy(() => {
    // Quill cleans up automatically when the DOM element is removed
  });
  
  // Update editor content when prop changes
  $: if (quill && mounted && content !== undefined) {
    const currentContent = quill.root.innerHTML;
    if (currentContent !== content && content && content.trim()) {
      quill.clipboard.dangerouslyPasteHTML(content);
    }
  }
</script>

<!-- Import Quill CSS -->
<svelte:head>
  <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
</svelte:head>

<div class="quill-editor h-full">
  <div bind:this={editorElement} class="h-full"></div>
</div>

<style>
  .quill-editor {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #d1d5db;
  }
  
  /* Ensure the editor takes full height and set default font size */
  :global(.quill-editor .ql-container) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    height: calc(100% - 84px) !important;
    border-left: none !important;
    border-right: none !important;
    border-bottom: none !important;
  }
  
  :global(.quill-editor .ql-editor) {
    padding: 16px !important;
    color: #374151;
    font-size: 14px !important;
  }
  
  :global(.quill-editor .ql-editor p) {
    font-size: 14px;
  }
  
  /* Toolbar styling */
  :global(.quill-editor .ql-toolbar) {
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
    border-bottom: 1px solid #e5e7eb !important;
    background: #f8fafc !important;
    padding: 8px !important;
    line-height: 1.2 !important;
  }
  
  :global(.quill-editor .ql-toolbar .ql-formats) {
    margin-right: 15px !important;
    margin-bottom: 5px !important;
  }
  
  /* Header picker styling */
  :global(.quill-editor .ql-picker-label) {
    font-size: 13px !important;
  }
  
  :global(.quill-editor .ql-header .ql-picker-label) {
    min-width: 60px !important;
    text-align: center !important;
  }
  
  :global(.quill-editor .ql-picker-options) {
    max-height: 200px !important;
    overflow-y: auto !important;
  }
  
  /* Ensure proper list styling with nested bullet patterns */
  :global(.quill-editor .ql-editor ol) {
    list-style-type: none !important; /* Remove default list styling */
  }
  
  :global(.quill-editor .ql-editor ul) {
    list-style-type: none !important; /* Remove default list styling */
  }
  
  /* Override Quill's ::before content for alternating bullet patterns */
  
  /* Level 1: solid bullet */
  :global(.quill-editor .ql-editor ul li::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"]::before) {
    content: "•" !important;
  }
  
  /* Level 2: open circle */
  :global(.quill-editor .ql-editor ul li.ql-indent-1::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-1::before) {
    content: "◦" !important;
  }
  
  /* Level 3: solid bullet */
  :global(.quill-editor .ql-editor ul li.ql-indent-2::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-2::before) {
    content: "•" !important;
  }
  
  /* Level 4: open circle */
  :global(.quill-editor .ql-editor ul li.ql-indent-3::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-3::before) {
    content: "◦" !important;
  }
  
  /* Level 5: solid bullet */
  :global(.quill-editor .ql-editor ul li.ql-indent-4::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-4::before) {
    content: "•" !important;
  }
  
  /* Level 6: open circle */
  :global(.quill-editor .ql-editor ul li.ql-indent-5::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-5::before) {
    content: "◦" !important;
  }
  
  /* Level 7: solid bullet */
  :global(.quill-editor .ql-editor ul li.ql-indent-6::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-6::before) {
    content: "•" !important;
  }
  
  /* Level 8: open circle */
  :global(.quill-editor .ql-editor ul li.ql-indent-7::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-7::before) {
    content: "◦" !important;
  }
  
  /* Level 9: solid bullet */
  :global(.quill-editor .ql-editor ul li.ql-indent-8::before),
  :global(.quill-editor .ql-editor ol li[data-list="bullet"].ql-indent-8::before) {
    content: "•" !important;
  }

  /* Focus styles */
  :global(.quill-editor:focus-within .ql-toolbar) {
    border-color: #3b82f6 !important;
  }
  
  :global(.quill-editor:focus-within .ql-container) {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
</style>