<!-- src/lib/components/containers/ContainerItem.svelte -->
<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import type { NoteContainer } from '$lib/types';
  
  // Import helper modules (keeping the ones that don't conflict)
  import { createContainerItemLogic } from './ContainerItemLogic';
  import { createContainerItemStyles } from './ContainerItemStyles';

  export let container: NoteContainer;
  export let isSelected: boolean = false;
  export let isCollapsed: boolean = false;
  export let isDragging: boolean = false;
  export let isDragOver: boolean = false;
  export let itemIndex: number;

  const dispatch = createEventDispatcher();

  // Get drag context to detect section drags
  const dragContext = getContext('drag');
  const { dragCore } = dragContext || {};
  $: dragState = dragCore?.store;

  // Initialize helper modules (but skip drop module since DraggableContainer handles container drops)
  const logic = createContainerItemLogic(container, dispatch);
  const styles = createContainerItemStyles(container);

  // Section drop detection - only for sections being dragged to this container
  $: isReceivingSectionDrag = $dragState?.phase === 'dragging' && 
                              $dragState?.itemType === 'section';
  
  // Check if this container is a valid drop target for the dragged section
  $: isSectionDropTarget = isReceivingSectionDrag && 
                          $dragState?.sourceZone && 
                          $dragState.sourceZone !== `container-${container.id}`;
  
  // Check if actively hovering over this container during section drag
  $: isSectionDropActive = isSectionDropTarget &&
                          $dragState?.dropTarget?.zoneId === `container-${container.id}`;

  // Style calculations (updated to handle section drop states)
  $: styleConfig = {
    isSelected,
    isCollapsed,
    isDragging,
    isDragOver,
    isDragTarget: isSectionDropTarget, // Available for section drop
    isReceivingDrag: isReceivingSectionDrag,
    isAnyItemBeingDragged: $dragState?.phase === 'dragging',
    isSectionDropActive // Actively being hovered during section drag
  };
  
  $: containerClasses = styles.getContainerClasses(styleConfig);
  $: wrapperClasses = styles.getWrapperClasses(styleConfig);
  $: contentWrapperClasses = styles.getContentWrapperClasses(styleConfig);
  $: containerColor = styles.getContainerColor();
  $: avatarConfig = styles.getAvatarConfig(isCollapsed);
  
  // Section drop attributes (keep these for section → container drops)
  $: sectionDropAttributes = isReceivingSectionDrag ? {
    'data-drop-zone': `container-${container.id}`,
    'data-container-id': container.id
  } : {};
  
  $: dropTitle = isReceivingSectionDrag && isCollapsed 
    ? `Drop section in ${container.title}` 
    : container.title;

  // Visibility helpers
  $: showDeleteButton = styles.shouldShowDeleteButton(styleConfig);
  $: showDragHandle = false; // DraggableContainer handles this now
  $: showDropIndicator = isReceivingSectionDrag && !isCollapsed && isSectionDropActive;
  $: showDragIndicator = isReceivingSectionDrag && isCollapsed && isSectionDropActive;
  $: showActivityIndicator = styles.shouldShowActivityIndicator(styleConfig);

  // Handle section drops (keep this functionality)
  function handleSectionDrop(event: MouseEvent) {
    if (isReceivingSectionDrag && $dragState?.item) {
      const fromContainer = $dragState.sourceZone?.replace('section-grid-', '');
      if (fromContainer && fromContainer !== container.id) {
        dispatch('crossContainerDrop', {
          sectionId: $dragState.item.id,
          fromContainer,
          toContainer: container.id
        });
      }
    }
  }

  // Container selection (simplified - no conflict with drag events)
  function handleContainerClick(event: MouseEvent) {
    // Only allow selection if not currently dragging containers
    if (!($dragState?.phase === 'dragging' && $dragState?.itemType === 'container')) {
      dispatch('select', container);
    }
  }
</script>

<div class={wrapperClasses}>
  <div 
    class={containerClasses}
    {...sectionDropAttributes}
    on:click={handleContainerClick}
    on:mouseup={handleSectionDrop}
    title={dropTitle}
  >
    {#if isCollapsed}
      <!-- Collapsed View -->
      <div class="collapsed-content">
        <div class="avatar {containerColor}">
          <span class="avatar-text">
            {container.title.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <!-- Activity indicator -->
        {#if showActivityIndicator}
          <div class="activity-indicator {isSelected ? 'active' : ''}"></div>
        {/if}
        
        <!-- Section drag indicator -->
        {#if showDragIndicator}
          <div class="drag-indicator">
            <svg class="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Expanded View -->
      <div class="expanded-content">
        <div class={contentWrapperClasses}>
          <div class="title-section">
            <div class="avatar-small {containerColor}">
              <span class="avatar-text-small">
                {container.title.charAt(0).toUpperCase()}
              </span>
            </div>
            <div class="title-text">
              {container.title}
            </div>
          </div>
          <div class="date-text">
            {logic.formatDate(container.updated_at)}
          </div>
        </div>
        
        <!-- Section drop indicator (only for section drops) -->
        {#if showDropIndicator}
          <div class="drop-indicator" on:click={handleSectionDrop}></div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Delete button for expanded mode -->
  {#if showDeleteButton}
    <button 
      class="delete-button"
      on:click|stopPropagation={logic.handleDeleteClick}
      title="Delete note"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    </button>
  {/if}
</div>

<style>
  .container-item {
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
  }

  /* Base States */
  .container-item.default {
    background: white;
    border: 2px solid transparent;
  }

  .container-item.default:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Disable hover when dragging containers */
  .dragging-disabled .container-item.default:hover {
    background: white !important;
    border-color: transparent !important;
    transform: none !important;
    box-shadow: none !important;
  }

  /* Disable delete button when dragging */
  .dragging-disabled .delete-button {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  .container-item.selected {
    background: #eff6ff;
    border: 2px solid #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* SECTION drop target highlighting (keep this) */
  .container-item.section-drop-target-available {
    background: #f0f9ff !important;
    border: 2px dashed #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
    transform: scale(1.01);
  }

  .container-item.section-drop-target-active {
    background: #dbeafe !important;
    border: 2px solid #3b82f6 !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
    transform: scale(1.03);
  }

  /* DraggableContainer drag states (these come from parent component now) */
  .container-item.dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }

  .container-item.drag-over {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  /* Collapsed Mode */
  .container-item.collapsed {
    padding: 12px 8px;
    min-height: 72px;
  }

  .collapsed-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: relative;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .avatar-text {
    font-size: 14px;
    line-height: 1;
  }

  .activity-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d1d5db;
    transition: all 0.2s ease;
  }

  .activity-indicator.active {
    background: #3b82f6;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
  }

  .drag-indicator {
    position: absolute;
    top: -4px;
    right: -4px;
    background: white;
    border-radius: 50%;
    padding: 2px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  /* Expanded Mode */
  .container-item.expanded {
    padding: 12px;
  }

  .expanded-content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .content-wrapper {
    flex: 1;
    min-width: 0;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .avatar-small {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    flex-shrink: 0;
  }

  .avatar-text-small {
    font-size: 10px;
    line-height: 1;
  }

  .title-text {
    font-weight: 500;
    font-size: 14px;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .date-text {
    font-size: 12px;
    color: #6b7280;
    margin-left: 28px;
  }

  .drop-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #3b82f6;
    border-radius: 0 0 8px 8px;
    cursor: pointer;
  }

  .delete-button {
    position: absolute;
    top: 8px;
    right: 8px;
    opacity: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 4px;
    color: #ef4444;
    transition: all 0.2s ease;
  }

  .delete-button:hover {
    background: #fef2f2;
    border-color: #ef4444;
    color: #dc2626;
  }

  .group:hover .delete-button {
    opacity: 1;
  }

  /* Color classes for avatars */
  .bg-blue-500 { background-color: #3b82f6; }
  .bg-green-500 { background-color: #10b981; }
  .bg-purple-500 { background-color: #8b5cf6; }
  .bg-pink-500 { background-color: #ec4899; }
  .bg-yellow-500 { background-color: #f59e0b; }
  .bg-indigo-500 { background-color: #6366f1; }
  .bg-red-500 { background-color: #ef4444; }
  .bg-teal-500 { background-color: #14b8a6; }
</style>