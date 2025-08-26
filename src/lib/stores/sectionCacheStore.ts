// src/lib/stores/sectionCacheStore.ts
import { writable, derived, get } from 'svelte/store';
import { SectionService } from '$lib/services/sectionService';
import { NoteService } from '$lib/services/noteService';
import type { 
  NoteSection, 
  NoteContainer, 
  CachePolicy, 
  CacheStats
} from '$lib/types';

// ===== ENHANCED CACHE TYPES =====
interface CachedContainerData {
  container: NoteContainer;
  sections: NoteSection[];
  lastFetched: number;
  lastModified: string;
  isStale: boolean;
  version: number;
}

interface ContainerCache {
  [containerId: string]: CachedContainerData;
}

interface CollectionCache {
  [collectionId: string]: {
    recentContainers: string[];
    lastUpdated: number;
    preloadedCount: number;
    serverTimestamp: string;
  };
}

interface SyncEvent {
  type: 'container_updated' | 'section_updated' | 'section_deleted' | 'container_deleted';
  containerId: string;
}

// ===== CONFIGURATION =====
const DEFAULT_CACHE_POLICY: CachePolicy = {
  maxAge: 5 * 60 * 1000,          // 5 minutes
  preloadCount: 10,               // Preload 10 most recent containers
  staleWhileRevalidate: true,     // UX optimization
  maxCacheSize: 50,              // Limit memory usage
  batchSize: 3                   // Concurrent preload limit
};

// ===== STORES =====
export const cachePolicyStore = writable<CachePolicy>(DEFAULT_CACHE_POLICY);
export const containerCacheStore = writable<ContainerCache>({});
export const collectionCacheStore = writable<CollectionCache>({});

// Performance tracking
const cacheMetrics = writable({
  hits: 0,
  misses: 0,
  totalRequests: 0
});

// ===== DERIVED STORES =====
export const cacheStats = derived(
  [containerCacheStore, collectionCacheStore, cacheMetrics],
  ([containers, collections, metrics]) => {
    const totalSections = Object.values(containers).reduce(
      (acc, cache) => acc + cache.sections.length, 
      0
    );
    
    const stats: CacheStats = {
      totalCachedContainers: Object.keys(containers).length,
      totalCachedSections: totalSections,
      collectionsWithCache: Object.keys(collections).length,
      staleCacheCount: Object.values(containers).filter(cache => cache.isStale).length,
      cacheHitRate: metrics.totalRequests > 0 ? (metrics.hits / metrics.totalRequests) * 100 : 0,
      totalCacheSize: totalSections * 1024 // Rough memory estimation
    };
    
    return stats;
  }
);

// ===== ENHANCED CACHE MANAGER CLASS =====
export class SectionCacheManager {
  
  /**
   * 🚀 Main entry point: Load collection and preload recent container data
   */
  static async loadCollectionWithCache(collectionId: string): Promise<void> {
    console.log('🚀 [Cache] Loading collection with enhanced cache:', collectionId);
    
    try {
      // 1. Get fresh container list to determine recency order
      const containers = await NoteService.getNoteContainers(collectionId);
      console.log('📦 [Cache] Found containers:', containers.length);
      
      // 2. Sort by most recent (updated_at desc) and limit
      const policy = get(cachePolicyStore);
      const sortedContainers = containers
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, policy.preloadCount);
      
      const recentContainerIds = sortedContainers.map(c => c.id);
      
      // 3. Update collection cache with recency order
      collectionCacheStore.update(cache => ({
        ...cache,
        [collectionId]: {
          recentContainers: recentContainerIds,
          lastUpdated: Date.now(),
          preloadedCount: 0,
          serverTimestamp: new Date().toISOString()
        }
      }));
      
      // 4. Preload complete container data (container + sections)
      this.preloadRecentContainerData(collectionId, sortedContainers);
      
      console.log('✅ [Cache] Collection cache initialized, preloading container data...');
      
    } catch (error) {
      console.error('❌ [Cache] Failed to load collection cache:', error);
      throw error;
    }
  }
  
  /**
   * 📦 Get complete container data - cache-first with fallback
   * Returns both container metadata and sections
   */
  static async getContainerData(containerId: string): Promise<{ container: NoteContainer; sections: NoteSection[] } | null> {
    const cache = get(containerCacheStore);
    const policy = get(cachePolicyStore);
    const now = Date.now();
    
    // Update metrics
    cacheMetrics.update(m => ({ ...m, totalRequests: m.totalRequests + 1 }));
    
    const cachedData = cache[containerId];
    
    // Cache hit: Check if fresh enough
    if (cachedData && !this.isCacheExpired(cachedData, policy, now)) {
      console.log('✅ [Cache] Cache hit for container data:', containerId);
      cacheMetrics.update(m => ({ ...m, hits: m.hits + 1 }));
      return {
        container: cachedData.container,
        sections: cachedData.sections
      };
    }
    
    // Cache miss or expired
    console.log('📡 [Cache] Cache miss/expired, fetching container data for:', containerId);
    cacheMetrics.update(m => ({ ...m, misses: m.misses + 1 }));
    
    // Stale-while-revalidate: Return stale data immediately, fetch in background
    if (cachedData && policy.staleWhileRevalidate && cachedData.isStale) {
      console.log('⚡ [Cache] Serving stale container data while revalidating:', containerId);
      this.fetchAndCacheContainerData(containerId); // Background fetch
      return {
        container: cachedData.container,
        sections: cachedData.sections
      };
    }
    
    // Fetch fresh data
    return await this.fetchAndCacheContainerData(containerId);
  }

  /**
   * 📦 Get sections only (backward compatibility)
   */
  static async getSections(containerId: string): Promise<NoteSection[]> {
    const containerData = await this.getContainerData(containerId);
    return containerData?.sections || [];
  }
  
  /**
   * 🔄 Preload complete container data for multiple containers (background operation)
   */
  private static async preloadRecentContainerData(collectionId: string, containers: NoteContainer[]): Promise<void> {
    console.log('🔄 [Cache] Preloading complete container data for recent containers:', containers.length);
    
    const policy = get(cachePolicyStore);
    let preloadedCount = 0;
    
    // Load container data in batches to avoid overwhelming the server
    for (let i = 0; i < containers.length; i += policy.batchSize) {
      const batch = containers.slice(i, i + policy.batchSize);
      
      const results = await Promise.allSettled(
        batch.map(async (container) => {
          try {
            await this.fetchAndCacheContainerData(container.id, container);
            preloadedCount++;
            console.log(`📦 [Cache] Preloaded ${preloadedCount}/${containers.length} containers`);
          } catch (error) {
            console.warn('⚠️ [Cache] Failed to preload container:', container.id, error);
          }
        })
      );
      
      // Small delay between batches to be server-friendly
      if (i + policy.batchSize < containers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Update collection cache with final preload count
    collectionCacheStore.update(cache => ({
      ...cache,
      [collectionId]: {
        ...cache[collectionId],
        preloadedCount
      }
    }));
    
    console.log('✅ [Cache] Preloading completed:', preloadedCount, 'containers cached');
  }
  
  /**
   * 📡 Fetch complete container data from server and update cache
   */
  private static async fetchAndCacheContainerData(containerId: string, existingContainer?: NoteContainer): Promise<{ container: NoteContainer; sections: NoteSection[] }> {
    try {
      // If we already have container metadata, only fetch sections
      const containerPromise = existingContainer 
        ? Promise.resolve(existingContainer)
        : NoteService.getNoteContainer(containerId);
      
      const sectionsPromise = SectionService.getSections(containerId);
      
      const [container, sections] = await Promise.all([containerPromise, sectionsPromise]);
      
      if (!container) {
        throw new Error(`Container ${containerId} not found`);
      }
      
      const now = Date.now();
      
      // Update cache with complete container data
      containerCacheStore.update(cache => {
        // Enforce cache size limit
        const policy = get(cachePolicyStore);
        const cacheKeys = Object.keys(cache);
        
        if (cacheKeys.length >= policy.maxCacheSize) {
          // Remove oldest entries (LRU-style)
          const sortedEntries = cacheKeys
            .map(key => ({ key, lastFetched: cache[key].lastFetched }))
            .sort((a, b) => a.lastFetched - b.lastFetched);
          
          const toRemove = sortedEntries.slice(0, Math.floor(policy.maxCacheSize * 0.2));
          toRemove.forEach(({ key }) => {
            delete cache[key];
          });
          
          console.log('🧹 [Cache] Evicted old entries:', toRemove.length);
        }
        
        return {
          ...cache,
          [containerId]: {
            container,
            sections,
            lastFetched: now,
            lastModified: new Date().toISOString(),
            isStale: false,
            version: 1
          }
        };
      });
      
      console.log('✅ [Cache] Cached complete container data:', containerId, sections.length, 'sections');
      return { container, sections };
      
    } catch (error) {
      console.error('❌ [Cache] Failed to fetch container data:', containerId, error);
      throw error;
    }
  }
  
  /**
   * ⏰ Check if cache entry is expired
   */
  private static isCacheExpired(cachedData: CachedContainerData, policy: CachePolicy, now: number): boolean {
    const age = now - cachedData.lastFetched;
    const isExpired = age > policy.maxAge;
    
    // Mark as stale if approaching expiration (80% of maxAge)
    if (age > policy.maxAge * 0.8 && !cachedData.isStale) {
      containerCacheStore.update(cache => ({
        ...cache,
        [Object.keys(cache).find(key => cache[key] === cachedData) || '']: {
          ...cachedData,
          isStale: true
        }
      }));
    }
    
    return isExpired;
  }
  
  /**
   * 🗑️ Invalidate cache for a specific container
   */
  static invalidateContainer(containerId: string): void {
    console.log('🗑️ [Cache] Invalidating cache for container:', containerId);
    
    containerCacheStore.update(cache => {
      const { [containerId]: removed, ...rest } = cache;
      return rest;
    });
  }
  
  /**
   * 🔄 Update cached container data when it changes locally
   */
  static updateCachedContainerData(containerId: string, container: NoteContainer, sections: NoteSection[]): void {
    console.log('🔄 [Cache] Updating cached container data:', containerId);
    
    containerCacheStore.update(cache => ({
      ...cache,
      [containerId]: {
        container,
        sections,
        lastFetched: Date.now(),
        lastModified: new Date().toISOString(),
        isStale: false,
        version: (cache[containerId]?.version || 0) + 1
      }
    }));
  }
  
  /**
   * 🔄 Update cached sections when they change locally (backward compatibility)
   */
  static updateCachedSections(containerId: string, sections: NoteSection[]): void {
    const cache = get(containerCacheStore);
    const existingCache = cache[containerId];
    
    if (existingCache) {
      this.updateCachedContainerData(containerId, existingCache.container, sections);
    }
  }
  
  /**
   * 🧹 Clear all caches (logout, debugging, or memory pressure)
   */
  static clearAllCaches(): void {
    console.log('🧹 [Cache] Clearing all caches');
    containerCacheStore.set({});
    collectionCacheStore.set({});
    cacheMetrics.set({ hits: 0, misses: 0, totalRequests: 0 });
  }
  
  /**
   * 📊 Get cache statistics for monitoring
   */
  static getCacheStats(): CacheStats {
    return get(cacheStats);
  }
  
  /**
   * ⚙️ Update cache policy at runtime
   */
  static updateCachePolicy(newPolicy: Partial<CachePolicy>): void {
    cachePolicyStore.update(current => ({ ...current, ...newPolicy }));
    console.log('⚙️ [Cache] Policy updated:', newPolicy);
  }
  
  // ===== FUTURE: REAL-TIME SYNC METHODS =====
  
  /**
   * 📢 Handle sync events from polling or WebSocket
   */
  static handleSyncEvent(event: SyncEvent): void {
    console.log('📢 [Cache] Handling sync event:', event);
    
    switch (event.type) {
      case 'container_updated':
      case 'section_updated':
        // Invalidate cache to force fresh fetch
        this.invalidateContainer(event.containerId);
        break;
        
      case 'section_deleted':
      case 'container_deleted':
        // Remove from cache entirely
        this.invalidateContainer(event.containerId);
        break;
    }
  }
  
  /**
   * 🔄 Check for updates from server (for polling system)
   */
  static async checkForServerUpdates(collectionId: string): Promise<string[]> {
    try {
      const containers = await NoteService.getNoteContainers(collectionId);
      const cache = get(containerCacheStore);
      const staleContainers: string[] = [];
      
      containers.forEach(container => {
        const cachedEntry = cache[container.id];
        if (cachedEntry) {
          const serverTime = new Date(container.updated_at).getTime();
          const cacheTime = new Date(cachedEntry.lastModified).getTime();
          
          if (serverTime > cacheTime) {
            staleContainers.push(container.id);
          }
        }
      });
      
      // Invalidate stale caches
      staleContainers.forEach(containerId => {
        this.invalidateContainer(containerId);
      });
      
      console.log('🔄 [Cache] Server sync check:', staleContainers.length, 'containers invalidated');
      return staleContainers;
      
    } catch (error) {
      console.error('❌ [Cache] Failed to check server updates:', error);
      return [];
    }
  }
}