<!-- CodeEditor.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CodeMirrorEditor from '../CodeMirrorEditor.svelte';

  // Props for fullscreen editor mode
  export let content: string = '';
  export let language: string = 'plaintext';
  export let isFullScreen: boolean = true; // This component is used in fullscreen modal

  const dispatch = createEventDispatcher();

  // Language options for the dropdown
  const languageOptions = [
    { value: 'plaintext', label: 'Plain Text (Pseudocode)' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'sql', label: 'SQL' },
    { value: 'rust', label: 'Rust' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' },
    { value: 'php', label: 'PHP' },
    { value: 'xml', label: 'XML' },
    { value: 'markdown', label: 'Markdown' },
  ];

  function handleContentChange(newContent: string) {
    content = newContent;
    dispatch('contentChange', newContent);
  }

  function handleLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    language = target.value;
    dispatch('languageChange', language);
  }

  function handleKeydown(event: KeyboardEvent) {
    // Prevent certain shortcuts from bubbling up
    if (event.key === 'Tab' || (event.ctrlKey && event.key === 's')) {
      event.stopPropagation();
    }
  }
</script>

<div class="code-editor-container" class:fullscreen={isFullScreen}>
  <div class="code-editor-content" on:keydown={handleKeydown}>
    <CodeMirrorEditor
      bind:value={content}
      language={language}
      placeholder="Enter your code here..."
      onChange={handleContentChange}
    />
  </div>
  
  <!-- Bottom controls bar -->
  <div class="code-editor-footer">
    <div class="language-selector">
      <label for="language-select">Language:</label>
      <select
        id="language-select"
        bind:value={language}
        on:change={handleLanguageChange}
        class="language-dropdown"
      >
        {#each languageOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

<style>
  .code-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }

  .code-editor-container.fullscreen {
    height: 100%;
  }

  .code-editor-content {
    flex: 1;
    overflow: hidden;
    min-height: 0; /* Important for flex child to shrink */
  }

  .code-editor-footer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 12px 16px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .language-selector {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .language-selector label {
    font-size: 14px;
    font-weight: 500;
    color: #475569;
  }

  .language-dropdown {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .language-dropdown:hover {
    border-color: #9ca3af;
  }

  .language-dropdown:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Ensure proper sizing */
  :global(.code-editor-content .codemirror-container) {
    height: 100%;
    border: none;
    border-radius: 0;
  }
</style>