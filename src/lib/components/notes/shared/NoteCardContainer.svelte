<!-- src/lib/components/notes/shared/NoteCardContainer.svelte -->
<script lang="ts">
  export let isDragging: boolean = false;
</script>

<div class="note-card-container">
  <div 
    class="note-card-base bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 group"
    class:dragging={isDragging}
    class:cursor-pointer={!isDragging}
    class:cursor-grabbing={isDragging}
  >
    <slot />
    
    <!-- Expand hint -->
    <div class="mt-2 text-xs text-gray-400 text-center">
      Click to edit • Hold to drag
    </div>
  </div>
</div>

<style>
  .note-card-container {
    position: relative;
    width: 100%;
  }

  .note-card-base {
    height: 360px;
    display: flex;
    flex-direction: column;
    min-width: 300px;
    max-width: 500px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .note-card-base:hover:not(.dragging) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .note-card-base.dragging {
    opacity: 0.7;
    z-index: 1000;
  }

  /* Disable interactions during drag */
  .note-card-base.dragging,
  .note-card-base.dragging * {
    user-select: none !important;
    pointer-events: none !important;
  }

  /* Button hover states */
  :global(.note-card-base:hover .copy-button),
  :global(.note-card-base:hover .opacity-0:not(.dragging *)) {
    opacity: 1 !important;
  }
</style>