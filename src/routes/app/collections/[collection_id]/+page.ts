// src/routes/app/collections/[collection_id]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  // Just use the layout data - no need to reload
  const layoutData = await parent();
  
  return {
    collection: layoutData.collection,
    containers: layoutData.containers,
    lastVisitedContainerId: layoutData.lastVisitedContainerId,
    collectionId: layoutData.collectionId
  };
};