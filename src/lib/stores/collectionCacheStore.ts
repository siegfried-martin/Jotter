// src/lib/stores/collectionCacheStore.ts - Cache-First Implementation
import { writable, derived, get } from 'svelte/store';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { SectionService } from '$lib/services/sectionService';
import type { Collection, NoteContainer, NoteSection } from '$lib/types';

// === SYNCHRONOUS CACHE INTERFACE ===

export interface CacheResult<T> {
  data: T | null;
  isFromCache: boolean;
  isStale: boolean;
  needsRefresh: boolean;
}

interface CollectionCacheData {
  collection: Collection;
  containers: NoteContainer[];
  containerSections: Map<string, NoteSection[]>;
  lastUpdated: number;
}

// === CACHE STATE ===

const cacheStore = writable<Map<string, CollectionCacheData>>(new Map());
const loadingStore = writable<Set<string>>(new Set()); // Track what's loading
const errorStore = writable<Map<string, string>>(new Map()); // Track errors

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 2 * 60 * 1000;  // 2 minutes until considered stale

// === MAIN CACHE INTERFACE ===

export class UnifiedCollectionCache {
  
  /**
   * SYNCHRONOUS: Get collection data from cache immediately
   * Returns null if not cached - no async operations
   * This is the foundation for eliminating SvelteKit loading states
   */
  static getCachedCollectionData(collectionId: string): CacheResult<{
    collection: Collection;
    containers: NoteContainer[];
  }> {
    const cache = get(cacheStore);
    const entry = cache.get(collectionId);
    const now = Date.now();
    
    if (!entry) {
      return { data: null, isFromCache: false, isStale: false, needsRefresh: true };
    }
    
    const age = now - entry.lastUpdated;
    const isStale = age > STALE_TTL;
    const needsRefresh = age > CACHE_TTL;
    
    return {
      data: {
        collection: entry.collection,
        containers: entry.containers
      },
      isFromCache: true,
      isStale,
      needsRefresh
    };
  }
  
  /**
   * SYNCHRONOUS: Get container sections from cache immediately
   */
  static getCachedContainerSections(collectionId: string, containerId: string): CacheResult<{
    container: NoteContainer;
    sections: NoteSection[];
  }> {
    const collectionResult = this.getCachedCollectionData(collectionId);
    
    if (!collectionResult.data) {
      return { data: null, isFromCache: false, isStale: false, needsRefresh: true };
    }
    
    const container = collectionResult.data.containers.find(c => c.id === containerId);
    if (!container) {
      return { data: null, isFromCache: false, isStale: false, needsRefresh: true };
    }
    
    const cache = get(cacheStore);
    const entry = cache.get(collectionId);
    const sections = entry.containerSections.get(containerId) || [];
    
    return {
      data: { container, sections },
      isFromCache: sections.length > 0,
      isStale: collectionResult.isStale,
      needsRefresh: collectionResult.needsRefresh || sections.length === 0
    };
  }
  
  /**
   * ASYNC: Ensure collection data is loaded and fresh
   * This runs in background - UI doesn't wait for it
   */
  static async ensureCollectionData(collectionId: string): Promise<void> {
    const cached = this.getCachedCollectionData(collectionId);
    
    // Skip if fresh data exists
    if (cached.data && !cached.needsRefresh) {
      console.log('Collection data is fresh, skipping refresh:', collectionId);
      return;
    }
    
    // Prevent duplicate loading
    const loading = get(loadingStore);
    if (loading.has(collectionId)) {
      console.log('Collection already loading:', collectionId);
      return;
    }
    
    try {
      this.setLoading(collectionId, true);
      console.log('Loading collection data:', collectionId);
      
      const [collection, containers] = await Promise.all([
        CollectionService.getCollection(collectionId),
        NoteService.getNoteContainers(collectionId)
      ]);
      
      // Sort by most recent
      const sortedContainers = containers.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      // Update cache
      this.setCachedCollection(collectionId, collection, sortedContainers);
      
      // Preload top containers in background
      this.preloadTopContainers(collectionId, sortedContainers.slice(0, 5));
      
    } catch (error) {
      console.error('Failed to load collection:', error);
      this.setError(collectionId, error.message);
    } finally {
      this.setLoading(collectionId, false);
    }
  }
  
  /**
   * ASYNC: Ensure container sections are loaded
   */
  static async ensureContainerSections(collectionId: string, containerId: string): Promise<void> {
    const cached = this.getCachedContainerSections(collectionId, containerId);
    
    // Skip if we have sections and they're not stale
    if (cached.data?.sections.length > 0 && !cached.needsRefresh) {
      console.log('Container sections are fresh, skipping refresh:', containerId);
      return;
    }
    
    const loadingKey = `${collectionId}:${containerId}`;
    const loading = get(loadingStore);
    if (loading.has(loadingKey)) {
      console.log('Container sections already loading:', containerId);
      return;
    }
    
    try {
      this.setLoading(loadingKey, true);
      console.log('Loading container sections:', containerId);
      
      const sections = await SectionService.getSections(containerId);
      this.setCachedContainerSections(collectionId, containerId, sections);
      
    } catch (error) {
      console.error('Failed to load container sections:', error);
      this.setError(loadingKey, error.message);
    } finally {
      this.setLoading(loadingKey, false);
    }
  }
  
  /**
   * OPTIMISTIC UPDATES: Update cache with local changes
   * This is key for collaborative features later
   */
  static updateCacheOptimistically(
    collectionId: string, 
    containerId: string, 
    sections: NoteSection[]
  ): void {
    console.log('Optimistic update:', { collectionId, containerId, sectionCount: sections.length });
    
    cacheStore.update(cache => {
      const entry = cache.get(collectionId);
      if (entry) {
        entry.containerSections.set(containerId, sections);
        entry.lastUpdated = Date.now(); // Keep cache fresh
      }
      return new Map(cache);
    });
  }
  
  // === PRIVATE CACHE MANAGEMENT ===
  
  private static setCachedCollection(
    collectionId: string, 
    collection: Collection, 
    containers: NoteContainer[]
  ): void {
    cacheStore.update(cache => {
      const existing = cache.get(collectionId);
      const entry: CollectionCacheData = {
        collection,
        containers,
        containerSections: existing?.containerSections || new Map(),
        lastUpdated: Date.now()
      };
      
      const newCache = new Map(cache);
      newCache.set(collectionId, entry);
      return newCache;
    });
    
    console.log('Cached collection data:', { collectionId, containerCount: containers.length });
  }
  
  private static setCachedContainerSections(
    collectionId: string,
    containerId: string, 
    sections: NoteSection[]
  ): void {
    cacheStore.update(cache => {
      const entry = cache.get(collectionId);
      if (entry) {
        entry.containerSections.set(containerId, sections);
        entry.lastUpdated = Date.now();
      }
      return new Map(cache);
    });
    
    console.log('Cached container sections:', { collectionId, containerId, sectionCount: sections.length });
  }
  
  private static async preloadTopContainers(collectionId: string, containers: NoteContainer[]): Promise<void> {
    // Preload in small batches to avoid overwhelming server
    for (let i = 0; i < containers.length; i += 2) {
      const batch = containers.slice(i, i + 2);
      await Promise.allSettled(
        batch.map(c => this.ensureContainerSections(collectionId, c.id))
      );
      
      // Small delay between batches
      if (i + 2 < containers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  private static setLoading(key: string, isLoading: boolean): void {
    loadingStore.update(loading => {
      const newLoading = new Set(loading);
      if (isLoading) {
        newLoading.add(key);
      } else {
        newLoading.delete(key);
      }
      return newLoading;
    });
  }
  
  private static setError(key: string, error: string): void {
    errorStore.update(errors => {
      const newErrors = new Map(errors);
      newErrors.set(key, error);
      return newErrors;
    });
  }
  
  /**
   * ASYNC: Preload multiple collections in background
   */
  static async preloadCollections(collectionIds: string[]): Promise<void> {
    console.log('Preloading collections:', collectionIds);
    
    const results = await Promise.allSettled(
      collectionIds.map(id => this.ensureCollectionData(id))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log('Collection preloading completed:', successful, '/', collectionIds.length);
  }
  
  // === PUBLIC UTILITIES ===
  
  static clearCache(): void {
    cacheStore.set(new Map());
    loadingStore.set(new Set());
    errorStore.set(new Map());
  }
  
  static invalidateCollection(collectionId: string): void {
    cacheStore.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(collectionId);
      return newCache;
    });
  }
}

// === REACTIVE EXPORTS FOR UI ===

export const cacheStatus = derived(
  [cacheStore, loadingStore, errorStore],
  ([cache, loading, errors]) => ({
    cachedCollections: Array.from(cache.keys()),
    loadingItems: Array.from(loading),
    errors: Object.fromEntries(errors)
  })
);