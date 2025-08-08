<!-- src/lib/components/containers/ContainerItem.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dragStore, dragActions } from '$lib/stores/dragStore';
  import type { NoteContainer } from '$lib/types';

  export let container: NoteContainer;
  export let isSelected: boolean = false;
  export let isCollapsed: boolean = false;

  const dispatch = createEventDispatcher<{
    select: NoteContainer;
    delete: string;
    crossContainerDrop: {
      sectionId: string;
      fromContainer: string;
      toContainer: string;
    };
  }>();

  // Cross-container drop support
  $: isDragTarget = $dragStore.isDragging && 
                   $dragStore.dragOverTargetContainer === container.id && 
                   $dragStore.dragOverTargetType === 'container';
  $: isReceivingDrag = $dragStore.isDragging && 
                      $dragStore.draggedFromContainer !== container.id &&
                      $dragStore.draggedItem;

  function handleClick(event: MouseEvent) {
    if (!$dragStore.isDragging) {
      dispatch('select', container);
    } else if (isDragTarget && $dragStore.draggedItem) {
      event.preventDefault();
      event.stopPropagation();
      
      dispatch('crossContainerDrop', {
        sectionId: $dragStore.draggedItem.id,
        fromContainer: $dragStore.draggedFromContainer!,
        toContainer: container.id
      });
      
      dragActions.endDrag();
    }
  }

  function handleMouseEnter() {
    if (isReceivingDrag) {
      dragActions.setDragOverTarget(container.id, 'container');
    }
  }

  function handleMouseLeave() {
    if (isDragTarget) {
      dragActions.setDragOverTarget(null, null);
    }
  }

  function handleDeleteClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    dispatch('delete', container.id);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    if (diffDays < 2) return 'Yesterday';
    return `${Math.floor(diffDays)} days ago`;
  }

  // Get a color based on the container title for consistency
  function getContainerColor(title: string): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ];
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  $: containerColor = getContainerColor(container.title);
</script>

<div class="group relative">
  <div 
    class="container-item {
      isSelected 
        ? 'selected' 
        : isDragTarget
        ? 'drag-target'
        : isReceivingDrag
        ? 'receiving-drag'
        : 'default'
    } {isCollapsed ? 'collapsed' : 'expanded'}"
    data-drop-zone="container"
    data-container-id={container.id}
    on:click={handleClick}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    title={isCollapsed ? container.title : ''}
  >
    {#if isCollapsed}
      <!-- Improved Collapsed View -->
      <div class="collapsed-content">
        <div class="avatar {containerColor}">
          <span class="avatar-text">
            {container.title.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <!-- Activity indicator -->
        <div class="activity-indicator {isSelected ? 'active' : ''}"></div>
        
        <!-- Drag indicator for receiving drag -->
        {#if isReceivingDrag}
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
        <!-- Drag Handle (visible on hover, hidden during section drag) -->
        {#if !isReceivingDrag}
          <div class="drag-handle">
            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 10h2v2H8v-2zm6 0h2v2h-2v-2zM8 14h2v2H8v-2zm6 0h2v2h-2v-2z"/>
            </svg>
          </div>
        {/if}
        
        <div class="content-wrapper {!isReceivingDrag ? 'with-handle' : 'no-handle'}">
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
            {formatDate(container.updated_at)}
          </div>
        </div>
        
        <!-- Drop target indicator -->
        {#if isDragTarget}
          <div class="drop-indicator"></div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Delete button for expanded mode -->
  {#if !isCollapsed && !isReceivingDrag}
    <button 
      class="delete-button"
      on:click={handleDeleteClick}
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
    border: 1px solid #e5e7eb;
  }

  .container-item.default:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .container-item.selected {
    background: #eff6ff;
    border: 1px solid #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .container-item.drag-target {
    background: #eff6ff;
    border: 2px solid #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .container-item.receiving-drag {
    background: #f0f9ff;
    border: 2px dashed #0ea5e9;
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

  .drag-handle {
    opacity: 0;
    transition: opacity 0.2s ease;
    flex-shrink: 0;
  }

  .group:hover .drag-handle {
    opacity: 1;
  }

  .content-wrapper {
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  .content-wrapper.with-handle {
    margin-left: 4px;
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
    margin-left: 28px; /* Align with title text */
  }

  .drop-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #3b82f6;
    border-radius: 0 0 8px 8px;
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