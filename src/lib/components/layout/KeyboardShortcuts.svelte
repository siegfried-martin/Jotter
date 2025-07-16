<!-- src/lib/components/layout/KeyboardShortcuts.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let variant: 'full' | 'condensed' | 'minimal' = 'full';
  
  const dispatch = createEventDispatcher();

  interface Shortcut {
    keys: string;
    description: string;
    action?: string;
  }

  const shortcuts: Shortcut[] = [
    { keys: 'Ctrl+M', description: 'New note', action: 'new-note' },
    { keys: 'Alt+N', description: 'New note', action: 'new-note' },
    { keys: 'Ctrl+Shift+M', description: 'New note with code', action: 'new-code-note' },
    { keys: 'Alt+Shift+N', description: 'New note with code', action: 'new-code-note' },
    { keys: 'Ctrl+S', description: 'Save & close', action: 'save' },
    { keys: 'Escape', description: 'Cancel/Close', action: 'cancel' },
    { keys: '?', description: 'Show help', action: 'show-help' }
  ];

  function handleShortcutClick(action: string) {
    dispatch('shortcut', { action });
  }
</script>

{#if variant === 'full'}
  <!-- Full shortcuts for large screens -->
  <div class="hidden lg:block text-xs text-gray-500 text-right space-y-1">
    <div class="flex items-center justify-end space-x-2">
      <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl+M</kbd>
      <span>or</span>
      <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Alt+N</kbd>
      <span>: New note</span>
    </div>
    <div class="flex items-center justify-end space-x-2">
      <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl+Shift+M</kbd>
      <span>or</span>
      <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Alt+Shift+N</kbd>
      <span>: New note with code</span>
    </div>
  </div>
{:else if variant === 'condensed'}
  <!-- Condensed shortcuts for medium screens -->
  <div class="hidden md:block lg:hidden text-xs text-gray-500">
    <div class="flex items-center space-x-1">
      <kbd class="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl+M</kbd>
      <span>: New</span>
      <span>•</span>
      <kbd class="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl+Shift+M</kbd>
      <span>: New with code</span>
    </div>
  </div>
{:else if variant === 'minimal'}
  <!-- Minimal shortcut indicator -->
  <button 
    class="text-xs text-gray-400 hover:text-gray-600 p-1 rounded"
    title="Keyboard shortcuts available (press ? for help)"
    on:click={() => handleShortcutClick('show-help')}
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  </button>
{/if}

<style>
  kbd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
</style>