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