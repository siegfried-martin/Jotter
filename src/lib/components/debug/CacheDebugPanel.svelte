<!-- src/lib/components/debug/CacheDebugPanel.svelte -->
<script lang="ts">
  import { cacheStats } from '$lib/stores/sectionCacheStore';
  import { onMount } from 'svelte';
  
  export let pageManager: any;
  
  let showDebug = false;
  let refreshInterval: number;
  
  // Auto-refresh stats every 2 seconds when panel is open
  $: if (showDebug) {
    refreshInterval = setInterval(() => {
      // Trigger reactivity by accessing cache stats
      cacheStats.subscribe(() => {});
    }, 2000);
  } else if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Cleanup on unmount
  onMount(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });
  
  function clearCache() {
    pageManager.updateCachePolicy({ maxAge: 0 }); // Force everything to be stale
    setTimeout(() => {
      pageManager.updateCachePolicy({ maxAge: 5 * 60 * 1000 }); // Reset to 5 minutes
    }, 100);
  }
  
  function toggleCachePolicy() {
    const currentStats = $cacheStats;
    if (currentStats.totalCachedContainers > 5) {
      // Reduce cache size
      pageManager.updateCachePolicy({ 
        maxCacheSize: 5,
        preloadCount: 3
      });
    } else {
      // Increase cache size
      pageManager.updateCachePolicy({ 
        maxCacheSize: 20,
        preloadCount: 10
      });
    }
  }
</script>

<!-- Debug Toggle Button -->
<button 
  class="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-mono"
  on:click={() => showDebug = !showDebug}
>
  Cache {showDebug ? '📊' : '🔍'}
</button>

<!-- Debug Panel -->
{#if showDebug}
  <div class="fixed bottom-16 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
    <h3 class="font-bold text-sm mb-3 text-gray-800">Section Cache Stats</h3>
    
    <div class="space-y-2 text-xs font-mono">
      <div class="flex justify-between">
        <span class="text-gray-600">Cached Containers:</span>
        <span class="font-bold">{$cacheStats.totalCachedContainers}</span>
      </div>
      
      <div class="flex justify-between">
        <span class="text-gray-600">Cached Sections:</span>
        <span class="font-bold">{$cacheStats.totalCachedSections}</span>
      </div>
      
      <div class="flex justify-between">
        <span class="text-gray-600">Collections:</span>
        <span class="font-bold">{$cacheStats.collectionsWithCache}</span>
      </div>
      
      <div class="flex justify-between">
        <span class="text-gray-600">Stale Entries:</span>
        <span class="font-bold text-orange-600">{$cacheStats.staleCacheCount}</span>
      </div>
      
      <div class="flex justify-between">
        <span class="text-gray-600">Hit Rate:</span>
        <span class="font-bold text-green-600">{$cacheStats.cacheHitRate?.toFixed(1)}%</span>
      </div>
      
      <div class="flex justify-between">
        <span class="text-gray-600">Cache Size:</span>
        <span class="font-bold">{($cacheStats.totalCacheSize / 1024).toFixed(1)}KB</span>
      </div>
    </div>
    
    <div class="mt-4 space-y-2">
      <button 
        class="w-full bg-red-500 text-white px-2 py-1 rounded text-xs"
        on:click={clearCache}
      >
        Clear Cache
      </button>
      
      <button 
        class="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs"
        on:click={toggleCachePolicy}
      >
        Toggle Cache Size
      </button>
    </div>
    
    <div class="mt-2 text-xs text-gray-500">
      Auto-refreshing every 2s
    </div>
  </div>
{/if}

<style>
  /* Ensure debug panel appears above everything */
  .fixed {
    z-index: 9999;
  }
</style>