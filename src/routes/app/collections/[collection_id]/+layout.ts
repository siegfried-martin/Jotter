// src/routes/app/collections/[collection_id]/+layout.ts
import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { AppDataManager } from '$lib/stores/appDataStore';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => {
  const collectionId = params.collection_id;
  
  if (!collectionId) {
    throw error(400, 'Missing collection ID');
  }
  
  // Server-side: return minimal data
  if (!browser) {
    return {
      collectionId,
      collection: null,
      containers: [],
      fromCache: false,
      needsLoad: true
    };
  }
  
  // SYNCHRONOUS cache read only - no await calls
  const cached = AppDataManager.getCollectionDataSync(collectionId);
  
  console.log('Layout loader cache check:', { collectionId, hasCached: !!cached });
  
  if (cached) {
    // Cache hit - return immediately with no loading state
    return {
      collectionId,
      collection: cached.collection,
      containers: cached.containers,
      fromCache: true,
      needsLoad: false
    };
  }
  
  // Cache miss - return empty data, component handles loading
  return {
    collectionId,
    collection: null,
    containers: [],
    fromCache: false,
    needsLoad: true
  };
};