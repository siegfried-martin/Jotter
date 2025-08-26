// src/lib/stores/noteStore.ts
import { writable } from 'svelte/store';
import type { NoteContainer, NoteSection } from '$lib/types';

interface NoteState {
  containers: NoteContainer[];
  selectedContainer: NoteContainer | null;
  selectedContainerSections: NoteSection[];
  loading: boolean;
}

export const noteStore = writable<NoteState>({
  containers: [],
  selectedContainer: null,
  selectedContainerSections: [],
  loading: false
});

// Helper functions to update store
export const noteActions = {
  setContainers: (containers: NoteContainer[]) => {
    console.log('🔄 [STORE] setContainers called:', containers.length, 'containers');
    noteStore.update(state => {
      const newState = { ...state, containers };
      console.log('📦 [STORE] setContainers result:', {
        containerCount: newState.containers.length,
        selectedContainer: newState.selectedContainer?.title || 'none',
        selectedSections: newState.selectedContainerSections.length
      });
      return newState;
    });
  },
  
  setSelectedContainer: (container: NoteContainer | null) => {
    console.log('🎯 [STORE] setSelectedContainer called:', container?.title || 'null');
    console.trace('📍 [STORE] setSelectedContainer call stack:');
    noteStore.update(state => {
      const newState = { 
        ...state, 
        selectedContainer: container,
        selectedContainerSections: [] // Clear sections when changing container
      };
      console.log('📦 [STORE] setSelectedContainer result:', {
        selectedContainer: newState.selectedContainer?.title || 'none',
        selectedSections: newState.selectedContainerSections.length,
        clearedSections: true
      });
      return newState;
    });
  },
  
  setSelectedSections: (sections: NoteSection[]) => {
    console.log('📄 [STORE] setSelectedSections called:', sections.length, 'sections');
    noteStore.update(state => {
      const newState = { ...state, selectedContainerSections: sections };
      console.log('📦 [STORE] setSelectedSections result:', {
        selectedContainer: newState.selectedContainer?.title || 'none',
        selectedSections: newState.selectedContainerSections.length
      });
      return newState;
    });
  },
  
  // ✅ NEW: Atomic action to set both container and sections together
  setSelectedContainerWithSections: (container: NoteContainer | null, sections: NoteSection[]) => {
    console.log('⚛️ [STORE] setSelectedContainerWithSections called:', {
      containerTitle: container?.title || 'none',
      containerId: container?.id || 'none',
      sectionsCount: sections.length
    });
    
    noteStore.update(state => {
      const newState = { 
        ...state, 
        selectedContainer: container,
        selectedContainerSections: sections
      };
      
      console.log('📦 [STORE] setSelectedContainerWithSections result:', {
        selectedContainer: newState.selectedContainer?.title || 'none',
        selectedContainerId: newState.selectedContainer?.id || 'none',
        selectedSections: newState.selectedContainerSections.length,
        atomic: true
      });
      
      return newState;
    });
  },
  
  setLoading: (loading: boolean) => {
    console.log('⏳ [STORE] setLoading called:', loading);
    noteStore.update(state => ({ ...state, loading }));
  },
  
  addContainer: (container: NoteContainer) => {
    console.log('➕ [STORE] addContainer called:', container.title);
    noteStore.update(state => ({
      ...state,
      containers: [container, ...state.containers]
    }));
  },

  updateContainers: (containers: NoteContainer[]) => {
    console.log('🔄 [STORE] updateContainers called:', containers.length, 'containers');
    noteStore.update(state => ({ ...state, containers }));
  },
  
  removeContainer: (containerId: string) => {
    console.log('❌ [STORE] removeContainer called:', containerId);
    noteStore.update(state => ({
      ...state,
      containers: state.containers.filter(c => c.id !== containerId),
      selectedContainer: state.selectedContainer?.id === containerId ? null : state.selectedContainer,
      selectedContainerSections: state.selectedContainer?.id === containerId ? [] : state.selectedContainerSections
    }));
  },

  updateContainer: (container: NoteContainer) => {
    console.log('🔄 [STORE] updateContainer called:', container.title);
    noteStore.update(state => ({
      ...state,
      containers: state.containers.map(c => c.id === container.id ? container : c),
      selectedContainer: state.selectedContainer?.id === container.id ? container : state.selectedContainer
    }));
  }
};

// Add store subscription for debugging
noteStore.subscribe(state => {
  console.log('📊 [STORE] State changed:', {
    timestamp: new Date().toISOString(),
    selectedContainer: state.selectedContainer?.title || 'none',
    selectedContainerId: state.selectedContainer?.id || 'none', 
    selectedSections: state.selectedContainerSections.length,
    containerCount: state.containers.length,
    loading: state.loading
  });
});