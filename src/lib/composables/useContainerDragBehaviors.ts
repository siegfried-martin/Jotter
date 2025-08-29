// src/lib/composables/useContainerDragBehaviors.ts
import { createSectionDragBehavior } from '$lib/dnd/behaviors/SectionDragBehavior';
import { createContainerDragBehavior } from '$lib/dnd/behaviors/ContainerDragBehavior';
import { AppDataManager } from '$lib/stores/appDataStore';
import { NoteService } from '$lib/services/noteService';

/**
 * Drag & Drop behaviors with AppDataManager integration and cross-collection support
 */
export function useContainerDragBehaviors(
  pageManager: any, 
  storeValues: () => any,
  reorderArray: (array: any[], fromIndex: number, toIndex: number) => any[],
  handleCrossContainerMove: (event: CustomEvent) => Promise<void>
) {
  
  /**
   * Section drag behavior with AppDataManager updates
   */
  const sectionBehavior = createSectionDragBehavior(
    // Section reorder handler
    async (fromIndex: number, toIndex: number, containerId: string) => {
      console.log('Section reorder with AppDataManager:', fromIndex, '→', toIndex, 'in', containerId);
      
      const currentStoreValues = storeValues();
      const collectionId = currentStoreValues.currentCollectionId;
      
      if (!collectionId) {
        console.error('No collection ID available for section reorder');
        return;
      }
      
      // Get current sections directly from cache instead of reactive store
      const cachedData = AppDataManager.getContainerSectionsSync(collectionId, containerId);
      const currentSections = cachedData?.sections || [];
      
      if (!currentSections || currentSections.length === 0 || fromIndex === toIndex) {
        console.warn('No sections to reorder or invalid indices', {
          sectionsCount: currentSections.length,
          fromIndex,
          toIndex
        });
        return;
      }
      
      // Store original order for potential rollback
      const originalSections = [...currentSections];
      
      // 1. Optimistically update cache first
      const reorderedSections = reorderArray(currentSections, fromIndex, toIndex);
      
      if (reorderedSections.length !== originalSections.length) {
        console.error('Reorder function returned wrong number of sections', {
          original: originalSections.length,
          reordered: reorderedSections.length
        });
        return;
      }
      
      AppDataManager.updateSectionsOptimistically(collectionId, containerId, reorderedSections);
      
      try {
        // 2. Call API service
        const { SectionService } = await import('$lib/services/sectionService');
        const updatedSections = await SectionService.reorderSections(
          containerId, 
          fromIndex, 
          toIndex
        );
        
        // 3. Validate server response and only update if different
        if (updatedSections && Array.isArray(updatedSections) && updatedSections.length > 0) {
          const validUpdatedSections = updatedSections.filter(section => section && section.id);
          
          if (validUpdatedSections.length === reorderedSections.length) {
            const currentOptimisticOrder = reorderedSections.map(s => s.id).join(',');
            const serverOrder = validUpdatedSections.map(s => s.id).join(',');

            if (currentOptimisticOrder !== serverOrder) {
              console.log('Server order differs from optimistic, updating UI');
              AppDataManager.updateSectionsOptimistically(collectionId, containerId, validUpdatedSections);
            } else {
              console.log('Server matches optimistic update, no UI change needed');
            }
          }
        }
        
        console.log('Section reorder completed successfully');
      } catch (error) {
        console.error('Section reorder failed:', error);
        AppDataManager.updateSectionsOptimistically(collectionId, containerId, originalSections);
      }
    },
    
    // Cross-container move handler  
    async (sectionId: string, fromContainer: string, toContainer: string) => {
      console.log('Section cross-container move with AppDataManager:', sectionId, fromContainer, '→', toContainer);
      
      // Use existing cross-container logic
      await handleCrossContainerMove({ 
        detail: { sectionId, fromContainer, toContainer } 
      } as CustomEvent);
    }
  );

  /**
   * Container drag behavior with AppDataManager updates and cross-collection support
   */
  const containerBehavior = createContainerDragBehavior(
    // Container reorder handler (same-collection)
    async (fromIndex: number, toIndex: number) => {
      console.log('Container reorder with AppDataManager:', fromIndex, '→', toIndex);
      
      if (fromIndex === toIndex) return;
      
      const currentStoreValues = storeValues();
      const collectionId = currentStoreValues.currentCollectionId;
      
      if (!collectionId) {
        console.error('No collection ID available for container reorder');
        return;
      }
      
      // Get containers directly from cache
      const cachedData = AppDataManager.getCollectionDataSync(collectionId);
      const containers = cachedData?.containers || [];
      
      if (!containers || containers.length === 0) {
        console.error('No containers available for reorder');
        return;
      }
      
      // Store original order for potential rollback
      const originalContainers = [...containers];
      
      // 1. Create reordered array
      const reorderedContainers = reorderArray(containers, fromIndex, toIndex);
      
      if (reorderedContainers.length !== originalContainers.length) {
        console.error('Reorder function returned wrong number of containers');
        return;
      }
      
      // 2. Update the entire container array optimistically
      console.log('Updating container array optimistically');
      AppDataManager.updateContainerArrayOptimistically(collectionId, reorderedContainers);
      
      try {
        console.log('Calling NoteService.reorderNoteContainers...');
        
        // 3. Call API service
        const serverResponse = await NoteService.reorderNoteContainers(collectionId, fromIndex, toIndex);
        
        console.log('API call successful');
        
        // 4. Compare optimistic vs server order
        if (serverResponse && Array.isArray(serverResponse)) {
          const optimisticOrder = reorderedContainers.map(c => c.id).join(',');
          const serverOrder = serverResponse.map(c => c.id).join(',');
          
          if (optimisticOrder !== serverOrder) {
            console.log('Server container order differs from optimistic, updating with server order');
            AppDataManager.updateContainerArrayOptimistically(collectionId, serverResponse);
          } else {
            console.log('Server matches optimistic container update, no change needed');
          }
        }
        
        console.log('Container reorder completed successfully');
        
      } catch (error) {
        console.error('Container reorder failed:', error);
        console.log('Rolling back container reorder');
        AppDataManager.updateContainerArrayOptimistically(collectionId, originalContainers);
      }
    },
    
    // NEW: Cross-collection move handler
    async (containerId: string, targetCollectionId: string) => {
      console.log('Cross-collection container move:', containerId, '→', targetCollectionId);
      
      const currentStoreValues = storeValues();
      const sourceCollectionId = currentStoreValues.currentCollectionId;
      
      if (!sourceCollectionId || sourceCollectionId === targetCollectionId) {
        console.warn('Invalid cross-collection move parameters');
        return;
      }
      
      // Get current source collection data
      const sourceData = AppDataManager.getCollectionDataSync(sourceCollectionId);
      const sourceContainers = sourceData?.containers || [];
      
      // Find the container to move
      const containerToMove = sourceContainers.find(c => c.id === containerId);
      if (!containerToMove) {
        console.error('Container not found in source collection');
        return;
      }
      
      console.log('Moving container:', containerToMove.title, 'to collection:', targetCollectionId);
      
      // Store original state for rollback
      const originalSourceContainers = [...sourceContainers];
      
      // 1. Optimistic update: Remove from source collection immediately
      const updatedSourceContainers = sourceContainers.filter(c => c.id !== containerId);
      AppDataManager.updateContainerArrayOptimistically(sourceCollectionId, updatedSourceContainers);
      
      try {
        // 2. Call API to move container
        await NoteService.moveToCollection(containerId, targetCollectionId);
        
        console.log('Cross-collection move API succeeded');
        
        // 3. Invalidate target collection cache to force fresh data load
        // This ensures the target collection shows the moved container
        AppDataManager.invalidateCollection(targetCollectionId);
        
        // 4. Optionally preload target collection if user might navigate there
        AppDataManager.ensureCollectionData(targetCollectionId).catch(error => {
          console.warn('Failed to preload target collection:', error);
        });
        
        console.log('Cross-collection container move completed successfully');
        
      } catch (error) {
        console.error('Cross-collection move failed, rolling back:', error);
        
        // Rollback: restore container to source collection
        AppDataManager.updateContainerArrayOptimistically(sourceCollectionId, originalSourceContainers);
      }
    }
  );
  
  return {
    sectionBehavior,
    containerBehavior
  };
}