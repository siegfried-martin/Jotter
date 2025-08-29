// src/lib/stores/noteStore.ts - Collection-Scoped Implementation
import { writable, derived } from 'svelte/store';
import type { NoteContainer, NoteSection } from '$lib/types';

// Per-collection state structure
interface CollectionNoteState {
  containers: NoteContainer[];
  selectedContainer: NoteContainer | null;
  selectedContainerSections: NoteSection[];
  loading: boolean;
}

// Global store state with collection scoping
interface NoteStoreState {
  currentCollectionId: string | null;
  collectionStates: Map<string, CollectionNoteState>;
}

// Default state for a new collection
function createDefaultCollectionState(): CollectionNoteState {
  return {
    containers: [],
    selectedContainer: null,
    selectedContainerSections: [],
    loading: false
  };
}

// Global store holding all collection states
const globalNoteStore = writable<NoteStoreState>({
  currentCollectionId: null,
  collectionStates: new Map()
});

// Derived store that exposes only the current collection's state
export const noteStore = derived(globalNoteStore, ($global) => {
  if (!$global.currentCollectionId) {
    return createDefaultCollectionState();
  }
  
  const collectionState = $global.collectionStates.get($global.currentCollectionId);
  return collectionState || createDefaultCollectionState();
});

// Helper to get or create collection state
function ensureCollectionState(collectionId: string): void {
  globalNoteStore.update(state => {
    if (!state.collectionStates.has(collectionId)) {
      state.collectionStates.set(collectionId, createDefaultCollectionState());
      console.log('📦 [STORE] Created new collection state:', collectionId);
    }
    return state;
  });
}

// Enhanced actions with collection scoping
export const noteActions = {
  
  // Set the active collection context
  setCurrentCollection(collectionId: string): void {
    console.log('🎯 [STORE] Setting current collection:', collectionId);
    
    globalNoteStore.update(state => {
      ensureCollectionState(collectionId);
      return {
        ...state,
        currentCollectionId: collectionId
      };
    });
  },
  
  // Set containers for the current collection
  setContainers(containers: NoteContainer[]): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot set containers: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        containers
      });
      
      console.log('📦 [STORE] Set containers for collection:', {
        collectionId: state.currentCollectionId,
        containerCount: containers.length
      });
      
      return { ...state };
    });
  },
  
  // Update containers for the current collection
  updateContainers(containers: NoteContainer[]): void {
    this.setContainers(containers);
  },
  
  // Set selected container for the current collection
  setSelectedContainer(container: NoteContainer | null): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot set selected container: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        selectedContainer: container,
        selectedContainerSections: [] // Clear sections when changing container
      });
      
      console.log('🎯 [STORE] Set selected container for collection:', {
        collectionId: state.currentCollectionId,
        containerTitle: container?.title || 'none'
      });
      
      return { ...state };
    });
  },
  
  // Set sections for the current collection's selected container
  setSelectedSections(sections: NoteSection[]): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot set sections: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        selectedContainerSections: sections
      });
      
      console.log('📝 [STORE] Set sections for collection:', {
        collectionId: state.currentCollectionId,
        sectionsCount: sections.length
      });
      
      return { ...state };
    });
  },
  
  // Atomic operation: set container and sections together
  setSelectedContainerWithSections(container: NoteContainer | null, sections: NoteSection[]): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot set container with sections: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        selectedContainer: container,
        selectedContainerSections: sections
      });
      
      console.log('⚛️ [STORE] Atomic update for collection:', {
        collectionId: state.currentCollectionId,
        containerTitle: container?.title || 'none',
        sectionsCount: sections.length
      });
      
      return { ...state };
    });
  },
  
  // Set loading state for the current collection
  setLoading(loading: boolean): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot set loading: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        loading
      });
      
      console.log('⏳ [STORE] Set loading for collection:', {
        collectionId: state.currentCollectionId,
        loading
      });
      
      return { ...state };
    });
  },
  
  // Add container to the current collection
  addContainer(container: NoteContainer): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot add container: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        containers: [container, ...collectionState.containers]
      });
      
      console.log('➕ [STORE] Added container to collection:', {
        collectionId: state.currentCollectionId,
        containerTitle: container.title
      });
      
      return { ...state };
    });
  },
  
  // Remove container from the current collection
  removeContainer(containerId: string): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot remove container: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      const newContainers = collectionState.containers.filter(c => c.id !== containerId);
      const wasSelected = collectionState.selectedContainer?.id === containerId;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        containers: newContainers,
        selectedContainer: wasSelected ? null : collectionState.selectedContainer,
        selectedContainerSections: wasSelected ? [] : collectionState.selectedContainerSections
      });
      
      console.log('❌ [STORE] Removed container from collection:', {
        collectionId: state.currentCollectionId,
        containerId,
        wasSelected
      });
      
      return { ...state };
    });
  },
  
  // Update specific container in the current collection
  updateContainer(container: NoteContainer): void {
    globalNoteStore.update(state => {
      if (!state.currentCollectionId) {
        console.warn('⚠️ [STORE] Cannot update container: no current collection');
        return state;
      }
      
      ensureCollectionState(state.currentCollectionId);
      const collectionState = state.collectionStates.get(state.currentCollectionId)!;
      
      const newContainers = collectionState.containers.map(c => 
        c.id === container.id ? container : c
      );
      
      const updatedSelectedContainer = collectionState.selectedContainer?.id === container.id 
        ? container 
        : collectionState.selectedContainer;
      
      state.collectionStates.set(state.currentCollectionId, {
        ...collectionState,
        containers: newContainers,
        selectedContainer: updatedSelectedContainer
      });
      
      console.log('🔄 [STORE] Updated container in collection:', {
        collectionId: state.currentCollectionId,
        containerTitle: container.title
      });
      
      return { ...state };
    });
  },
  
  // Clear state for a specific collection (useful for cache invalidation)
  clearCollection(collectionId: string): void {
    globalNoteStore.update(state => {
      state.collectionStates.delete(collectionId);
      
      console.log('🧹 [STORE] Cleared collection state:', collectionId);
      
      // If this was the current collection, clear the current reference
      if (state.currentCollectionId === collectionId) {
        return {
          ...state,
          currentCollectionId: null
        };
      }
      
      return { ...state };
    });
  },
  
  // Debug: Get all collection states
  getAllCollectionStates(): Map<string, CollectionNoteState> {
    const state = globalNoteStore.subscribe(() => {})();
    return new Map(state.collectionStates);
  },
  
  // Debug: Get current collection ID
  getCurrentCollectionId(): string | null {
    const state = globalNoteStore.subscribe(() => {})();
    return state.currentCollectionId;
  }
};

// Subscribe to store changes for debugging
globalNoteStore.subscribe(state => {
  console.log('📊 [STORE] Global state changed:', {
    currentCollectionId: state.currentCollectionId,
    collectionsInMemory: Array.from(state.collectionStates.keys()),
    timestamp: new Date().toISOString()
  });
});

// Export derived store that shows current collection's data
export { noteStore as default };