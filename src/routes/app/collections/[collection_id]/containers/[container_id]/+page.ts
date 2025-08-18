// src/routes/app/collections/[collection_id]/containers/[container_id]/+page.ts
import { error, redirect } from '@sveltejs/kit';
import { NoteService } from '$lib/services/noteService';
import { SectionService } from '$lib/services/sectionService';
import { UserService } from '$lib/services/userService';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
  console.log('🔍 Container page loader started:', {
    collectionId: params.collection_id,
    containerId: params.container_id
  });
  
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
        collectionName: layoutData.collection?.name
      });
    } catch (err) {
      console.error('❌ Parent layout data failed:', err);
      
      // If authentication issue, redirect to login
      if (err.message?.includes('User not authenticated') || err.message?.includes('not authenticated')) {
        console.log('🔄 User not authenticated, redirecting to login');
        throw redirect(302, '/');
      }
      
      throw err; // Re-throw other errors
    }
    
    // Verify the container exists in this collection
    console.log('🔍 Checking if container exists in collection...');
    const containerExists = layoutData.containers?.some(c => c.id === containerId);
    console.log('Container exists check:', { containerExists, containerId });
    
    if (!containerExists) {
      console.error('❌ Container not found in collection');
      throw error(404, 'Container not found in this collection');
    }
    
    console.log('📡 Loading container and sections...');
    
    // Load container data and its sections in parallel
    const containerPromise = NoteService.getNoteContainer(containerId)
      .then(result => {
        console.log('✅ Container loaded:', result?.title || 'null');
        return result;
      })
      .catch(err => {
        console.error('❌ Container loading failed:', err);
        
        // If authentication issue, redirect to login
        if (err.message?.includes('User not authenticated') || err.message?.includes('not authenticated')) {
          console.log('🔄 User not authenticated, redirecting to login');
          throw redirect(302, '/');
        }
        
        throw err;
      });
    
    const sectionsPromise = SectionService.getSections(containerId)
      .then(result => {
        console.log('✅ Sections loaded:', result?.length || 0, 'sections');
        return result;
      })
      .catch(err => {
        console.error('❌ Sections loading failed:', err);
        
        // If authentication issue, redirect to login
        if (err.message?.includes('User not authenticated') || err.message?.includes('not authenticated')) {
          console.log('🔄 User not authenticated, redirecting to login');
          throw redirect(302, '/');
        }
        
        throw err;
      });
    
    const [container, sections] = await Promise.all([
      containerPromise,
      sectionsPromise
    ]);

    if (!container) {
      console.error('❌ Container not found after loading');
      throw error(404, 'Container not found');
    }

    console.log('🔄 Updating last visited container...');
    // Update last visited container (fire and forget)
    UserService.updateLastVisitedContainer(containerId).catch(error => {
      console.warn('⚠️ Failed to update last visited container:', error);
    });

    const result = {
      container,
      sections: sections || [],
      collection: layoutData.collection,
      containers: layoutData.containers,
      collectionId
    };
    
    console.log('✅ Container page loader completed successfully:', {
      containerTitle: result.container.title,
      sectionCount: result.sections.length,
      collectionName: result.collection.name
    });

    return result;
  } catch (err) {
    console.error('❌ Container page loader error:', {
      error: err,
      message: err.message,
      stack: err.stack,
      params
    });
    
    // Re-throw SvelteKit errors (including redirects)
    if (err.status) throw err;
    
    throw error(500, `Failed to load container: ${err.message}`);
  }
};