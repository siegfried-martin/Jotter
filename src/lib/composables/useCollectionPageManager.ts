// src/lib/composables/useCollectionPageManager.ts
import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { SectionService } from '$lib/services/sectionService';
import { noteStore, noteActions } from '$lib/stores/noteStore';
import { collectionStore, collectionActions } from '$lib/stores/collectionStore';
import type { PageData } from '../routes/app/collections/[collection_id]/$types';

interface CollectionPageState {
  isInitialized: boolean;
  currentCollection: any;
  currentCollectionId: string;
}

export function useCollectionPageManager() {
  const state = writable<CollectionPageState>({
    isInitialized: false,
    currentCollection: null,
    currentCollectionId: ''
  });

  const { subscribe, update } = state;

  /**
   * Initialize the page with data from page load
   */
  async function initialize(data: PageData): Promise<void> {
    try {
      console.log('🎯 CollectionPageManager - Initialize with collection:', data.collection);
      
      // Set collection in store
      collectionActions.setCollections(data.collections);
      collectionActions.setSelectedCollection(data.collection);
      
      // Update local state
      update(s => ({
        ...s,
        currentCollection: data.collection,
        currentCollectionId: data.collection.id,
        isInitialized: false // Will be set to true after initial load
      }));
      
      // Load notes for this collection
      await loadNotesForCollection(data.collection.id);
      
      // Mark as initialized so route changes will be handled
      update(s => ({ ...s, isInitialized: true }));
      
      // Handle create new collection if requested
      if (data.createNew) {
        window.dispatchEvent(new CustomEvent('triggerCollectionCreate'));
      }
      
    } catch (error) {
      console.error('Failed to initialize collection page:', error);
      throw error;
    }
  }

  /**
   * Handle route parameter changes (when user switches collections)
   */
  async function handleRouteChange(newCollectionId: string, currentState: CollectionPageState): Promise<void> {
    if (!browser || !currentState.isInitialized || !newCollectionId) return;
    if (newCollectionId === currentState.currentCollectionId) return;

    try {
      console.log('🔄 CollectionPageManager - Route changed, loading new collection:', newCollectionId);
      
      // Get fresh collection data
      const freshCollections = await CollectionService.getCollections();
      const newCollection = freshCollections.find(c => c.id === newCollectionId);
      
      if (!newCollection) {
        console.error('Collection not found:', newCollectionId);
        goto('/app');
        return;
      }
      
      // Update stores
      collectionActions.setCollections(freshCollections);
      collectionActions.setSelectedCollection(newCollection);
      
      // Update local state
      update(s => ({
        ...s,
        currentCollection: newCollection,
        currentCollectionId: newCollectionId
      }));
      
      // Load notes for the new collection
      await loadNotesForCollection(newCollectionId);
      
      console.log('🔄 CollectionPageManager - Successfully switched to:', newCollection.name);
      
    } catch (error) {
      console.error('Failed to handle collection route change:', error);
      throw error;
    }
  }

  /**
   * Load notes for a specific collection
   */
  async function loadNotesForCollection(collectionId: string): Promise<void> {
    console.log('🔍 CollectionPageManager - Loading notes for collection:', collectionId);
    
    try {
      noteActions.setLoading(true);
      const notes = await NoteService.getNoteContainers(collectionId);
      console.log('📝 CollectionPageManager - Notes loaded:', notes.length);
      
      noteActions.setContainers(notes);
      
      // Auto-select first note if available
      if (notes.length > 0) {
        await selectContainer(notes[0]);
      } else {
        noteActions.setSelectedContainer(null);
        noteActions.setSelectedSections([]);
      }
    } catch (error) {
      console.error('Failed to load notes for collection:', error);
      throw error;
    } finally {
      noteActions.setLoading(false);
    }
  }

  /**
   * Select a note container and load its sections
   */
  async function selectContainer(container: any): Promise<void> {
    try {
      noteActions.setSelectedContainer(container);
      const sections = await SectionService.getSections(container.id);
      noteActions.setSelectedSections(sections);
    } catch (error) {
      console.error('Failed to select container:', error);
      throw error;
    }
  }

  /**
   * Refresh the current collection's notes
   */
  async function refreshNotes(): Promise<void> {
    const currentState = get(state);
    if (currentState.currentCollectionId) {
      await loadNotesForCollection(currentState.currentCollectionId);
    }
  }

  /**
   * Get current collection data for templates
   */
  function getCurrentCollection(): any {
    return get(state).currentCollection;
  }

  /**
   * Get current collection ID
   */
  function getCurrentCollectionId(): string {
    return get(state).currentCollectionId;
  }

  /**
   * Update collection data (for when route changes)
   */
  function updateCollectionData(newData: Partial<PageData>): void {
    if (newData.collection) {
      update(s => ({
        ...s,
        currentCollection: newData.collection,
        currentCollectionId: newData.collection.id
      }));
    }
  }

  return {
    subscribe,
    initialize,
    handleRouteChange,
    loadNotesForCollection,
    selectContainer,
    refreshNotes,
    getCurrentCollection,
    getCurrentCollectionId,
    updateCollectionData
  };
}