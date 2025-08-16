<!-- src/lib/dnd/components/DragGhost.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';

  // Get drag context
  const dragContext = getContext('drag');
  if (!dragContext) {
    throw new Error('DragGhost must be used within a DragProvider');
  }

  const { dragCore, registry } = dragContext;

  // Subscribe to drag state
  $: dragState = dragCore.store;
  $: showGhost = $dragState.phase === 'dragging' && 
                 $dragState.item && 
                 $dragState.currentPosition;

  // Create ghost configuration when dragging
  $: ghostConfig = showGhost && $dragState.itemType
    ? registry.createGhost($dragState.itemType, $dragState.item)
    : null;

  // Position ghost near cursor but offset to avoid interference
  $: ghostPosition = $dragState.currentPosition 
    ? {
        x: $dragState.currentPosition.x - 150, // Offset to left of cursor
        y: $dragState.currentPosition.y - 50   // Offset above cursor
      }
    : { x: 0, y: 0 };

  // Combine default styles with behavior-specific styles
  $: ghostStyle = ghostConfig 
    ? {
        position: 'fixed',
        left: `${ghostPosition.x}px`,
        top: `${ghostPosition.y}px`,
        zIndex: '1000',
        pointerEvents: 'none',
        transition: 'none',
        ...ghostConfig.style
      }
    : {};

  // Convert style object to CSS string
  $: styleString = Object.entries(ghostStyle)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
</script>

<!-- Ghost element - only shown during drag -->
{#if showGhost && ghostConfig}
  <div 
    class="drag-ghost {ghostConfig.className || ''}"
    style={styleString}
  >
    {@html ghostConfig.content}
  </div>
{/if}

<style>
  :global(.drag-ghost) {
    /* Base ghost styles */
    pointer-events: none !important;
    user-select: none;
    transform-origin: center;
  }

  /* Section ghost styles */
  :global(.section-drag-ghost .ghost-content) {
    display: flex;
    flex-direction: column;
  }

  :global(.section-drag-ghost .ghost-header) {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.section-drag-ghost .ghost-type) {
    background: #3b82f6;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  :global(.section-drag-ghost .ghost-title) {
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  /* Container ghost styles */
  :global(.container-drag-ghost .ghost-content) {
    display: flex;
    flex-direction: column;
  }

  :global(.container-drag-ghost .ghost-header) {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.container-drag-ghost .ghost-avatar) {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    flex-shrink: 0;
  }

  :global(.container-drag-ghost .ghost-avatar-text) {
    font-size: 12px;
    line-height: 1;
  }

  :global(.container-drag-ghost .ghost-title) {
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  /* Color classes for container avatars */
  :global(.bg-blue-500) { background-color: #3b82f6; }
  :global(.bg-green-500) { background-color: #10b981; }
  :global(.bg-purple-500) { background-color: #8b5cf6; }
  :global(.bg-pink-500) { background-color: #ec4899; }
  :global(.bg-yellow-500) { background-color: #f59e0b; }
  :global(.bg-indigo-500) { background-color: #6366f1; }
  :global(.bg-red-500) { background-color: #ef4444; }
  :global(.bg-teal-500) { background-color: #14b8a6; }
</style>