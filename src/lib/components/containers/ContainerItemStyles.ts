// src/lib/components/containers/ContainerItemStyles.ts
import type { NoteContainer } from '$lib/types';

export interface ContainerItemStyleConfig {
  isSelected: boolean;
  isCollapsed: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isDragTarget: boolean;
  isReceivingDrag: boolean;
  isAnyItemBeingDragged: boolean;
}

export function createContainerItemStyles(container: NoteContainer) {
  
  // Get a color based on the container title for consistency
  function getContainerColor(title: string): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ];
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  // Generate container CSS classes based on state
  function getContainerClasses(config: ContainerItemStyleConfig): string {
    const classes = ['container-item'];
    
    // State-based classes
    if (config.isSelected) {
      classes.push('selected');
    } else if (config.isDragTarget) {
      classes.push('drag-target');
    } else if (config.isReceivingDrag) {
      classes.push('receiving-drag');
    } else {
      classes.push('default');
    }
    
    // Layout classes
    classes.push(config.isCollapsed ? 'collapsed' : 'expanded');
    
    // Drag state classes
    if (config.isDragging) {
      classes.push('dragging');
    }
    if (config.isDragOver) {
      classes.push('drag-over');
    }
    
    return classes.join(' ');
  }

  // Generate wrapper classes
  function getWrapperClasses(config: ContainerItemStyleConfig): string {
    const classes = ['group', 'relative'];
    
    if (config.isAnyItemBeingDragged) {
      classes.push('dragging-disabled');
    }
    
    return classes.join(' ');
  }

  // Generate content wrapper classes for expanded view
  function getContentWrapperClasses(config: ContainerItemStyleConfig): string {
    const classes = ['content-wrapper'];
    
    if (!config.isReceivingDrag) {
      classes.push('with-handle');
    } else {
      classes.push('no-handle');
    }
    
    return classes.join(' ');
  }

  // Get avatar size and text size based on collapsed state
  function getAvatarConfig(isCollapsed: boolean) {
    if (isCollapsed) {
      return {
        containerClass: 'avatar',
        textClass: 'avatar-text',
        size: 'w-8 h-8', // 32px
        fontSize: 'text-sm' // 14px
      };
    } else {
      return {
        containerClass: 'avatar-small',
        textClass: 'avatar-text-small', 
        size: 'w-5 h-5', // 20px
        fontSize: 'text-xs' // 10px
      };
    }
  }

  // Determine if interactive elements should be visible
  function shouldShowDeleteButton(config: ContainerItemStyleConfig): boolean {
    return !config.isCollapsed && !config.isReceivingDrag;
  }

  function shouldShowDragHandle(config: ContainerItemStyleConfig): boolean {
    return !config.isReceivingDrag;
  }

  function shouldShowDropIndicator(config: ContainerItemStyleConfig): boolean {
    return config.isDragTarget;
  }

  function shouldShowDragIndicator(config: ContainerItemStyleConfig): boolean {
    return config.isReceivingDrag && config.isCollapsed;
  }

  function shouldShowActivityIndicator(config: ContainerItemStyleConfig): boolean {
    return config.isCollapsed;
  }

  return {
    // Style calculations
    getContainerColor: () => getContainerColor(container.title),
    getContainerClasses,
    getWrapperClasses,
    getContentWrapperClasses,
    getAvatarConfig,
    
    // Visibility helpers
    shouldShowDeleteButton,
    shouldShowDragHandle, 
    shouldShowDropIndicator,
    shouldShowDragIndicator,
    shouldShowActivityIndicator
  };
}