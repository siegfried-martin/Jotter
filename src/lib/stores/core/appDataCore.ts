// src/lib/stores/core/appDataCore.ts - Core store and types
import { writable, derived } from 'svelte/store';
import type { Collection, NoteContainer, NoteSection } from '$lib/types';

// === APP STATE INTERFACE ===
export interface AppData {
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

  // Track last visited container per collection (for smooth tab navigation)
  lastVisitedContainerByCollection: Map<string, string>;

  // Loading and error states
  loading: Set<string>;
  errors: Map<string, string>;
}

// === STORE INITIALIZATION ===
export const defaultState: AppData = {
  allCollections: [],
  allCollectionsLoaded: false,
  collectionData: new Map(),
  currentCollectionId: null,
  currentContainerId: null,
  lastVisitedContainerByCollection: new Map(),
  loading: new Set(),
  errors: new Map()
};

export const appStore = writable<AppData>(defaultState);

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
  
  console.log('🔍 currentContainerStore derived update:', {
    collectionId,
    containerId,
    hasCollectionData: collectionId ? !!$app.collectionData.get(collectionId) : false
  });
  
  if (!collectionId || !containerId) {
    console.log('🔍 Missing context, returning null state');
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
    console.log('🔍 No collection data found, returning loading state');
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
  
  console.log('🔍 Found collection data:', {
    containerFound: !!container,
    containersLength: collectionData.containers.length,
    sectionsLength: sections.length,
    containerTitles: collectionData.containers.map(c => c.title)
  });
  
  return {
    container: container || null,
    sections,
    allContainers: collectionData.containers,
    collection: collectionData.collection,
    loading: $app.loading.has(loadingKey),
    error: $app.errors.get(loadingKey) || null
  };
});