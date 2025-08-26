<!-- src/lib/dnd/components/DragProvider.svelte -->
<script lang="ts">
  import { setContext, onMount, createEventDispatcher } from 'svelte';
  import { DragCore } from '../core/DragCore';
  import { DragDetection } from '../core/DragDetection';
  import { DragBehaviorRegistry } from '../behaviors/DragBehavior';
  import { PreviewRenderer } from '../core/PreviewRenderer';
  import DragGhost from './DragGhost.svelte';
  import type { DragCallbacks } from '../core/DragDetection';
  import type { DropTarget } from '../core/DragCore';

  export let behaviors: any[] = [];

  const dispatch = createEventDispatcher<{
    itemClick: { item: any; itemType: string };
  }>();

  // Create core instances
  const dragCore = new DragCore();
  const registry = new DragBehaviorRegistry();
  const previewRenderer = new PreviewRenderer();

  // Create drag detection callbacks
  const dragCallbacks: DragCallbacks = {
    onDetectionStart: (item, itemType, zoneId, itemIndex, position) => {
      //console.log('🎯 DragProvider: Detection started', itemType, item.id || item.title);
      dragCore.startDetection(item, itemType, zoneId, itemIndex, position);
    },

    onDragStart: () => {
      //console.log('🎯 DragProvider: Drag started');
      dragCore.startDrag();
    },

    onDragMove: (position) => {
      dragCore.updatePosition(position);
    },

    onDragEnd: () => {
      //console.log('🎯 DragProvider: Drag ended');
      previewRenderer.clearPreview();
      
      const result = dragCore.endDrag();
      if (result) {
        registry.handleDrop(result).catch(error => {
          //console.error('❌ Drop handling failed:', error);
        });
      }
    },

    onCancel: () => {
      //console.log('🎯 DragProvider: Drag cancelled');
      previewRenderer.clearPreview();
      dragCore.cancelDrag();
    },

    onClick: (item, itemType) => {
      //console.log('🎯 DragProvider: Item clicked', itemType, item.id || item.title);
      dispatch('itemClick', { item, itemType });
    },

    shouldStartDrag: () => dragCore.shouldStartDrag(),
    shouldTriggerClick: () => dragCore.shouldTriggerClick()
  };

  const dragDetection = new DragDetection(dragCallbacks);

  // Set up drop target detection with preview
  dragDetection.setDropTargetCallback((target: DropTarget | null) => {
    const currentState = dragCore.getCurrentState();
    
    if (currentState.phase === 'dragging' && currentState.itemType) {
      if (target === null) {
        // Clear drop target
        //console.log('🎯 Clearing drop target in provider');
        dragCore.setDropTarget(null);
        previewRenderer.clearPreview();
        return;
      }
      
      const canDrop = registry.canDrop(
        currentState.itemType,
        currentState.sourceZone!,
        target.zoneId,
        target.itemIndex
      );

      if (canDrop) {
        dragCore.setDropTarget(target);
        
        // Get current items from the DOM for preview
        const currentItems = getCurrentItemsForZone(currentState.sourceZone!);
        
        const previewConfig = registry.createPreview(
          currentState.itemType,
          currentState.sourceZone!,
          target.zoneId,
          target.itemIndex,
          currentItems,
          currentState.item // Pass the dragged item
        );
        
        //console.log('🎨 Applying preview config:', previewConfig);
        previewRenderer.applyPreview(previewConfig, currentState.sourceZone!);
      } else {
        dragCore.setDropTarget(null);
        previewRenderer.clearPreview();
      }
    }
  });

  // Helper function to get current items from DOM
  function getCurrentItemsForZone(zoneId: string): any[] {
    const container = document.querySelector(`[data-section-grid="${zoneId}"]`);
    if (!container) return [];

    const dragZones = container.querySelectorAll('[data-drop-zone]');
    const items: any[] = [];

    dragZones.forEach((zone, index) => {
      const itemId = zone.getAttribute('data-item-id');
      const itemType = 'section'; // For now, could be dynamic
      if (itemId) {
        items.push({
          id: itemId,
          type: itemType,
          index: index
        });
      }
    });

    return items;
  }

  // Create context
  const dragContext = {
    dragCore,
    dragDetection,
    registry,
    previewRenderer,
    attachDragTo: dragDetection.attachTo.bind(dragDetection),
    isDragging: (itemType?: string) => dragCore.isDragging(itemType),
    isDetecting: (itemType?: string) => dragCore.isDetecting(itemType),
    getCurrentState: () => dragCore.getCurrentState(),
  };

  setContext('drag', dragContext);

  // Register behaviors on mount
  onMount(() => {
    behaviors.forEach(behavior => {
      //console.log('🎯 DragProvider: Registering behavior', behavior.itemType);
      registry.register(behavior);
    });
  });

  export { dragCore };
</script>

<slot />
<DragGhost />