// src/lib/composables/useCollectionPageManager.ts
import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { CollectionService } from '$lib/services/collectionService';
import { NoteService } from '$lib/services/noteService';
import { SectionCacheManager } from '$lib/stores/sectionCacheStore';
import { noteStore, noteActions } from '$lib/stores/noteStore';
import { collectionStore, collectionActions } from '$lib/stores/collectionStore';
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
   * Initialize the page with data from page load
   * ✅ INTEGRATED: Now uses section cache for preloading
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
      
      // ✅ CACHE INTEGRATION: Initialize section cache for this collection
      console.log('🚀 Initializing section cache for collection:', data.collection.id);
      await SectionCacheManager.loadCollectionWithCache(data.collection.id);
      
      // Load notes for this collection (cache will handle recent sections in background)
      await loadNotesForCollection(data.collection.id);
      
      // Mark as initialized
      update(s => ({ ...s, isInitialized: true }));
      
      // Handle create new collection if requested
      if (data.createNew) {
        window.dispatchEvent(new CustomEvent('triggerCollectionCreate'));
      }
      
      // ✅ CACHE STATS: Log cache statistics for debugging
      const stats = SectionCacheManager.getCacheStats();
      console.log('📊 Cache stats after initialization:', stats);
      
    } catch (error) {
      console.error('Failed to initialize collection page:', error);
      throw error;
    }
  }

  /**
   * ❌ REMOVED: handleRouteChange - This was causing the navigation issues
   * The page loader and URL routing now handle all navigation logic
   */

  /**
   * Load notes for a specific collection
   * ✅ SIMPLIFIED: Only loads container list, doesn't interfere with selected container
   */
  async function loadNotesForCollection(collectionId: string): Promise<void> {
    console.log('📋 CollectionPageManager - Loading notes for collection:', collectionId);
    
    try {
      noteActions.setLoading(true);
      const notes = await NoteService.getNoteContainers(collectionId);
      console.log('📋 CollectionPageManager - Notes loaded:', notes.length);
      
      // ✅ FIXED: Only update containers list, don't clear selected container/sections
      noteActions.setContainers(notes);
      
      console.log('📋 CollectionPageManager - Container list updated, preserving selection');
      
    } catch (error) {
      console.error('Failed to load notes for collection:', error);
      throw error;
    } finally {
      noteActions.setLoading(false);
    }
  }

  /**
   * Select a note container by navigating to its URL
   * ✅ UNCHANGED: Navigation logic stays the same
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
   * Load container sections - now uses cache!
   * ✅ CACHE INTEGRATION: Uses cache instead of direct API call
   */
  async function loadContainerSections(containerId: string): Promise<void> {
    try {
      console.log('🔄 CollectionPageManager - Loading sections for container (via cache):', containerId);
      
      // ✅ CACHE: Use cache instead of direct SectionService call
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
   * ✅ UNCHANGED: Store update logic stays the same
   */
  function setSelectedContainer(container: any): void {
    noteActions.setSelectedContainer(container);
  }

  /**
   * Refresh the current collection's notes
   * ✅ CACHE INTEGRATION: Clears cache to force fresh data
   */
  async function refreshNotes(): Promise<void> {
    const currentState = get(state);
    if (currentState.currentCollectionId) {
      console.log('🔄 Refreshing notes and clearing cache');
      
      // ✅ CACHE: Clear cache to force fresh data
      SectionCacheManager.clearAllCaches();
      
      // Reload collection with fresh cache
      await SectionCacheManager.loadCollectionWithCache(currentState.currentCollectionId);
      await loadNotesForCollection(currentState.currentCollectionId);
      
      // Log new cache stats
      const stats = SectionCacheManager.getCacheStats();
      console.log('📊 Cache stats after refresh:', stats);
    }
  }

  /**
   * Update sections in cache when they change
   * ✅ CACHE INTEGRATION: Helper for keeping cache in sync
   */
  function updateCachedSections(containerId: string, sections: any[]): void {
    console.log('🔄 Updating cached sections for container:', containerId);
    SectionCacheManager.updateCachedSections(containerId, sections);
  }

  /**
   * Invalidate cache for a container when it's modified
   * ✅ CACHE INTEGRATION: Helper for cache invalidation
   */
  function invalidateContainerCache(containerId: string): void {
    console.log('🗑️ Invalidating cache for container:', containerId);
    SectionCacheManager.invalidateContainer(containerId);
  }

  /**
   * Get cache statistics for debugging
   * ✅ CACHE INTEGRATION: Expose cache stats
   */
  function getCacheStats() {
    return SectionCacheManager.getCacheStats();
  }

  /**
   * Update cache policy at runtime
   * ✅ CACHE INTEGRATION: Allow cache tuning
   */
  function updateCachePolicy(newPolicy: any) {
    SectionCacheManager.updateCachePolicy(newPolicy);
    console.log('⚙️ Cache policy updated:', newPolicy);
  }

  // ✅ UNCHANGED: Existing methods remain the same
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
    // ❌ REMOVED: handleRouteChange - was causing navigation issues
    loadNotesForCollection,
    selectContainer,
    loadContainerSections,
    setSelectedContainer,
    refreshNotes,
    getCurrentCollection,
    getCurrentCollectionId,
    updateCollectionData,
    // ✅ NEW: Cache management methods
    updateCachedSections,
    invalidateContainerCache,
    getCacheStats,
    updateCachePolicy
  };
}