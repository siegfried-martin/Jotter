// src/lib/composables/useContainerPage.ts
import { get } from 'svelte/store';
import { page } from '$app/stores';
import { noteStore, noteActions } from '$lib/stores/noteStore';
import { useCollectionPageManager } from '$lib/composables/useCollectionPageManager';
import { useNoteOperations } from '$lib/composables/useNoteOperations';
// ✅ FIXED: Correct path to types
import type { PageData } from '../../routes/app/collections/[collection_id]/containers/[container_id]/$types';

/**
 * Core container page logic - simplified without redirect interference
 */
export function useContainerPage(data: PageData) {
  // Initialize composables
  const pageManager = useCollectionPageManager();
  const noteOperations = useNoteOperations();
  
  // State tracking for URL synchronization
  let lastLoadedContainerId: string | null = null;
  let isInitialized = false;
  
  /**
   * Initialize page with data and cache
   * ✅ SIMPLIFIED: No redirect logic interference
   */
  async function initialize(): Promise<void> {
    console.log('🚀 Container page mounting with data:', {
      hasContainer: !!data.container,
      hasSections: !!data.sections,
      sectionCount: data.sections?.length || 0
    });
    
    // Initialize the page manager first (includes cache initialization)
    await pageManager.initialize(data);
    
    // ✅ SIMPLIFIED: Just mark as initialized - page data reactive statement handles the rest
    isInitialized = true;
    
    console.log('✅ Container page initialization complete');
  }
  
  /**
   * Load container data via cache
   * ✅ CACHE: Uses the cache system for section loading
   */
  async function loadContainerData(containerId: string): Promise<void> {
    if (!containerId) return;
    
    try {
      console.log('📦 Loading container data for:', containerId);
      lastLoadedContainerId = containerId;
      
      // ✅ FIXED: Get current containers from store
      const currentNoteStore = get(noteStore);
      const container = currentNoteStore.containers.find(c => c.id === containerId);
      
      if (!container) {
        console.warn('⚠️ Container not found in list:', containerId);
        return;
      }
      
      console.log('🎯 Found container:', container.title);
      
      // Set the selected container
      pageManager.setSelectedContainer(container);
      
      // ✅ CACHE: Load sections via cache
      console.log('📡 Loading sections from cache for:', containerId);
      await pageManager.loadContainerSections(containerId);
      
      // ✅ VERIFY: Check if sections were loaded
      const updatedStore = get(noteStore);
      console.log('✅ Container data loaded successfully via cache:', {
        selectedContainer: updatedStore.selectedContainer?.title,
        sectionsCount: updatedStore.selectedContainerSections?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Failed to load container data:', error);
    }
  }
  
  /**
   * ❌ REMOVED: URL change handling logic that was causing conflicts
   * The page loader and reactive statements now handle all navigation
   */
  
  /**
   * Helper function for array reordering
   */
  function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
    const newArray = [...array];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray;
  }
  
  /**
   * Get debug information
   */
  function getDebugInfo() {
    const currentContainerId = get(page).params.container_id;
    const currentNoteStore = get(noteStore);
    const { selectedContainer, selectedContainerSections } = currentNoteStore;
    
    return {
      currentContainerId,
      selectedContainerId: selectedContainer?.id,
      lastLoadedContainerId,
      sectionsCount: selectedContainerSections?.length || 0,
      isInitialized,
      urlMatchesSelected: currentContainerId === selectedContainer?.id,
      cacheStats: pageManager.getCacheStats() // ✅ Cache stats
    };
  }
  
  return {
    // Composables
    pageManager,
    noteOperations,
    
    // State
    get isInitialized() { return isInitialized; },
    get lastLoadedContainerId() { return lastLoadedContainerId; },
    
    // Methods
    initialize,
    loadContainerData,
    // ❌ REMOVED: handleContainerChange - was causing navigation conflicts
    reorderArray,
    getDebugInfo
  };
}