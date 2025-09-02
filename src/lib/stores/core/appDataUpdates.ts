// src/lib/stores/core/appDataUpdates.ts - Optimistic updates
import { appStore } from './appDataCore';
import type { Collection, NoteContainer, NoteSection } from '$lib/types';

// === OPTIMISTIC UPDATES ===
export function updateSectionsOptimistically(collectionId: string, containerId: string, sections: NoteSection[]): void {
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

export function updateContainerOptimistically(collectionId: string, container: NoteContainer): void {
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

export function updateContainerArrayOptimistically(collectionId: string, containers: NoteContainer[]): void {
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

export function updateCollectionsOptimistically(collections: Collection[]): void {
  console.log('Optimistic collections update:', collections.length);
  
  appStore.update(app => ({
    ...app,
    allCollections: collections,
    allCollectionsLoaded: true
  }));
}