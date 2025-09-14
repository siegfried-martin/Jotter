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

// === ENHANCED DEBUG UTILITIES ===
export function getDetailedDebugInfo(): any {
  const app = get(appStore);
  
  // Create safe debug data (no direct references)
  const debugData = {
    allCollectionsLoaded: app.allCollectionsLoaded,
    allCollectionsCount: app.allCollections.length,
    cachedCollectionIds: Array.from(app.collectionData.keys()),
    currentContext: {
      collectionId: app.currentCollectionId,
      containerId: app.currentContainerId
    },
    loading: Array.from(app.loading),
    errors: Object.fromEntries(app.errors),
    cacheSize: app.collectionData.size,
    collectionDetails: {}
  };
  
  // Add collection-specific debug info
  for (const [collectionId, data] of app.collectionData.entries()) {
    debugData.collectionDetails[collectionId] = {
      hasCollection: !!data.collection,
      collectionName: data.collection?.name || 'Unknown',
      containerCount: data.containers?.length || 0,
      containerIds: data.containers?.map(c => c.id) || [],
      containerTitles: data.containers?.map(c => c.title) || [],
      sectionsCount: data.containerSections.size,
      containerSectionsMap: Array.from(data.containerSections.entries()).map(([containerId, sections]) => ({
        containerId,
        sectionCount: sections.length,
        sectionIds: sections.map(s => s.id)
      })),
      lastUpdated: new Date(data.lastUpdated).toISOString()
    };
  }
  
  return debugData;
}

// Add cache integrity checker
export function checkCacheIntegrity(): {
  isValid: boolean;
  issues: string[];
} {
  const app = get(appStore);
  const issues: string[] = [];
  
  // Check for reference mutations (basic check)
  for (const [collectionId, data] of app.collectionData.entries()) {
    if (!data.collection) {
      issues.push(`Collection ${collectionId} has null collection object`);
    }
    
    if (!Array.isArray(data.containers)) {
      issues.push(`Collection ${collectionId} has invalid containers array`);
    }
    
    if (!(data.containerSections instanceof Map)) {
      issues.push(`Collection ${collectionId} has invalid containerSections Map`);
    }
    
    // Check for empty containers when sections exist
    if (data.containers.length === 0 && data.containerSections.size > 0) {
      issues.push(`Collection ${collectionId} has sections but no containers (possible corruption)`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Console debug helper
export function logCacheDebug(collectionId?: string): void {
  if (collectionId) {
    const app = get(appStore);
    const data = app.collectionData.get(collectionId);
    console.group(`Cache Debug - Collection ${collectionId}`);
    console.log('Collection Data:', data);
    console.log('Containers:', data?.containers);
    console.log('Sections Map:', data?.containerSections);
    console.groupEnd();
  } else {
    console.group('Cache Debug - Full State');
    console.log('Detailed Debug Info:', getDetailedDebugInfo());
    console.log('Cache Integrity:', checkCacheIntegrity());
    console.groupEnd();
  }
}