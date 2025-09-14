<!-- src/lib/components/editors/ExcalidrawEditor.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  // Import Excalidraw CSS
  import '@excalidraw/excalidraw/index.css';
  
  export let content: string = '';
  
  const dispatch = createEventDispatcher<{
    contentChange: string;
  }>();
  
  let excalidrawContainer: HTMLDivElement;
  let reactRoot: any = null;
  let isLoading = true;
  let loadError = false;
  
  // Parse existing content or initialize empty diagram
  let diagramData: any = null;
  
  $: {
    try {
      diagramData = content ? JSON.parse(content) : {
        type: "excalidraw",
        version: 2,
        source: "jotter",
        elements: [],
        appState: {
          gridSize: null,
          viewBackgroundColor: "#ffffff",
          currentItemFontFamily: 3, // normal
          currentItemFontSize: 20 // medium
        },
        files: {}
      };
    } catch (e) {
      console.warn('Invalid diagram data, initializing empty diagram:', e);
      diagramData = {
        type: "excalidraw",
        version: 2,
        source: "jotter",
        elements: [],
        appState: {
          gridSize: null,
          viewBackgroundColor: "#ffffff",
          currentItemFontFamily: 3, // normal
          currentItemFontSize: 20 // medium
        },
        files: {}
      };
    }
  }
  
  async function loadExcalidraw() {
    if (!browser || !excalidrawContainer) return;
    
    try {
      console.log('Loading Excalidraw...');
      console.log('Container dimensions:', {
        width: excalidrawContainer.offsetWidth,
        height: excalidrawContainer.offsetHeight,
        clientWidth: excalidrawContainer.clientWidth,
        clientHeight: excalidrawContainer.clientHeight
      });
      
      // Import React and ReactDOM
      const [React, ReactDOM, ExcalidrawModule] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('@excalidraw/excalidraw')
      ]);
      
      console.log('Modules loaded successfully');
      
      // Create React root
      reactRoot = ReactDOM.createRoot(excalidrawContainer);
      
      // Create Excalidraw component with explicit UI options
      const ExcalidrawComponent = React.createElement(
        ExcalidrawModule.Excalidraw,
        {
          initialData: diagramData,
          onChange: handleExcalidrawChange,
          UIOptions: {
            canvasActions: {
              loadScene: false,
              export: {
                saveFileToDisk: false
              }
            },
            tools: {
              // Ensure all tools are visible
              image: true
            }
          },
          // Explicitly set zen mode to false
          zenModeEnabled: false,
          viewModeEnabled: false,
          // Add explicit theme
          theme: "light"
        }
      );
      
      // Render the component
      reactRoot.render(ExcalidrawComponent);
      
      console.log('Excalidraw rendered successfully');
      
      // Debug: Check what was actually rendered
      setTimeout(() => {
        console.log('Excalidraw DOM structure:', excalidrawContainer.innerHTML.substring(0, 500));
        const excalidrawEl = excalidrawContainer.querySelector('.excalidraw');
        if (excalidrawEl) {
          console.log('Excalidraw element dimensions:', {
            width: excalidrawEl.clientWidth,
            height: excalidrawEl.clientHeight,
            style: excalidrawEl.style.cssText
          });
        }
      }, 1000);
      
      isLoading = false;
      
    } catch (error) {
      console.error('Failed to load Excalidraw:', error);
      loadError = true;
      isLoading = false;
    }
  }
  
  function handleExcalidrawChange(elements: any[], appState: any, files?: any) {
    if (!elements || !appState) return;
    
    const newDiagramData = {
      type: "excalidraw",
      version: 2,
      source: "jotter",
      elements,
      appState: {
        gridSize: appState.gridSize,
        viewBackgroundColor: appState.viewBackgroundColor || "#ffffff"
      },
      files: files || {}
    };
    
    const newContent = JSON.stringify(newDiagramData);
    if (newContent !== content) {
      dispatch('contentChange', newContent);
    }
  }
  
  onMount(() => {
    if (browser) {
      // Small delay to ensure DOM is ready
      setTimeout(loadExcalidraw, 100);
    }
  });
  
  onDestroy(() => {
    if (reactRoot) {
      try {
        reactRoot.unmount();
      } catch (e) {
        console.log('Cleanup warning (non-critical):', e);
      }
    }
  });
</script>

<div class="excalidraw-editor-container">
  <div class="excalidraw-content">
    <div bind:this={excalidrawContainer} class="excalidraw-container"></div>
    
    {#if isLoading}
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading Excalidraw...</p>
      </div>
    {/if}
    
    {#if loadError}
      <div class="error-overlay">
        <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="error-text">Failed to load Excalidraw</p>
        <p class="error-subtext">Check browser console for details</p>
        <button class="retry-button" on:click={loadExcalidraw}>
          Try Again
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .excalidraw-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: white;
    position: relative;
  }

  .excalidraw-content {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    position: relative;
    width: 100%;
    height: 100%;
  }

  .excalidraw-container {
    height: 100%;
    width: 100%;
    position: relative;
  }

  .loading-overlay, .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.95);
    gap: 16px;
    z-index: 1000;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-text, .error-text {
    color: #6b7280;
    font-size: 16px;
    font-weight: 500;
  }

  .error-subtext {
    color: #9ca3af;
    font-size: 14px;
  }

  .error-icon {
    width: 48px;
    height: 48px;
    color: #ef4444;
  }

  .retry-button {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .retry-button:hover {
    background: #2563eb;
  }

  /* Ensure Excalidraw fills the container properly */
  :global(.excalidraw-container .excalidraw) {
    height: 100% !important;
    width: 100% !important;
  }
</style>