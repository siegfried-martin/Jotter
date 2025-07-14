<!-- src/lib/components/DiagramThumbnail.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  
  export let diagramContent: string = '';
  export let elementCount: number = 0;
  
  let thumbnailUrl: string = '';
  let isGenerating = false;
  let generationError = false;
  let thumbnailTimeout: number;
  
  async function generateThumbnail() {
    if (!browser || !diagramContent || isGenerating) return;
    
    try {
      isGenerating = true;
      generationError = false;
      
      // Parse diagram data
      const diagramData = JSON.parse(diagramContent);
      
      if (!diagramData.elements || diagramData.elements.length === 0) {
        isGenerating = false;
        return;
      }
      
      // Import Excalidraw utilities
      const { exportToBlob } = await import('@excalidraw/excalidraw');
      
      // Generate thumbnail
      const blob = await exportToBlob({
        elements: diagramData.elements,
        appState: {
          ...diagramData.appState,
          exportBackground: true,
          exportWithDarkMode: false,
          exportScale: 0.5 // Low resolution for thumbnail
        },
        files: diagramData.files || {},
        mimeType: 'image/png',
        quality: 0.6
      });
      
      // Create URL for thumbnail
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
      thumbnailUrl = URL.createObjectURL(blob);
      
    } catch (error) {
      console.warn('Failed to generate diagram thumbnail:', error);
      generationError = true;
    } finally {
      isGenerating = false;
    }
  }
  
  // Debounced thumbnail generation - only generate after user stops editing
  function debouncedThumbnailGeneration() {
    clearTimeout(thumbnailTimeout);
    thumbnailTimeout = setTimeout(generateThumbnail, 1500); // Wait 1.5s after last change
  }
  
  onMount(() => {
    if (diagramContent) {
      // Small delay to avoid blocking UI on initial load
      setTimeout(generateThumbnail, 100);
    }
  });
  
  onDestroy(() => {
    // Cleanup thumbnail URL
    if (thumbnailUrl) {
      URL.revokeObjectURL(thumbnailUrl);
    }
    // Cleanup timeout
    clearTimeout(thumbnailTimeout);
  });
  
  // Debounced regeneration on content changes - only after user stops editing
  $: if (diagramContent) {
    debouncedThumbnailGeneration();
  }
</script>

<div class="diagram-thumbnail">
  {#if isGenerating}
    <div class="thumbnail-placeholder generating">
      <div class="mini-spinner"></div>
      <div class="placeholder-text">Generating...</div>
    </div>
  {:else if thumbnailUrl}
    <img 
      src={thumbnailUrl} 
      alt="Diagram thumbnail" 
      class="thumbnail-image"
      loading="lazy"
    />
  {:else if generationError}
    <div class="thumbnail-placeholder error">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
      </svg>
      <div class="placeholder-text">Preview error</div>
    </div>
  {:else}
    <div class="thumbnail-placeholder empty">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
      </svg>
      <div class="placeholder-text">Empty diagram</div>
    </div>
  {/if}
  
  <div class="element-count">
    {elementCount} elements
  </div>
</div>

<style>
  .diagram-thumbnail {
    position: relative;
    width: 100%;
    height: 120px;
    background: #f8fafc;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: white;
  }
  
  .thumbnail-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #6b7280;
    text-align: center;
    padding: 16px;
  }
  
  .thumbnail-placeholder.generating {
    color: #3b82f6;
  }
  
  .thumbnail-placeholder.error {
    color: #ef4444;
  }
  
  .mini-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .placeholder-text {
    font-size: 12px;
    font-weight: 500;
  }
  
  .element-count {
    position: absolute;
    bottom: 4px;
    right: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
  }
</style>