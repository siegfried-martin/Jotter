// src/lib/composables/useCollectionCacheBridge.ts - Bridge between unified cache and old stores
import { onMount } from 'svelte';
import { CollectionService } from '$lib/services/collectionService';
import { UnifiedCollectionCache } from '$lib/stores/collectionCacheStore';
import { collectionActions } from '$lib/stores/collectionStore';
import type { Collection } from '$lib/types';

/**
 * Bridge composable that ensures collections are loaded into the old store
 * This maintains backward compatibility while introducing the unified cache
 */
export function useCollectionCacheBridge() {
  let allCollections: Collection[] = [];
  let loading = false;

  /**
   * Load all collections and populate both old store and unified cache
   */
  async function loadAndPreloadCollections(): Promise<void> {
    if (loading) return;
    
    try {
      loading = true;
      console.log('Loading collections for bridge...');
      
      // Get all user collections
      allCollections = await CollectionService.getCollections();
      console.log('Bridge loaded collections:', allCollections.length);
      
      // Update old collection store (for backward compatibility)
      collectionActions.setCollections(allCollections);
      
      // Preload top collections in unified cache for performance
      const topCollectionIds = allCollections
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3) // Preload top 3 recent collections
        .map(c => c.id);
      
      if (topCollectionIds.length > 0) {
        console.log('Preloading top collections in unified cache:', topCollectionIds);
        UnifiedCollectionCache.preloadCollections(topCollectionIds).catch(error => {
          console.warn('Failed to preload collections:', error);
        });
      }
      
    } catch (error) {
      console.error('Failed to load collections in bridge:', error);
      throw error;
    } finally {
      loading = false;
    }
  }

  /**
   * Get collections (from cache if available)
   */
  function getCollections(): Collection[] {
    return allCollections;
  }

  /**
   * Initialize bridge on mount
   */
  function initialize() {
    onMount(() => {
      loadAndPreloadCollections();
    });
  }

  return {
    initialize,
    loadAndPreloadCollections,
    getCollections,
    get loading() { return loading; },
    get collections() { return allCollections; }
  };
}