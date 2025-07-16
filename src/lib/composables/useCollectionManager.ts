// src/lib/composables/useCollectionManager.ts
import { writable } from 'svelte/store';
import { CollectionService } from '$lib/services/collectionService';
import { collectionStore, collectionActions } from '$lib/stores/collectionStore';
import { NavigationService } from '$lib/services/navigationService';
import type { Collection } from '$lib/services/collectionService';

export interface CollectionManagerState {
  showCreateForm: boolean;
  newCollectionName: string;
  newCollectionColor: string;
  loading: boolean;
}

const defaultColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
];

export function useCollectionManager() {
  const state = writable<CollectionManagerState>({
    showCreateForm: false,
    newCollectionName: '',
    newCollectionColor: defaultColors[0],
    loading: false
  });

  const { subscribe, update } = state;

  /**
   * Load all collections from the server
   */
  async function loadCollections(): Promise<void> {
    try {
      collectionActions.setLoading(true);
      const userCollections = await CollectionService.getCollections();
      collectionActions.setCollections(userCollections);
    } catch (error) {
      console.error('Failed to load collections:', error);
      throw error;
    } finally {
      collectionActions.setLoading(false);
    }
  }

  /**
   * Start the collection creation process
   */
  function startCreateCollection(): void {
    update(s => {
      const collections = collectionStore.get().collections;
      return {
        ...s,
        showCreateForm: true,
        newCollectionName: '',
        newCollectionColor: defaultColors[collections.length % defaultColors.length]
      };
    });
  }

  /**
   * Cancel collection creation
   */
  function cancelCreate(): void {
    update(s => ({
      ...s,
      showCreateForm: false,
      newCollectionName: ''
    }));
  }

  /**
   * Create a new collection
   */
  async function createCollection(): Promise<void> {
    const currentState = state.get();
    
    if (!currentState.newCollectionName.trim()) {
      return;
    }

    try {
      update(s => ({ ...s, loading: true }));
      
      const newCollection = await CollectionService.createCollection({ 
        name: currentState.newCollectionName.trim(), 
        color: currentState.newCollectionColor 
      });
      
      collectionActions.addCollection(newCollection);
      NavigationService.navigateToCollection(newCollection);
      
      update(s => ({
        ...s,
        showCreateForm: false,
        newCollectionName: '',
        loading: false
      }));
    } catch (error) {
      console.error('Failed to create collection:', error);
      update(s => ({ ...s, loading: false }));
      throw error;
    }
  }

  /**
   * Update collection name
   */
  function setCollectionName(name: string): void {
    update(s => ({ ...s, newCollectionName: name }));
  }

  /**
   * Update collection color
   */
  function setCollectionColor(color: string): void {
    update(s => ({ ...s, newCollectionColor: color }));
  }

  /**
   * Handle keyboard shortcuts for collection creation
   */
  function handleCollectionKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      createCollection();
    } else if (event.key === 'Escape') {
      cancelCreate();
    }
  }

  /**
   * Select a collection (navigate to it)
   */
  function selectCollection(collection: Collection, currentCollectionId?: string): void {
    console.log('🚀 CollectionManager - selectCollection called:', {
      collectionId: collection.id,
      collectionName: collection.name,
      currentCollectionId,
      shouldNavigate: collection.id !== currentCollectionId
    });
    
    if (collection.id !== currentCollectionId) {
      console.log('🚀 CollectionManager - Navigating to collection:', collection.name);
      NavigationService.navigateToCollection(collection);
    } else {
      console.log('🚀 CollectionManager - Already on this collection, skipping navigation');
    }
  }

  return {
    subscribe,
    defaultColors,
    loadCollections,
    startCreateCollection,
    cancelCreate,
    createCollection,
    setCollectionName,
    setCollectionColor,
    handleCollectionKeydown,
    selectCollection
  };
}