// src/lib/stores/core/appDataUtils.ts - Utility functions
import { get } from 'svelte/store';
import { appStore, defaultState } from './appDataCore';
import { clearPendingRequests, deletePendingRequest } from './appDataOperations';

// === STATE MANAGEMENT ===
export function setCurrentContext(collectionId: string | null, containerId: string | null = null): void {
  console.log('Setting app context:', { collectionId, containerId });
  appStore.update(app => ({
    ...app,
    currentCollectionId: collectionId,
    currentContainerId: containerId
  }));
}

export function setLoading(key: string, loading: boolean): void {
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

export function setError(key: string, error: string): void {
  appStore.update(app => {
    const newErrors = new Map(app.errors);
    newErrors.set(key, error);
    return { ...app, errors: newErrors };
  });
}

// === CACHE MANAGEMENT ===
export function clearCache(): void {
  console.log('Clearing entire app data cache');
  clearPendingRequests();
  appStore.set(defaultState);
}

export function invalidateCollection(collectionId: string): void {
  console.log('Invalidating collection cache:', collectionId);
  // Clear any pending requests for this collection
  deletePendingRequest(`collection:${collectionId}`);
  
  appStore.update(app => {
    const newCollectionData = new Map(app.collectionData);
    newCollectionData.delete(collectionId);
    return { ...app, collectionData: newCollectionData };
  });
}

export function getDebugInfo(): any {
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
    cacheSize: app.collectionData.size
  };
}