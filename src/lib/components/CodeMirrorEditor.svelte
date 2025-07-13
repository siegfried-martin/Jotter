<!-- CodeMirrorEditor.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { javascript } from '@codemirror/lang-javascript';
  import { python } from '@codemirror/lang-python';
  import { html } from '@codemirror/lang-html';
  import { css } from '@codemirror/lang-css';
  import { json } from '@codemirror/lang-json';
  import { sql } from '@codemirror/lang-sql';
  import { rust } from '@codemirror/lang-rust';
  import { cpp } from '@codemirror/lang-cpp';
  import { java } from '@codemirror/lang-java';
  import { php } from '@codemirror/lang-php';
  import { xml } from '@codemirror/lang-xml';
  import { markdown } from '@codemirror/lang-markdown';
  import { indentWithTab } from '@codemirror/commands';
  import { keymap } from '@codemirror/view';
  import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
  import { indentOnInput, indentUnit } from '@codemirror/language';

  export let value: string = '';
  export let language: string = 'plaintext';
  export let readonly: boolean = false;
  export let placeholder: string = '';
  export let onChange: (value: string) => void = () => {};

  let editor: EditorView;
  let container: HTMLDivElement;

  // Language extensions mapping
  const languageExtensions: Record<string, any> = {
    plaintext: [], // Plain text with no syntax highlighting
    javascript: javascript(),
    typescript: javascript({ typescript: true }),
    python: python(),
    html: html(),
    css: css(),
    json: json(),
    sql: sql(),
    rust: rust(),
    cpp: cpp(),
    java: java(),
    php: php(),
    xml: xml(),
    markdown: markdown(),
  };

  // Get the appropriate language extension
  function getLanguageExtension(lang: string) {
    return languageExtensions[lang] || languageExtensions.plaintext;
  }

  // Create editor extensions
  function createExtensions() {
    const extensions = [
      basicSetup,
      autocompletion(),
      indentOnInput(),
      indentUnit.of("  "), // Use 2 spaces for indentation
      getLanguageExtension(language),
      keymap.of([
        ...completionKeymap,
        indentWithTab, // Add tab indentation directly
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          if (newValue !== value) {
            onChange(newValue);
          }
        }
      }),
    ];

    // Add readonly if needed
    if (readonly) {
      extensions.push(EditorView.editable.of(false));
    }

    return extensions;
  }

  // Initialize editor
  function initializeEditor() {
    if (!container) return;

    const state = EditorState.create({
      doc: value,
      extensions: createExtensions(),
    });

    editor = new EditorView({
      state,
      parent: container,
    });
  }

  // Update editor content
  function updateContent(newValue: string) {
    if (editor && newValue !== editor.state.doc.toString()) {
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: newValue,
        },
      });
    }
  }

  // Update editor language
  function updateLanguage() {
    if (editor) {
      editor.dispatch({
        effects: EditorState.reconfigure.of(createExtensions()),
      });
    }
  }

  onMount(() => {
    initializeEditor();
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  // Reactive updates
  $: if (editor && value !== editor.state.doc.toString()) {
    updateContent(value);
  }

  $: if (editor && language) {
    updateLanguage();
  }
</script>

<div class="codemirror-container">
  <div bind:this={container} class="codemirror-editor"></div>
</div>

<style>
  .codemirror-container {
    height: 100%;
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
  }

  .codemirror-editor {
    height: 100%;
  }

  :global(.cm-editor) {
    height: 100%;
  }

  :global(.cm-scroller) {
    font-family: 'Fira Code', 'JetBrains Mono', 'Source Code Pro', Consolas, 'Liberation Mono', Menlo, Monaco, monospace;
    font-size: 14px;
    line-height: 1.5;
  }

  :global(.cm-focused) {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  /* Custom scrollbar for webkit browsers */
  :global(.cm-scroller::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(.cm-scroller::-webkit-scrollbar-track) {
    background: #f1f5f9;
  }

  :global(.cm-scroller::-webkit-scrollbar-thumb) {
    background: #cbd5e1;
    border-radius: 4px;
  }

  :global(.cm-scroller::-webkit-scrollbar-thumb:hover) {
    background: #94a3b8;
  }
</style>