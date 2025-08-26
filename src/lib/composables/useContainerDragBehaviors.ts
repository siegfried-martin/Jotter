// src/lib/composables/useContainerDragBehaviors.ts
import { createSectionDragBehavior } from '$lib/dnd/behaviors/SectionDragBehavior';
import { createContainerDragBehavior } from '$lib/dnd/behaviors/ContainerDragBehavior';
import { noteActions } from '$lib/stores/noteStore';

/**
 * Drag & Drop behaviors for containers and sections with cache integration
 */
export function useContainerDragBehaviors(
  pageManager: any, 
  storeValues: () => any, // This is a FUNCTION that returns current values
  reorderArray: (array: any[], fromIndex: number, toIndex: number) => any[],
  handleCrossContainerMove: (event: CustomEvent) => Promise<void>
) {
  
  /**
   * Section drag behavior with cache updates
   */
  const sectionBehavior = createSectionDragBehavior(
    // Section reorder handler
    async (fromIndex: number, toIndex: number, containerId: string) => {
      console.log('🎯 Section reorder:', fromIndex, '→', toIndex, 'in', containerId);
      
      // FIXED: Call the function to get current store values
      const currentStoreValues = storeValues();
      const { selectedContainerSections } = currentStoreValues.noteStore;
      
      if (!selectedContainerSections || fromIndex === toIndex) return;
      
      // Store original order for potential rollback
      const originalSections = [...selectedContainerSections];
      
      // Optimistically update UI
      const reorderedSections = reorderArray(selectedContainerSections, fromIndex, toIndex);
      noteActions.setSelectedSections(reorderedSections);
      
      try {
        // Use the existing SectionService method
        const { SectionService } = await import('$lib/services/sectionService');
        const updatedSections = await SectionService.reorderSections(
          containerId, 
          fromIndex, 
          toIndex
        );
        
        // Update store with server response
        noteActions.setSelectedSections(updatedSections);
        
        // ✅ CACHE: Update cache with reordered sections
        console.log('🔄 Updating cache after section reorder');
        pageManager.updateCachedSections(containerId, updatedSections);
        
        console.log('✅ Section reorder completed');
      } catch (error) {
        console.error('❌ Section reorder failed:', error);
        // Rollback on error
        noteActions.setSelectedSections(originalSections);
      }
    },
    
    // Cross-container move handler  
    async (sectionId: string, fromContainer: string, toContainer: string) => {
      console.log('🎯 Section cross-container move:', sectionId, fromContainer, '→', toContainer);
      
      // Use existing cross-container logic
      await handleCrossContainerMove({ 
        detail: { sectionId, fromContainer, toContainer } 
      } as CustomEvent);
      
      // ✅ CACHE: Invalidate cache for both containers
      console.log('🗑️ Invalidating cache for both containers after cross-container move');
      pageManager.invalidateContainerCache(fromContainer);
      pageManager.invalidateContainerCache(toContainer);
    }
  );

  /**
   * Container drag behavior
   */
  const containerBehavior = createContainerDragBehavior(
    // Container reorder handler
    async (fromIndex: number, toIndex: number) => {
      console.log('🎯 Container reorder:', fromIndex, '→', toIndex);
      
      if (fromIndex === toIndex) return;
      
      // FIXED: Call the function to get current store values
      const currentStoreValues = storeValues();
      const { containers } = currentStoreValues.noteStore;
      
      // Store original order for potential rollback
      const originalContainers = [...containers];
      
      // 1. Optimistically update UI first (prevents flicker)
      const reorderedContainers = reorderArray(containers, fromIndex, toIndex);
      noteActions.updateContainers(reorderedContainers);
      
      try {
        console.log('🚀 Calling NoteService.reorderNoteContainers...');
        
        // 2. Call API service
        const { NoteService } = await import('$lib/services/noteService');
        const updatedContainers = await NoteService.reorderNoteContainers(
          currentStoreValues.currentCollectionId, // FIXED: Call function first
          fromIndex,
          toIndex
        );
        
        console.log('✅ API call successful, server order:', updatedContainers.map(c => c.title));
        
        // 3. Update with server response ONLY if it differs from our optimistic update
        const currentOrder = reorderedContainers.map(c => c.title).join(',');
        const serverOrder = updatedContainers.map(c => c.title).join(',');
        
        if (currentOrder !== serverOrder) {
          console.log('⚠️ Server order differs from optimistic update, using server order');
          noteActions.updateContainers(updatedContainers);
        } else {
          console.log('✅ Optimistic update matches server, no additional update needed');
        }
        
        console.log('✅ Container reorder completed successfully');
        
      } catch (error) {
        console.error('❌ Container reorder failed:', error);
        
        // ROLLBACK optimistic update on error
        console.log('🔄 Rolling back optimistic reorder due to error');
        noteActions.updateContainers(originalContainers);
      }
    }
  );
  
  return {
    sectionBehavior,
    containerBehavior
  };
}