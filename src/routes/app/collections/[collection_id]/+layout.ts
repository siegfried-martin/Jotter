// src/routes/app/collections/[collection_id]/+layout.ts
import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { UserService } from '$lib/services/userService';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
  const collectionId = params.collection_id;
  console.log('🔍 Layout loader started for collection:', collectionId);
  
  // Only run data loading in the browser where auth tokens are available
  if (!browser) {
    console.log('📄 Server-side render: returning minimal data');
    return {
      collection: null,
      containers: [],
      collections: [],
      lastVisitedContainerId: null,
      collectionId,
      isServerSide: true
    };
  }
  
  try {
    // Load each service individually with specific error handling
    console.log('📡 Loading collection...');
    let collection;
    try {
      collection = await CollectionService.getCollection(collectionId);
      console.log('✅ Collection loaded:', collection?.name || 'null');
    } catch (err) {
      console.error('❌ Collection loading failed:', err);
      throw error(404, `Collection not found: ${err.message}`);
    }

    if (!collection) {
      console.error('❌ Collection is null');
      throw error(404, 'Collection not found');
    }

    console.log('📡 Loading containers...');
    let containers;
    try {
      containers = await NoteService.getNoteContainers(collectionId);
      console.log('✅ Containers loaded:', containers?.length || 0, 'containers');
    } catch (err) {
      console.error('❌ Containers loading failed:', err);
      containers = [];
      console.warn('⚠️ Using empty containers array due to error');
    }

    console.log('📡 Loading all collections...');
    let collections;
    try {
      collections = await CollectionService.getCollections();
      console.log('✅ Collections list loaded:', collections?.length || 0, 'collections');
    } catch (err) {
      console.error('❌ Collections list loading failed:', err);
      collections = [];
      console.warn('⚠️ Using empty collections array due to error');
    }

    console.log('📡 Loading last visited container...');
    let lastVisitedContainerId: string | null = null;
    try {
      lastVisitedContainerId = await UserService.getLastVisitedContainerId();
      console.log('✅ Last visited container:', lastVisitedContainerId || 'none');
    } catch (err) {
      console.warn('⚠️ Could not get last visited container:', err);
    }

    const result = {
      collection,
      containers: containers || [],
      collections: collections || [],
      lastVisitedContainerId,
      collectionId,
      isServerSide: false
    };
    
    console.log('✅ Layout loader completed successfully:', {
      collectionName: result.collection.name,
      containerCount: result.containers.length,
      collectionsCount: result.collections.length,
      lastVisited: result.lastVisitedContainerId
    });

    return result;
  } catch (err) {
    console.error('❌ Layout loader fatal error:', {
      error: err,
      message: err.message,
      stack: err.stack,
      collectionId
    });
    
    // Re-throw SvelteKit errors
    if (err.status) throw err;
    
    // Convert unknown errors to 500
    throw error(500, `Failed to load collection: ${err.message}`);
  }
};