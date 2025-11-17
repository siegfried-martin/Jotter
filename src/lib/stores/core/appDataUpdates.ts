// src/lib/stores/core/appDataUpdates.ts - Optimistic updates with immutability fixes
import { appStore } from './appDataCore';
import type { Collection, NoteContainer, NoteSection } from '$lib/types';

// === DEEP CLONE UTILITIES ===
function deepCloneArray<T>(arr: T[]): T[] {
  return arr.map(item => deepCloneObject(item));
}

function deepCloneObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (Array.isArray(obj)) return deepCloneArray(obj) as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepCloneObject(obj[key]);
    }
  }
  return cloned;
}

// === OPTIMISTIC UPDATES ===
export function updateSectionsOptimistically(collectionId: string, containerId: string, sections: NoteSection[]): void {
  console.log('Optimistic section update with immutability:', { collectionId, containerId, sectionCount: sections.length });
  
  appStore.update(app => {
    const collectionData = app.collectionData.get(collectionId);
    if (collectionData) {
      // CRITICAL FIX: Create completely new Map and deep clone sections
      const newSectionsMap = new Map(collectionData.containerSections);
      newSectionsMap.set(containerId, deepCloneArray(sections));
      
      // Create new collection data object to avoid mutation
      const newCollectionData = new Map(app.collectionData);
      newCollectionData.set(collectionId, {
        ...collectionData, // Spread existing data
        containerSections: newSectionsMap, // Replace with new Map
        lastUpdated: Date.now()
      });
      
      return { ...app, collectionData: newCollectionData };
    }
    console.warn('Collection not found for section update:', collectionId);
    return app;
  });
}

export function updateContainerOptimistically(collectionId: string, container: NoteContainer): void {
  console.log('Optimistic individual container update with immutability:', { collectionId, containerId: container.id });
  
  appStore.update(app => {
    const collectionData = app.collectionData.get(collectionId);
    if (collectionData) {
      const index = collectionData.containers.findIndex(c => c.id === container.id);
      if (index >= 0) {
        // CRITICAL FIX: Deep clone the entire containers array and update
        const newContainers = deepCloneArray(collectionData.containers);
        newContainers[index] = deepCloneObject(container);
        
        // Create new collection data object
        const newCollectionData = new Map(app.collectionData);
        newCollectionData.set(collectionId, {
          ...collectionData,
          containers: newContainers, // Replace with new array
          lastUpdated: Date.now()
        });
        
        return { ...app, collectionData: newCollectionData };
      } else {
        console.warn('Container not found for individual update:', container.id);
      }
    } else {
      console.warn('Collection not found for container update:', collectionId);
    }
    return app;
  });
}

export function updateContainerArrayOptimistically(collectionId: string, containers: NoteContainer[]): void {
  console.log('Optimistic container array update with immutability:', { 
    collectionId, 
    containerCount: containers.length,
    containerTitles: containers.map(c => c.title)
  });
  
  appStore.update(app => {
    const collectionData = app.collectionData.get(collectionId);
    if (collectionData) {
      // CRITICAL FIX: Deep clone containers array and create new collection data
      const newContainers = deepCloneArray(containers);
      
      // Create completely new collection data object
      const newCollectionData = new Map(app.collectionData);
      newCollectionData.set(collectionId, {
        ...collectionData, // Spread existing data
        containers: newContainers, // Replace with deep cloned array
        lastUpdated: Date.now()
      });
      
      console.log('Container array updated immutably in cache:', {
        newOrder: newContainers.map(c => c.title),
        cacheUpdated: true
      });
      
      return { ...app, collectionData: newCollectionData };
    } else {
      console.warn('Collection not found in cache for container array update:', collectionId);
    }
    return app;
  });
}

export function updateCollectionsOptimistically(collections: Collection[]): void {
  console.log('Optimistic collections update with immutability:', collections.length);

  appStore.update(app => ({
    ...app,
    allCollections: deepCloneArray(collections), // Deep clone before storing
    allCollectionsLoaded: true
  }));
}

export function addCollectionOptimistically(collection: Collection): void {
  console.log('🚀 addCollectionOptimistically START:', {
    collectionId: collection.id,
    collectionName: collection.name
  });

  appStore.update(app => {
    // Check if collection already exists (shouldn't happen, but be safe)
    const exists = app.allCollections.some(c => c.id === collection.id);
    if (exists) {
      console.warn('⚠️ Collection already exists in cache:', collection.id);
      return app;
    }

    console.log('📝 Cache state BEFORE update:', {
      allCollectionsCount: app.allCollections.length,
      collectionDataSize: app.collectionData.size,
      collectionDataKeys: Array.from(app.collectionData.keys())
    });

    // Add new collection to the allCollections array
    const newCollections = [...app.allCollections, deepCloneObject(collection)];

    // Also initialize the collection data with empty containers
    // This prevents cache misses when navigating to the new collection
    const newCollectionData = new Map(app.collectionData);
    newCollectionData.set(collection.id, {
      collection: deepCloneObject(collection),
      containers: [], // New collection has no containers yet
      containerSections: new Map(),
      lastUpdated: Date.now()
    });

    console.log('✅ Cache state AFTER update:', {
      allCollectionsCount: newCollections.length,
      collectionDataSize: newCollectionData.size,
      collectionDataKeys: Array.from(newCollectionData.keys()),
      newCollectionInCache: newCollectionData.has(collection.id)
    });

    const newState = {
      ...app,
      allCollections: newCollections,
      allCollectionsLoaded: true,
      collectionData: newCollectionData
    };

    console.log('🏁 addCollectionOptimistically COMPLETE for:', collection.id);

    return newState;
  });
}