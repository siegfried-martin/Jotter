// src/routes/app/collections/[collection_id]/containers/[container_id]/+page.ts
import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { SectionCacheManager } from '$lib/stores/sectionCacheStore';
import { UserService } from '$lib/services/userService';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
  console.log('🔍 Container page loader started:', {
    collectionId: params.collection_id,
    containerId: params.container_id
  });
  
  // Only run data loading in the browser where auth tokens are available
  if (!browser) {
    console.log('🔄 Server-side render: returning minimal data');
    return {
      container: null,
      sections: [],
      collection: null,
      containers: [],
      collectionId: params.collection_id,
      isServerSide: true
    };
  }
  
  try {
    const collectionId = params.collection_id;
    const containerId = params.container_id;
    
    // Debug: Check if params are being passed correctly
    if (!collectionId) {
      console.error('❌ Missing collection_id parameter');
      throw error(400, 'Missing collection ID');
    }
    
    if (!containerId) {
      console.error('❌ Missing container_id parameter');
      throw error(400, 'Missing container ID');
    }
    
    console.log('📡 Loading parent layout data...');
    let layoutData;
    try {
      layoutData = await parent();
      console.log('✅ Layout data loaded:', {
        hasCollection: !!layoutData.collection,
        containerCount: layoutData.containers?.length || 0,
        collectionName: layoutData.collection?.name,
        isServerSide: layoutData.isServerSide
      });
    } catch (err) {
      console.error('❌ Parent layout data failed:', err);
      throw err;
    }
    
    // If parent was server-side rendered, we need to load the data client-side
    if (layoutData.isServerSide) {
      console.log('📡 Parent was server-side, loading layout data client-side...');
      window.location.reload();
      return {
        container: null,
        sections: [],
        collection: null,
        containers: [],
        collectionId,
        isServerSide: true
      };
    }
    
    // Verify the container exists in this collection
    console.log('🔍 Checking if container exists in collection...');
    const containerExists = layoutData.containers?.some(c => c.id === containerId);
    console.log('Container exists check:', { containerExists, containerId });
    
    if (!containerExists) {
      console.error('❌ Container not found in collection');
      throw error(404, 'Container not found in this collection');
    }
    
    console.log('📡 Loading container and sections via enhanced cache...');
    
    // ✅ ENHANCED CACHE: Use cache-first for complete container data
    const containerDataPromise = SectionCacheManager.getContainerData(containerId)
      .then(result => {
        if (!result) {
          throw new Error('Container data not found');
        }
        console.log('✅ Container data loaded from cache:', {
          containerTitle: result.container.title,
          sectionsCount: result.sections.length,
          fromCache: true
        });
        return result;
      })
      .catch(async err => {
        console.error('❌ Cache failed, falling back to direct API:', err);
        
        // Fallback: Direct API calls (should be rare)
        const { NoteService } = await import('$lib/services/noteService');
        const { SectionService } = await import('$lib/services/sectionService');
        
        const [container, sections] = await Promise.all([
          NoteService.getNoteContainer(containerId),
          SectionService.getSections(containerId)
        ]);
        
        if (!container) {
          throw new Error('Container not found');
        }
        
        console.log('✅ Container data loaded via fallback API:', {
          containerTitle: container.title,
          sectionsCount: sections.length,
          fromCache: false
        });
        
        return { container, sections };
      });

    const containerData = await containerDataPromise;

    console.log('🔄 Updating last visited container...');
    // Update last visited container (fire and forget - this should be the ONLY network call)
    UserService.updateLastVisitedContainer(containerId).catch(error => {
      console.warn('⚠️ Failed to update last visited container:', error);
    });

    const result = {
      container: containerData.container,
      sections: containerData.sections,
      collection: layoutData.collection,
      containers: layoutData.containers,
      collectionId,
      isServerSide: false
    };
    
    console.log('✅ Container page loader completed successfully (cache-first):', {
      containerTitle: result.container.title,
      sectionCount: result.sections.length,
      collectionName: result.collection.name,
      cacheStats: SectionCacheManager.getCacheStats()
    });

    return result;
  } catch (err) {
    console.error('❌ Container page loader error:', {
      error: err,
      message: err.message,
      stack: err.stack,
      params
    });
    
    // Re-throw SvelteKit errors
    if (err.status) throw err;
    
    throw error(500, `Failed to load container: ${err.message}`);
  }
};