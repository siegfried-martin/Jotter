// src/routes/app/collections/[collection_id]/+page.ts
import type { PageLoad } from './$types';
import { CollectionService } from '$lib/services/collectionService';
import { UserService } from '$lib/services/userService';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, url }) => {
  const collectionId = params.collection_id;
  
  try {
    // Verify collection exists and user has access
    const collections = await CollectionService.getCollections();
    const collection = collections.find(c => c.id === collectionId);
    
    if (!collection) {
      // Collection doesn't exist or no access - redirect to dashboard
      throw redirect(302, '/app');
    }
    
    // Update last visited collection (fire and forget)
    UserService.updateLastVisitedAndDefault(collectionId).catch(console.error);
    
    return {
      collection,
      collections,
      createNew: url.searchParams.has('create')
    };
  } catch (error) {
    if (error.status === 302) throw error; // Re-throw redirects
    
    console.error('Failed to load collection:', error);
    throw redirect(302, '/app');
  }
};