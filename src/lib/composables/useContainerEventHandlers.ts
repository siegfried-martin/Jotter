// src/lib/composables/useContainerEventHandlers.ts
import { noteActions } from '$lib/stores/noteStore';

/**
 * Container event handlers with cache integration
 */
export function useContainerEventHandlers(pageManager: any, noteOperations: any, getStoreValues: () => any) {
  
  // ===== NOTE CREATION =====
  
  async function createNewNote(): Promise<void> {
    const { currentCollectionId } = getStoreValues();
    await noteOperations.createNewNote(
      currentCollectionId, 
      pageManager.selectContainer
    );
  }
  
  async function createNewNoteWithCode(): Promise<void> {
    const { currentCollectionId } = getStoreValues();
    await noteOperations.createNewNoteWithCode(
      currentCollectionId, 
      pageManager.selectContainer
    );
  }
  
  // ===== SECTION OPERATIONS =====
  
  async function createSection(event: CustomEvent<'checklist' | 'code' | 'wysiwyg' | 'diagram'>): Promise<void> {
    const { noteStore, currentCollectionId } = getStoreValues();
    const { selectedContainer, selectedContainerSections } = noteStore;
    
    await noteOperations.createSection(
      event.detail,
      selectedContainer,
      selectedContainerSections,
      currentCollectionId,
      pageManager.selectContainer
    );
    
    // ✅ CACHE: Update cache with new sections
    if (selectedContainer && selectedContainerSections) {
      console.log('🔄 Updating cache after section creation');
      pageManager.updateCachedSections(selectedContainer.id, selectedContainerSections);
    }
  }
  
  async function deleteSection(event: CustomEvent<string>): Promise<void> {
    const { noteStore } = getStoreValues();
    const { selectedContainer } = noteStore;
    
    await noteOperations.deleteSection(
      event.detail, 
      selectedContainer, 
      pageManager.selectContainer
    );
    
    // ✅ CACHE: Invalidate cache since sections changed
    if (selectedContainer) {
      console.log('🗑️ Invalidating cache after section deletion');
      pageManager.invalidateContainerCache(selectedContainer.id);
    }
  }
  
  async function handleSectionTitleSave(event: CustomEvent<{ sectionId: string; title: string | null }>): Promise<void> {
    const { noteStore } = getStoreValues();
    const { selectedContainer, selectedContainerSections } = noteStore;
    
    await noteOperations.handleSectionTitleSave(
      event, 
      selectedContainerSections, 
      pageManager.selectContainer, 
      selectedContainer
    );
    
    // ✅ CACHE: Update cache with modified sections
    if (selectedContainer && selectedContainerSections) {
      console.log('🔄 Updating cache after section title save');
      pageManager.updateCachedSections(selectedContainer.id, selectedContainerSections);
    }
  }
  
  async function handleCheckboxChange(event: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>): Promise<void> {
    const { noteStore } = getStoreValues();
    const { selectedContainer, selectedContainerSections } = noteStore;
    
    await noteOperations.handleCheckboxChange(
      event, 
      selectedContainerSections, 
      selectedContainer
    );
    
    // ✅ CACHE: Update cache with checkbox state change
    if (selectedContainer && selectedContainerSections) {
      console.log('🔄 Updating cache after checkbox change');
      pageManager.updateCachedSections(selectedContainer.id, selectedContainerSections);
    }
  }
  
  // ===== CONTAINER OPERATIONS =====
  
  async function deleteContainer(event: CustomEvent<string>): Promise<void> {
    const { noteStore } = getStoreValues();
    const { containers } = noteStore;
    
    await noteOperations.deleteContainer(
      event.detail, 
      containers, 
      pageManager.selectContainer
    );
    
    // ✅ CACHE: Invalidate cache for deleted container
    console.log('🗑️ Invalidating cache after container deletion');
    pageManager.invalidateContainerCache(event.detail);
  }
  
  async function handleTitleUpdate(event: CustomEvent<{ containerId: string; newTitle: string }>): Promise<void> {
    const { noteStore } = getStoreValues();
    const { selectedContainer } = noteStore;
    
    if (!selectedContainer) {
      console.warn('No selected container to update title');
      return;
    }
    
    try {
      const { containerId, newTitle } = event.detail;
      
      if (!newTitle?.trim() || newTitle.trim() === selectedContainer.title) {
        return; // No change needed
      }
      
      const trimmedTitle = newTitle.trim();
      
      console.log('🏷️ Updating container title:', containerId, 'to:', trimmedTitle);
      
      await noteOperations.updateNoteTitle(containerId, trimmedTitle);
      
      console.log('✅ Container title updated successfully');
    } catch (error) {
      console.error('❌ Failed to update container title:', error);
    }
  }
  
  async function handleContainersReordered(event: CustomEvent<{ fromIndex: number; toIndex: number }>): Promise<void> {
    console.log('✅ Note containers reordered successfully:', event.detail);
    
    const { fromIndex, toIndex } = event.detail;
    const { noteStore } = getStoreValues();
    const { containers, selectedContainer } = noteStore;
    
    // Create the reordered array locally
    const reorderedContainers = [...containers];
    const [movedContainer] = reorderedContainers.splice(fromIndex, 1);
    reorderedContainers.splice(toIndex, 0, movedContainer);
    
    console.log('📦 New containers order:', reorderedContainers.map(c => c.title));
    
    // Update the note store with the new container order
    noteActions.updateContainers(reorderedContainers);
    
    // If the selected container is still in the list, make sure it stays selected
    if (selectedContainer) {
      const stillExists = reorderedContainers.find(c => c.id === selectedContainer.id);
      if (!stillExists) {
        // If somehow the selected container was removed, select the first one
        if (reorderedContainers.length > 0) {
          pageManager.selectContainer(reorderedContainers[0]);
        }
      }
    }
  }
  
  // ===== CROSS-CONTAINER OPERATIONS =====
  
  async function handleCrossContainerMove(event: CustomEvent<{ sectionId: string; fromContainer: string; toContainer: string }>): Promise<void> {
    const { noteStore } = getStoreValues();
    const { containers } = noteStore;
    
    await noteOperations.handleCrossContainerMove(
      event, 
      pageManager.selectContainer, 
      containers
    );
    
    // ✅ CACHE: Invalidate cache for both containers
    const { fromContainer, toContainer } = event.detail;
    console.log('🗑️ Invalidating cache for cross-container move');
    pageManager.invalidateContainerCache(fromContainer);
    pageManager.invalidateContainerCache(toContainer);
  }
  
  async function handleCrossContainerDrop(event: CustomEvent<{ sectionId: string; fromContainer: string; toContainer: string }>): Promise<void> {
    const { noteStore } = getStoreValues();
    const { containers } = noteStore;
    
    await noteOperations.handleCrossContainerMove(
      event, 
      pageManager.selectContainer, 
      containers
    );
    
    // ✅ CACHE: Invalidate cache for both containers
    const { fromContainer, toContainer } = event.detail;
    console.log('🗑️ Invalidating cache for cross-container drop');
    pageManager.invalidateContainerCache(fromContainer);
    pageManager.invalidateContainerCache(toContainer);
  }
  
  // ===== NAVIGATION =====
  
  function handleEdit(event: CustomEvent<string>): void {
    const { currentCollectionId, currentContainerId } = getStoreValues();
    noteOperations.handleEdit(
      event.detail, 
      currentCollectionId, 
      currentContainerId
    );
  }
  
  // ===== KEYBOARD SHORTCUTS =====
  
  function createKeyboardHandler() {
    return (event: KeyboardEvent) => {
      const { currentCollectionId } = getStoreValues();
      return noteOperations.createKeyboardHandler(
        currentCollectionId,
        createNewNote,
        createNewNoteWithCode
      )(event);
    };
  }
  
  return {
    // Note operations
    createNewNote,
    createNewNoteWithCode,
    
    // Section operations
    createSection,
    deleteSection,
    handleSectionTitleSave,
    handleCheckboxChange,
    
    // Container operations
    deleteContainer,
    handleTitleUpdate,
    handleContainersReordered,
    
    // Cross-container operations
    handleCrossContainerMove,
    handleCrossContainerDrop,
    
    // Navigation
    handleEdit,
    
    // Keyboard
    createKeyboardHandler
  };
}