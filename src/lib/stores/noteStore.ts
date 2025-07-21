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
    noteStore.update(state => ({ ...state, containers }));
  },
  
  setSelectedContainer: (container: NoteContainer | null) => {
    noteStore.update(state => ({ 
      ...state, 
      selectedContainer: container,
      selectedContainerSections: [] 
    }));
  },
  
  setSelectedSections: (sections: NoteSection[]) => {
    noteStore.update(state => ({ ...state, selectedContainerSections: sections }));
  },
  
  setLoading: (loading: boolean) => {
    noteStore.update(state => ({ ...state, loading }));
  },
  
  addContainer: (container: NoteContainer) => {
    noteStore.update(state => ({
      ...state,
      containers: [container, ...state.containers]
    }));
  },

  updateContainers: (containers: NoteContainer[]) => {
    noteStore.update(state => ({ ...state, containers }));
  },
  
  removeContainer: (containerId: string) => {
    noteStore.update(state => ({
      ...state,
      containers: state.containers.filter(c => c.id !== containerId),
      selectedContainer: state.selectedContainer?.id === containerId ? null : state.selectedContainer,
      selectedContainerSections: state.selectedContainer?.id === containerId ? [] : state.selectedContainerSections
    }));
  },

  updateContainer: (container: NoteContainer) => {
    noteStore.update(state => ({
      ...state,
      containers: state.containers.map(c => c.id === container.id ? container : c),
      selectedContainer: state.selectedContainer?.id === container.id ? container : state.selectedContainer
    }));
  }
};