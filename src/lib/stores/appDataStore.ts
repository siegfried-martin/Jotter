// src/lib/stores/appDataStore.ts - Refactored with same API
export {
  allCollectionsStore,
  currentCollectionStore,
  currentContainerStore
} from './core/appDataCore';

import {
  loadAllCollections,
  loadCollectionData,
  loadContainerSections,
  getCollectionDataSync,
  getContainerSectionsSync
} from './core/appDataOperations';

import {
  updateSectionsOptimistically,
  updateContainerOptimistically,
  updateContainerArrayOptimistically,
  addCollectionOptimistically
} from './core/appDataUpdates';

import {
  setCurrentContext,
  clearCache,
  invalidateCollection,
  getDebugInfo
} from './core/appDataUtils';

// === EXACT SAME API AS BEFORE ===
export class AppDataManager {
  // === CONTEXT MANAGEMENT ===
  static setCurrentContext(collectionId: string | null, containerId: string | null = null) {
    return setCurrentContext(collectionId, containerId);
  }
  
  // === ALL COLLECTIONS ===
  static async ensureAllCollections() {
    return loadAllCollections();
  }
  
  // === COLLECTION DATA ===
  static getCollectionDataSync(collectionId: string) {
    return getCollectionDataSync(collectionId);
  }
  
  static async ensureCollectionData(collectionId: string) {
    return loadCollectionData(collectionId);
  }
  
  // === CONTAINER SECTIONS ===
  static getContainerSectionsSync(collectionId: string, containerId: string) {
    return getContainerSectionsSync(collectionId, containerId);
  }
  
  static async ensureContainerSections(collectionId: string, containerId: string) {
    return loadContainerSections(collectionId, containerId);
  }
  
  // === OPTIMISTIC UPDATES ===
  static updateSectionsOptimistically(collectionId: string, containerId: string, sections: any[]) {
    return updateSectionsOptimistically(collectionId, containerId, sections);
  }

  static updateContainerOptimistically(collectionId: string, container: any) {
    return updateContainerOptimistically(collectionId, container);
  }

  static updateContainerArrayOptimistically(collectionId: string, containers: any[]) {
    return updateContainerArrayOptimistically(collectionId, containers);
  }

  static addCollectionOptimistically(collection: any) {
    return addCollectionOptimistically(collection);
  }
  
  // === CACHE MANAGEMENT ===
  static clearCache() {
    return clearCache();
  }
  
  static invalidateCollection(collectionId: string) {
    return invalidateCollection(collectionId);
  }
  
  static getDebugInfo() {
    return getDebugInfo();
  }
}