// src/routes/app/collections/[collection_id]/containers/[container_id]/+page.ts
import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { AppDataManager } from '$lib/stores/appDataStore';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  const collectionId = params.collection_id;
  const containerId = params.container_id;
  
  if (!collectionId || !containerId) {
    throw error(400, 'Missing required parameters');
  }
  
  // Server-side: return minimal data
  if (!browser) {
    return {
      collectionId,
      containerId,
      container: null,
      sections: [],
      fromCache: false,
      needsLoad: true
    };
  }
  
  // SYNCHRONOUS cache reads only - no async operations
  const collectionCached = AppDataManager.getCollectionDataSync(collectionId);
  
  if (!collectionCached) {
    // No collection data - need to load everything
    console.log('Container loader: No collection cache, need full load');
    return {
      collectionId,
      containerId,
      container: null,
      sections: [],
      fromCache: false,
      needsLoad: true
    };
  }
  
  // Find the container in the collection
  const container = collectionCached.containers.find(c => c.id === containerId);
  if (!container) {
    throw error(404, 'Container not found in collection');
  }
  
  // Check if we have sections cached
  const containerWithSections = AppDataManager.getContainerSectionsSync(collectionId, containerId);
  
  if (containerWithSections) {
    // Full cache hit - container and sections
    console.log('Container loader: Full cache hit');
    return {
      collectionId,
      containerId,
      collection: collectionCached.collection,
      containers: collectionCached.containers,
      container: containerWithSections.container,
      sections: containerWithSections.sections,
      fromCache: true,
      needsLoad: false
    };
  }
  
  // Partial cache hit - have container but no sections
  console.log('Container loader: Have container, missing sections');
  return {
    collectionId,
    containerId,
    collection: collectionCached.collection,
    containers: collectionCached.containers,
    container,
    sections: [],
    fromCache: true,
    needsLoadSections: true
  };
};