<!-- src/lib/components/containers/ContainerSidebar.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ContainerList from './ContainerList.svelte';
  import type { NoteContainer } from '$lib/types';

  export let containers: NoteContainer[] = [];
  export let selectedContainer: NoteContainer | null = null;
  export let collectionId: string;

  let isCollapsed = true;
  let scrollContainer: HTMLElement;
  let showScrollUp = false;
  let showScrollDown = false;

  const dispatch = createEventDispatcher<{
    selectContainer: NoteContainer;
    createNew: void;
    deleteContainer: string;
    containersReordered: { fromIndex: number; toIndex: number };
    crossContainerDrop: {
      sectionId: string;
      fromContainer: string;
      toContainer: string;
    };
  }>();

  // Auto-expand on desktop, collapse on mobile
  onMount(() => {
    if (browser) {
      const mediaQuery = window.matchMedia('(min-width: 1024px)');
      isCollapsed = !mediaQuery.matches;
      
      // Listen for screen size changes
      const handleResize = (e: MediaQueryListEvent) => {
        isCollapsed = !e.matches;
      };
      
      mediaQuery.addEventListener('change', handleResize);
      return () => mediaQuery.removeEventListener('change', handleResize);
    }
  });

  // Monitor scroll position for custom scroll indicators
  function handleScroll() {
    if (!scrollContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    showScrollUp = scrollTop > 20;
    showScrollDown = scrollTop < scrollHeight - clientHeight - 20;
  }

  function scrollUp() {
    scrollContainer?.scrollBy({ top: -200, behavior: 'smooth' });
  }

  function scrollDown() {
    scrollContainer?.scrollBy({ top: 200, behavior: 'smooth' });
  }

  function handleSelectContainer(event: CustomEvent<NoteContainer>) {
    dispatch('selectContainer', event.detail);
  }

  function handleCreateNew() {
    dispatch('createNew');
  }

  function handleToggleCollapse() {
    isCollapsed = !isCollapsed;
  }

  function handleDeleteContainer(event: CustomEvent<string>) {
    dispatch('deleteContainer', event.detail);
  }

  function handleReorder(event: CustomEvent<{ fromIndex: number; toIndex: number }>) {
    // Pass the collectionId along with the event
    console.log('🎯 ContainerSidebar: Received reorder event', event.detail);
    dispatch('containersReordered', { 
      ...event.detail, 
      collectionId 
    });
    console.log('🔥 ContainerSidebar dispatched containersReordered');
  }

  function handleCrossContainerDrop(event: CustomEvent<{
    sectionId: string;
    fromContainer: string;
    toContainer: string;
  }>) {
    dispatch('crossContainerDrop', event.detail);
  }
</script>

<div class="sidebar-container bg-white border-r border-gray-200 transition-all duration-300 {isCollapsed ? 'w-20' : 'w-72'}">
  <!-- Header with hamburger -->
  <div class="header-section p-4 border-b border-gray-200 flex items-center justify-between">
    <button
      on:click={handleToggleCollapse}
      class="toggle-btn p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <svg class="w-5 h-5 transition-transform duration-200 {isCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
      </svg>
    </button>
    
    {#if !isCollapsed}
      <h2 class="text-lg font-semibold text-gray-800">Notes</h2>
    {/if}
  </div>
  
  <div class="content-section relative flex-1 overflow-hidden">
    <!-- New Note Button -->
    <div class="p-4 border-b border-gray-100">
      <button 
        on:click={handleCreateNew}
        class="new-note-btn w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        title="Create new note"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        {#if !isCollapsed}
          <span class="font-medium">New Note</span>
        {/if}
      </button>
    </div>
    
    <!-- Scrollable Container List -->
    <div 
      bind:this={scrollContainer}
      class="scroll-container p-4 overflow-y-auto flex-1"
      class:hide-scrollbar={true}
      on:scroll={handleScroll}
    >
      <ContainerList
        {containers}
        {selectedContainer}
        {isCollapsed}
        {collectionId}
        on:selectContainer={handleSelectContainer}
        on:deleteContainer={handleDeleteContainer}
        on:reorder={handleReorder}
        on:crossContainerDrop={handleCrossContainerDrop}
      />
    </div>

    <!-- Custom Scroll Indicators -->
    {#if !isCollapsed}
      <div class="scroll-indicators">
        {#if showScrollUp}
          <button 
            on:click={scrollUp}
            class="scroll-indicator scroll-up"
            title="Scroll up"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>
          </button>
        {/if}
        
        {#if showScrollDown}
          <button 
            on:click={scrollDown}
            class="scroll-indicator scroll-down"
            title="Scroll down"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .sidebar-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }

  .header-section {
    flex-shrink: 0;
  }

  .content-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0; /* Important for flex overflow */
  }

  .scroll-container {
    flex: 1;
    min-height: 0; /* Important for flex overflow */
  }

  .hide-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome/Safari/Opera */
  }

  .toggle-btn:hover svg {
    transform: scale(1.1);
  }

  .new-note-btn {
    transition: all 0.2s ease;
  }

  .new-note-btn:hover {
    transform: translateY(-1px);
  }

  .new-note-btn:active {
    transform: translateY(0);
  }

  /* Custom Scroll Indicators */
  .scroll-indicators {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  .sidebar-container:hover .scroll-indicators {
    opacity: 1;
    pointer-events: auto;
  }

  .scroll-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .scroll-indicator:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .scroll-indicator:active {
    transform: scale(0.95);
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .sidebar-container {
      /* On mobile, respect the collapsed/expanded state properly */
    }
    
    /* Ensure collapsed state stays narrow on mobile */
    .sidebar-container.w-20 {
      width: 5rem !important; /* 80px - same as desktop collapsed */
    }
    
    /* Expanded state can be wider on mobile but not full screen */
    .sidebar-container.w-72 {
      width: 16rem !important; /* 256px - reasonable mobile width */
    }
  }
</style>