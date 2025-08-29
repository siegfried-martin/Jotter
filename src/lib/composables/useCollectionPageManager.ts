// src/lib/composables/useCollectionPageManager.ts
import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { SectionCacheManager } from '$lib/stores/sectionCacheStore';
import { noteActions } from '$lib/stores/noteStore';
import { collectionActions } from '$lib/stores/collectionStore';
import type { PageData } from '../../routes/app/collections/[collection_id]/$types';

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
   * Initialize the page with data from layout loader
   * FIXED: Use layout data directly, no redundant API calls
   */
  async function initialize(data: PageData): Promise<void> {
    try {
      console.log('🎯 CollectionPageManager - Initialize with collection:', data.collection);
      
      // Set collection in collection store (for compatibility)
      collectionActions.setSelectedCollection(data.collection);
      
      // Update local state
      update(s => ({
        ...s,
        currentCollection: data.collection,
        currentCollectionId: data.collection.id,
        isInitialized: false
      }));
      
      // FIXED: Use containers from layout data instead of reloading
      // The layout loader already provided cached containers in correct order
      console.log('📦 Using containers from layout cache:', data.containers.length);
      noteActions.setContainers(data.containers);
      
      // REMOVED: loadNotesForCollection() call that caused flashing
      // The layout loader already provides containers from unified cache
      
      // Mark as initialized
      update(s => ({ ...s, isInitialized: true }));
      
      // Handle create new collection if requested
      if (data.createNew) {
        window.dispatchEvent(new CustomEvent('triggerCollectionCreate'));
      }
      
      // Cache stats for debugging
      const stats = SectionCacheManager.getCacheStats();
      console.log('📊 Cache stats after initialization:', stats);
      
    } catch (error) {
      console.error('Failed to initialize collection page:', error);
      throw error;
    }
  }

  /**
   * Select a note container by navigating to its URL
   */
  async function selectContainer(container: any): Promise<void> {
    try {
      const currentState = get(state);
      const collectionId = currentState.currentCollectionId;
      
      if (!collectionId) {
        console.error('No current collection ID available for navigation');
        return;
      }
      
      console.log('🎯 CollectionPageManager - Navigating to container:', container.title);
      
      // Navigate to the container URL - this will trigger route load and update state properly
      goto(`/app/collections/${collectionId}/containers/${container.id}`);
      
    } catch (error) {
      console.error('Failed to select container:', error);
      throw error;
    }
  }

  /**
   * Load container sections - uses cache
   */
  async function loadContainerSections(containerId: string): Promise<void> {
    try {
      console.log('📄 CollectionPageManager - Loading sections for container (via cache):', containerId);
      
      // Use cache instead of direct SectionService call
      const sections = await SectionCacheManager.getSections(containerId);
      noteActions.setSelectedSections(sections);
      
      console.log('✅ Sections loaded via cache:', sections.length, 'sections');
      
    } catch (error) {
      console.error('Failed to load container sections:', error);
      throw error;
    }
  }

  /**
   * Set selected container (for route loaders)
   */
  function setSelectedContainer(container: any): void {
    noteActions.setSelectedContainer(container);
  }

  /**
   * Refresh the current collection's notes
   * FIXED: Reload from layout instead of direct API
   */
  async function refreshNotes(): Promise<void> {
    const currentState = get(state);
    if (currentState.currentCollectionId) {
      console.log('🔄 Refreshing notes and clearing cache');
      
      // Clear cache to force fresh data
      SectionCacheManager.clearAllCaches();
      
      // FIXED: Reload containers through the same path as initial load
      // This maintains consistency and prevents ordering issues
      const notes = await NoteService.getNoteContainers(currentState.currentCollectionId);
      noteActions.setContainers(notes);
      
      // Reload collection cache in background
      SectionCacheManager.loadCollectionWithCache(currentState.currentCollectionId);
      
      // Log new cache stats
      const stats = SectionCacheManager.getCacheStats();
      console.log('📊 Cache stats after refresh:', stats);
    }
  }

  /**
   * Update sections in cache when they change
   */
  function updateCachedSections(containerId: string, sections: any[]): void {
    console.log('🔄 Updating cached sections for container:', containerId);
    SectionCacheManager.updateCachedSections(containerId, sections);
  }

  /**
   * Invalidate cache for a container when it's modified
   */
  function invalidateContainerCache(containerId: string): void {
    console.log('🗑️ Invalidating cache for container:', containerId);
    SectionCacheManager.invalidateContainer(containerId);
  }

  /**
   * Get cache statistics for debugging
   */
  function getCacheStats() {
    return SectionCacheManager.getCacheStats();
  }

  /**
   * Update cache policy at runtime
   */
  function updateCachePolicy(newPolicy: any) {
    SectionCacheManager.updateCachePolicy(newPolicy);
    console.log('⚙️ Cache policy updated:', newPolicy);
  }

  // Getters and setters
  function getCurrentCollection(): any {
    return get(state).currentCollection;
  }

  function getCurrentCollectionId(): string {
    return get(state).currentCollectionId;
  }

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
    selectContainer,
    loadContainerSections,
    setSelectedContainer,
    refreshNotes,
    getCurrentCollection,
    getCurrentCollectionId,
    updateCollectionData,
    // Cache management methods
    updateCachedSections,
    invalidateContainerCache,
    getCacheStats,
    updateCachePolicy
  };
}