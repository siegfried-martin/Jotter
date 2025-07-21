// src/lib/stores/collectionStore.ts
import { writable } from 'svelte/store';
import type { Collection } from '$lib/types';

interface CollectionState {
  collections: Collection[];
  selectedCollection: Collection | null;
  loading: boolean;
}

export const collectionStore = writable<CollectionState>({
  collections: [],
  selectedCollection: null,
  loading: false
});

export const collectionActions = {
  setCollections: (collections: Collection[]) => {
    collectionStore.update(state => ({ ...state, collections }));
  },
  
  setSelectedCollection: (collection: Collection | null) => {
    collectionStore.update(state => ({ ...state, selectedCollection: collection }));
  },
  
  setLoading: (loading: boolean) => {
    collectionStore.update(state => ({ ...state, loading }));
  },
  
  addCollection: (collection: Collection) => {
    collectionStore.update(state => ({
      ...state,
      collections: [...state.collections, collection]
    }));
  },

  updateCollection: (collection: Collection) => {
    collectionStore.update(state => ({
      ...state,
      collections: state.collections.map(c => c.id === collection.id ? collection : c),
      selectedCollection: state.selectedCollection?.id === collection.id ? collection : state.selectedCollection
    }));
  },

  removeCollection: (collectionId: string) => {
    collectionStore.update(state => ({
      ...state,
      collections: state.collections.filter(c => c.id !== collectionId),
      selectedCollection: state.selectedCollection?.id === collectionId ? null : state.selectedCollection
    }));
  }
};