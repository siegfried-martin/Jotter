// src/lib/stores/core/appDataOperations.ts - Data loading operations
import { get } from 'svelte/store';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { SectionService } from '$lib/services/sectionService';
import { appStore } from './appDataCore';
import { setLoading, setError } from './appDataUtils';
import type { Collection, NoteContainer, NoteSection } from '$lib/types';

// Request deduplication - prevent concurrent identical requests
const pendingRequests = new Map<string, Promise<any>>();

// === ALL COLLECTIONS ===
export async function loadAllCollections(): Promise<Collection[]> {
  const current = get(appStore);
  
  // Return cached if already loaded
  if (current.allCollectionsLoaded && !current.loading.has('allCollections')) {
    console.log('All collections already loaded from cache');
    return current.allCollections;
  }
  
  // Return existing promise if request is in flight
  const requestKey = 'allCollections';
  if (pendingRequests.has(requestKey)) {
    console.log('All collections request already pending, returning existing promise');
    return pendingRequests.get(requestKey);
  }
  
  // Start new request
  const promise = _loadAllCollections();
  pendingRequests.set(requestKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(requestKey);
  }
}

async function _loadAllCollections(): Promise<Collection[]> {
  try {
    setLoading('allCollections', true);
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
    setError('allCollections', error.message);
    throw error;
  } finally {
    setLoading('allCollections', false);
  }
}

// === COLLECTION DATA ===
export function getCollectionDataSync(collectionId: string): {
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

export async function loadCollectionData(collectionId: string): Promise<{
  collection: Collection;
  containers: NoteContainer[];
}> {
  // Check if already cached and fresh
  const cached = getCollectionDataSync(collectionId);
  if (cached && !isStale(collectionId)) {
    console.log('Collection data fresh in cache:', collectionId);
    return cached;
  }
  
  // Return existing promise if request is in flight
  const requestKey = `collection:${collectionId}`;
  if (pendingRequests.has(requestKey)) {
    console.log('Collection request already pending, returning existing promise:', collectionId);
    return pendingRequests.get(requestKey);
  }
  
  // Start new request
  const promise = _loadCollectionData(collectionId);
  pendingRequests.set(requestKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(requestKey);
  }
}

async function _loadCollectionData(collectionId: string): Promise<{
  collection: Collection;
  containers: NoteContainer[];
}> {
  try {
    setLoading(collectionId, true);
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
    preloadContainerSections(collectionId, sortedContainers.slice(0, 3));
    
    return { collection, containers: sortedContainers };
    
  } catch (error) {
    console.error('Failed to load collection data:', error);
    setError(collectionId, error.message);
    throw error;
  } finally {
    setLoading(collectionId, false);
  }
}

// === CONTAINER SECTIONS ===
export function getContainerSectionsSync(collectionId: string, containerId: string): {
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

export async function loadContainerSections(collectionId: string, containerId: string): Promise<{
  container: NoteContainer;
  sections: NoteSection[];
}> {
  // Ensure collection data exists first
  await loadCollectionData(collectionId);
  
  // Check if sections are already cached
  const cached = getContainerSectionsSync(collectionId, containerId);
  if (cached) {
    console.log('Container sections found in cache:', containerId);
    return cached;
  }
  
  const loadingKey = `${collectionId}:${containerId}`;
  
  // Return existing promise if request is in flight
  if (pendingRequests.has(loadingKey)) {
    console.log('Container sections request already pending, returning existing promise:', containerId);
    return pendingRequests.get(loadingKey);
  }
  
  // Start new request
  const promise = _loadContainerSections(collectionId, containerId);
  pendingRequests.set(loadingKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(loadingKey);
  }
}

async function _loadContainerSections(collectionId: string, containerId: string): Promise<{
  container: NoteContainer;
  sections: NoteSection[];
}> {
  const loadingKey = `${collectionId}:${containerId}`;
  
  try {
    setLoading(loadingKey, true);
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
    
    return getContainerSectionsSync(collectionId, containerId)!;
    
  } catch (error) {
    console.error('Failed to load container sections:', error);
    setError(loadingKey, error.message);
    throw error;
  } finally {
    setLoading(loadingKey, false);
  }
}

// === UTILITY FUNCTIONS ===
function preloadContainerSections(collectionId: string, containers: NoteContainer[]): void {
  console.log('Preloading sections for containers:', containers.length);
  
  // Stagger requests to avoid overwhelming server
  containers.forEach((container, index) => {
    setTimeout(() => {
      loadContainerSections(collectionId, container.id).catch(error => {
        console.warn('Failed to preload container:', container.id, error);
      });
    }, index * 150);
  });
}

function isStale(collectionId: string): boolean {
  const app = get(appStore);
  const data = app.collectionData.get(collectionId);
  const maxAge = 5 * 60 * 1000; // 5 minutes
  return data ? (Date.now() - data.lastUpdated) > maxAge : true;
}

export function clearPendingRequests(): void {
  pendingRequests.clear();
}

export function deletePendingRequest(key: string): void {
  pendingRequests.delete(key);
}