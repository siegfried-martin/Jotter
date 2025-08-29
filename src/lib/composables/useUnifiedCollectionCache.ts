// src/lib/composables/useUnifiedCollectionCache.ts - Composable for unified cache integration
import { UnifiedCollectionCache } from '$lib/stores/collectionCacheStore';
import { noteActions } from '$lib/stores/noteStore';
import type { NoteContainer, NoteSection } from '$lib/types';

/**
 * Composable for managing collection cache integration with components
 */
export function useUnifiedCollectionCache(collectionId: string) {
  
  /**
   * Update cached container sections when they change locally
   */
  function updateCachedSections(containerId: string, sections: NoteSection[]) {
    const containers = getContainersFromCurrentStore();
    const container = containers?.find(c => c.id === containerId);
    
    if (container) {
      console.log('Updating unified cache with new sections:', containerId);
      UnifiedCollectionCache.updateCachedContainer(collectionId, container, sections);
    }
  }
  
  /**
   * Update cached container data when container changes locally
   */
  function updateCachedContainer(container: NoteContainer, sections: NoteSection[]) {
    console.log('Updating unified cache with new container data:', container.id);
    UnifiedCollectionCache.updateCachedContainer(collectionId, container, sections);
  }
  
  /**
   * Invalidate cache for a specific container (when deleted or moved)
   */
  function invalidateContainer(containerId: string) {
    console.log('Invalidating container in unified cache:', containerId);
    UnifiedCollectionCache.invalidateContainer(collectionId, containerId);
  }
  
  /**
   * Invalidate entire collection cache (when collection changes significantly)
   */
  function invalidateCollection() {
    console.log('Invalidating collection in unified cache:', collectionId);
    UnifiedCollectionCache.invalidateCollection(collectionId);
  }
  
  /**
   * Helper to get current containers from note store
   */
  function getContainersFromCurrentStore(): NoteContainer[] | null {
    // This would need to be implemented based on your current store structure
    // For now, returning null as a placeholder
    return null;
  }
  
  /**
   * Preload container data for improved navigation performance
   */
  async function preloadContainerData(containerId: string): Promise<boolean> {
    try {
      const collectionData = await UnifiedCollectionCache.getCollectionData(collectionId);
      const result = await collectionData.getCachedContainerData(containerId);
      return !!result;
    } catch (error) {
      console.warn('Failed to preload container data:', containerId, error);
      return false;
    }
  }
  
  /**
   * Handle navigation with cache-aware state updates
   */
  async function navigateToContainer(containerId: string): Promise<void> {
    try {
      console.log('Cache-aware navigation to container:', containerId);
      
      // Get collection data (should be cached at this point)
      const collectionData = await UnifiedCollectionCache.getCollectionData(collectionId);
      
      // Get container data (cache-first)
      const containerData = await collectionData.getCachedContainerData(containerId);
      
      if (containerData) {
        // Update store atomically to prevent flash
        noteActions.setSelectedContainerWithSections(
          containerData.container, 
          containerData.sections
        );
        console.log('Store updated atomically from unified cache');
      } else {
        console.warn('Container data not found in cache:', containerId);
      }
      
    } catch (error) {
      console.error('Cache-aware navigation failed:', error);
      throw error;
    }
  }
  
  return {
    // Cache updates
    updateCachedSections,
    updateCachedContainer,
    invalidateContainer,
    invalidateCollection,
    
    // Performance helpers
    preloadContainerData,
    navigateToContainer,
    
    // Cache stats (for debugging)
    getCacheStats: UnifiedCollectionCache.getCacheStats
  };
}