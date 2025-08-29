// src/lib/stores/appDataStore.ts - Complete Implementation with Request Deduplication
import { writable, derived, get } from 'svelte/store';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { SectionService } from '$lib/services/sectionService';
import type { Collection, NoteContainer, NoteSection } from '$lib/types';

// === APP STATE INTERFACE ===
interface AppData {
  // All collections for header tabs
  allCollections: Collection[];
  allCollectionsLoaded: boolean;
  
  // Collection-specific cache
  collectionData: Map<string, {
    collection: Collection;
    containers: NoteContainer[];
    containerSections: Map<string, NoteSection[]>;
    lastUpdated: number;
  }>;
  
  // Current navigation context
  currentCollectionId: string | null;
  currentContainerId: string | null;
  
  // Loading and error states
  loading: Set<string>;
  errors: Map<string, string>;
}

// === STORE INITIALIZATION ===
const defaultState: AppData = {
  allCollections: [],
  allCollectionsLoaded: false,
  collectionData: new Map(),
  currentCollectionId: null,
  currentContainerId: null,
  loading: new Set(),
  errors: new Map()
};

const appStore = writable<AppData>(defaultState);

// === DERIVED STORES FOR COMPONENTS ===

// For AppHeader - all collections for navigation tabs
export const allCollectionsStore = derived(appStore, $app => ({
  collections: $app.allCollections,
  loaded: $app.allCollectionsLoaded,
  loading: $app.loading.has('allCollections'),
  error: $app.errors.get('allCollections') || null
}));

// For collection layouts - current collection containers
export const currentCollectionStore = derived(appStore, $app => {
  const collectionId = $app.currentCollectionId;
  
  if (!collectionId) {
    return {
      collection: null,
      containers: [],
      loading: false,
      error: null
    };
  }
  
  const data = $app.collectionData.get(collectionId);
  return {
    collection: data?.collection || null,
    containers: data?.containers || [],
    loading: $app.loading.has(collectionId),
    error: $app.errors.get(collectionId) || null
  };
});

// For container pages - current container with sections
export const currentContainerStore = derived(appStore, $app => {
  const collectionId = $app.currentCollectionId;
  const containerId = $app.currentContainerId;
  
  if (!collectionId || !containerId) {
    return {
      container: null,
      sections: [],
      allContainers: [],
      collection: null,
      loading: false,
      error: null
    };
  }
  
  const collectionData = $app.collectionData.get(collectionId);
  if (!collectionData) {
    return {
      container: null,
      sections: [],
      allContainers: [],
      collection: null,
      loading: $app.loading.has(collectionId),
      error: $app.errors.get(collectionId) || null
    };
  }
  
  const container = collectionData.containers.find(c => c.id === containerId);
  const sections = collectionData.containerSections.get(containerId) || [];
  const loadingKey = `${collectionId}:${containerId}`;
  
  return {
    container: container || null,
    sections,
    allContainers: collectionData.containers,
    collection: collectionData.collection,
    loading: $app.loading.has(loadingKey),
    error: $app.errors.get(loadingKey) || null
  };
});

// === DATA MANAGER CLASS ===
export class AppDataManager {
  // Request deduplication - prevent concurrent identical requests
  private static pendingRequests = new Map<string, Promise<any>>();
  
  // === CONTEXT MANAGEMENT ===
  static setCurrentContext(collectionId: string | null, containerId: string | null = null) {
    console.log('Setting app context:', { collectionId, containerId });
    appStore.update(app => ({
      ...app,
      currentCollectionId: collectionId,
      currentContainerId: containerId
    }));
  }
  
  // === ALL COLLECTIONS (for AppHeader tabs) ===
  static async ensureAllCollections(): Promise<Collection[]> {
    const current = get(appStore);
    
    // Return cached if already loaded
    if (current.allCollectionsLoaded && !current.loading.has('allCollections')) {
      console.log('All collections already loaded from cache');
      return current.allCollections;
    }
    
    // Return existing promise if request is in flight
    const requestKey = 'allCollections';
    if (this.pendingRequests.has(requestKey)) {
      console.log('All collections request already pending, returning existing promise');
      return this.pendingRequests.get(requestKey);
    }
    
    // Start new request
    const promise = this.loadAllCollections();
    this.pendingRequests.set(requestKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }
  
  private static async loadAllCollections(): Promise<Collection[]> {
    try {
      this.setLoading('allCollections', true);
      console.log('Loading all collections from API...');
      
      const collections = await CollectionService.getCollections();
      
      appStore.update(app => ({
        ...app,
        allCollections: collections,
        allCollectionsLoaded: true
      }));
      
      console.log('All collections loaded and cached:', collections.length);
      return collections;
      
    } catch (error) {
      console.error('Failed to load all collections:', error);
      this.setError('allCollections', error.message);
      throw error;
    } finally {
      this.setLoading('allCollections', false);
    }
  }
  
  // === COLLECTION DATA (for collection pages) ===
  static getCollectionDataSync(collectionId: string): {
    collection: Collection;
    containers: NoteContainer[];
  } | null {
    const app = get(appStore);
    const data = app.collectionData.get(collectionId);
    
    return data ? {
      collection: data.collection,
      containers: data.containers
    } : null;
  }
  
  static async ensureCollectionData(collectionId: string): Promise<{
    collection: Collection;
    containers: NoteContainer[];
  }> {
    // Check if already cached and fresh
    const cached = this.getCollectionDataSync(collectionId);
    if (cached && !this.isStale(collectionId)) {
      console.log('Collection data fresh in cache:', collectionId);
      return cached;
    }
    
    // Return existing promise if request is in flight
    const requestKey = `collection:${collectionId}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log('Collection request already pending, returning existing promise:', collectionId);
      return this.pendingRequests.get(requestKey);
    }
    
    // Start new request
    const promise = this.loadCollectionData(collectionId);
    this.pendingRequests.set(requestKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }
  
  private static async loadCollectionData(collectionId: string): Promise<{
    collection: Collection;
    containers: NoteContainer[];
  }> {
    try {
      this.setLoading(collectionId, true);
      console.log('Loading collection data from API:', collectionId);
      
      const [collection, containers] = await Promise.all([
        CollectionService.getCollection(collectionId),
        NoteService.getNoteContainers(collectionId)
      ]);
      
      // Sort containers by sequence
      const sortedContainers = containers.sort((a, b) => a.sequence - b.sequence);
      
      // Cache the data
      appStore.update(app => {
        const newCollectionData = new Map(app.collectionData);
        newCollectionData.set(collectionId, {
          collection,
          containers: sortedContainers,
          containerSections: new Map(),
          lastUpdated: Date.now()
        });
        
        return {
          ...app,
          collectionData: newCollectionData
        };
      });
      
      console.log('Collection data cached:', { collectionId, containerCount: sortedContainers.length });
      
      // Background preload top containers
      this.preloadContainerSections(collectionId, sortedContainers.slice(0, 3));
      
      return { collection, containers: sortedContainers };
      
    } catch (error) {
      console.error('Failed to load collection data:', error);
      this.setError(collectionId, error.message);
      throw error;
    } finally {
      this.setLoading(collectionId, false);
    }
  }
  
  // === CONTAINER SECTIONS ===
  static getContainerSectionsSync(collectionId: string, containerId: string): {
    container: NoteContainer;
    sections: NoteSection[];
  } | null {
    const app = get(appStore);
    const collectionData = app.collectionData.get(collectionId);
    
    if (!collectionData) return null;
    
    const container = collectionData.containers.find(c => c.id === containerId);
    const sections = collectionData.containerSections.get(containerId);
    
    return (container && sections) ? { container, sections } : null;
  }
  
  static async ensureContainerSections(collectionId: string, containerId: string): Promise<{
    container: NoteContainer;
    sections: NoteSection[];
  }> {
    // Ensure collection data exists first
    await this.ensureCollectionData(collectionId);
    
    // Check if sections are already cached
    const cached = this.getContainerSectionsSync(collectionId, containerId);
    if (cached) {
      console.log('Container sections found in cache:', containerId);
      return cached;
    }
    
    const loadingKey = `${collectionId}:${containerId}`;
    
    // Return existing promise if request is in flight
    if (this.pendingRequests.has(loadingKey)) {
      console.log('Container sections request already pending, returning existing promise:', containerId);
      return this.pendingRequests.get(loadingKey);
    }
    
    // Start new request
    const promise = this.loadContainerSections(collectionId, containerId);
    this.pendingRequests.set(loadingKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(loadingKey);
    }
  }
  
  private static async loadContainerSections(collectionId: string, containerId: string): Promise<{
    container: NoteContainer;
    sections: NoteSection[];
  }> {
    const loadingKey = `${collectionId}:${containerId}`;
    
    try {
      this.setLoading(loadingKey, true);
      console.log('Loading container sections from API:', containerId);
      
      const sections = await SectionService.getSections(containerId);
      
      // Cache the sections
      appStore.update(app => {
        const collectionData = app.collectionData.get(collectionId);
        if (collectionData) {
          collectionData.containerSections.set(containerId, sections);
          collectionData.lastUpdated = Date.now();
        }
        return { ...app };
      });
      
      console.log('Container sections cached:', { containerId, sectionCount: sections.length });
      
      return this.getContainerSectionsSync(collectionId, containerId)!;
      
    } catch (error) {
      console.error('Failed to load container sections:', error);
      this.setError(loadingKey, error.message);
      throw error;
    } finally {
      this.setLoading(loadingKey, false);
    }
  }
  
  // === OPTIMISTIC UPDATES (for real-time collaboration) ===
  static updateSectionsOptimistically(collectionId: string, containerId: string, sections: NoteSection[]): void {
    console.log('Optimistic section update:', { collectionId, containerId, sectionCount: sections.length });
    
    appStore.update(app => {
      const collectionData = app.collectionData.get(collectionId);
      if (collectionData) {
        collectionData.containerSections.set(containerId, sections);
        collectionData.lastUpdated = Date.now();
      }
      return { ...app };
    });
  }
  
  // Keep existing methods but update updateContainerOptimistically to be more efficient
  static updateContainerOptimistically(collectionId: string, container: NoteContainer): void {
    console.log('Optimistic individual container update:', { collectionId, containerId: container.id });
    
    appStore.update(app => {
      const collectionData = app.collectionData.get(collectionId);
      if (collectionData) {
        const index = collectionData.containers.findIndex(c => c.id === container.id);
        if (index >= 0) {
          // Create new array to trigger reactivity
          const newContainers = [...collectionData.containers];
          newContainers[index] = container;
          collectionData.containers = newContainers;
          collectionData.lastUpdated = Date.now();
        } else {
          console.warn('Container not found for individual update:', container.id);
        }
      }
      return { ...app };
    });
  }

  /**
   * Update entire container array optimistically - for cross-collection moves and reordering
   */
  static updateContainerArrayOptimistically(collectionId: string, containers: NoteContainer[]): void {
    console.log('Optimistic container array update:', { 
      collectionId, 
      containerCount: containers.length,
      containerTitles: containers.map(c => c.title)
    });
    
    appStore.update(app => {
      const collectionData = app.collectionData.get(collectionId);
      if (collectionData) {
        // Replace the entire container array - this triggers proper reactivity
        collectionData.containers = containers;
        collectionData.lastUpdated = Date.now();
        
        console.log('Container array updated in cache:', {
          newOrder: containers.map(c => c.title),
          cacheUpdated: true
        });
      } else {
        console.warn('Collection not found in cache for container array update:', collectionId);
      }
      return { ...app };
    });
  }
  
  // === UTILITY METHODS ===
  private static preloadContainerSections(collectionId: string, containers: NoteContainer[]): void {
    console.log('Preloading sections for containers:', containers.length);
    
    // Stagger requests to avoid overwhelming server
    containers.forEach((container, index) => {
      setTimeout(() => {
        this.ensureContainerSections(collectionId, container.id).catch(error => {
          console.warn('Failed to preload container:', container.id, error);
        });
      }, index * 150);
    });
  }
  
  private static isStale(collectionId: string): boolean {
    const app = get(appStore);
    const data = app.collectionData.get(collectionId);
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return data ? (Date.now() - data.lastUpdated) > maxAge : true;
  }
  
  private static setLoading(key: string, loading: boolean): void {
    appStore.update(app => {
      const newLoading = new Set(app.loading);
      if (loading) {
        newLoading.add(key);
      } else {
        newLoading.delete(key);
      }
      return { ...app, loading: newLoading };
    });
  }
  
  private static setError(key: string, error: string): void {
    appStore.update(app => {
      const newErrors = new Map(app.errors);
      newErrors.set(key, error);
      return { ...app, errors: newErrors };
    });
  }
  
  // === CACHE MANAGEMENT ===
  static clearCache(): void {
    console.log('Clearing entire app data cache');
    this.pendingRequests.clear(); // Clear pending requests too
    appStore.set(defaultState);
  }
  
  static invalidateCollection(collectionId: string): void {
    console.log('Invalidating collection cache:', collectionId);
    // Clear any pending requests for this collection
    this.pendingRequests.delete(`collection:${collectionId}`);
    
    appStore.update(app => {
      const newCollectionData = new Map(app.collectionData);
      newCollectionData.delete(collectionId);
      return { ...app, collectionData: newCollectionData };
    });
  }
  
  static getDebugInfo(): any {
    const app = get(appStore);
    return {
      allCollectionsLoaded: app.allCollectionsLoaded,
      cachedCollections: Array.from(app.collectionData.keys()),
      currentContext: {
        collectionId: app.currentCollectionId,
        containerId: app.currentContainerId
      },
      loading: Array.from(app.loading),
      errors: Object.fromEntries(app.errors),
      cacheSize: app.collectionData.size,
      pendingRequests: Array.from(this.pendingRequests.keys())
    };
  }

  
}