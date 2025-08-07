<!-- src/lib/components/notes/SortableNoteContainerList.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { dragStore, dragActions } from '$lib/stores/dragStore';
	import type { NoteContainer } from '$lib/types';
	
	export let containers: NoteContainer[] = [];
	export let selectedContainer: NoteContainer | null = null;
	export let isCollapsed = true;
	export let collectionId: string;
	
	let isReordering = false;
	
	const dispatch = createEventDispatcher<{
		selectContainer: NoteContainer;
		createNew: void;
		toggleCollapse: boolean;
		deleteContainer: string;
		reorder: { fromIndex: number; toIndex: number };
		crossContainerDrop: {
			sectionId: string;
			fromContainer: string;
			toContainer: string;
		};
	}>();
	
	// Transform containers for dnd - containers already have id field
	$: dndItems = [...containers];
	
	// Force re-sync when containers change (after server update)
	$: if (containers) {
		dndItems = [...containers];
	}
	
	// Check if we're receiving a section drag
	$: isReceivingSectionDrag = $dragStore.isDragging && $dragStore.draggedItem;
	
	// DnD Configuration - conditionally apply dndzone when not receiving section drags
	$: dndOptions = {
		flipDurationMs: 200,
		dropTargetStyle: {
			outline: '2px dashed #3B82F6',
			backgroundColor: '#EFF6FF'
		}
	};
	
	// Handle drag & drop events for container reordering
	function handleDndConsider(e: CustomEvent) {
		if (!isReceivingSectionDrag) {
			dndItems = e.detail.items;
		}
	}
	
	function handleDndFinalize(e: CustomEvent) {
		if (isReceivingSectionDrag) return; // Don't handle container reordering during section drags
		
		const newItems = e.detail.items;
		
		// Find what moved
		const oldIds = containers.map(c => c.id);
		const newIds = newItems.map((item: any) => item.id);
		
		// Find the item that changed position
		let fromIndex = -1;
		let toIndex = -1;
		
		for (let i = 0; i < newIds.length; i++) {
			const oldPosition = oldIds.indexOf(newIds[i]);
			if (oldPosition !== i) {
				fromIndex = oldPosition;
				toIndex = i;
				break;
			}
		}
		
		if (fromIndex !== -1 && toIndex !== -1) {
			console.log('🔄 Container reorder:', { fromIndex, toIndex, collectionId });
			isReordering = true;
			dispatch('reorder', { fromIndex, toIndex });
		}
	}
	
	// Reset reordering state when containers update (from parent)
	$: if (containers && isReordering) {
		isReordering = false;
		console.log('✅ Reorder complete, containers updated');
	}
	
	// Handle cross-container section drops
	function handleContainerClick(container: NoteContainer, event: MouseEvent) {
		if (isReceivingSectionDrag && $dragStore.dragOverTargetContainer === container.id) {
			// Handle cross-container drop
			event.preventDefault();
			event.stopPropagation();
			
			if ($dragStore.draggedItem) {
				dispatch('crossContainerDrop', {
					sectionId: $dragStore.draggedItem.id,
					fromContainer: $dragStore.draggedFromContainer!,
					toContainer: container.id
				});
				
				dragActions.endDrag();
			}
		} else if (!isReceivingSectionDrag) {
			// Normal container selection
			dispatch('selectContainer', container);
		}
	}
	
	function handleContainerMouseEnter(container: NoteContainer) {
		if (isReceivingSectionDrag && $dragStore.draggedFromContainer !== container.id) {
			dragActions.setDragOverTarget(container.id, 'container');
		}
	}
	
	function handleContainerMouseLeave(container: NoteContainer) {
		if ($dragStore.dragOverTargetContainer === container.id) {
			dragActions.setDragOverTarget(null, null);
		}
	}
	
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = diffMs / (1000 * 60 * 60);
		const diffDays = diffMs / (1000 * 60 * 60 * 24);
		
		if (diffHours < 1) {
			return 'Just now';
		} else if (diffHours < 24) {
			return `${Math.floor(diffHours)} hours ago`;
		} else if (diffDays < 2) {
			return 'Yesterday';
		} else {
			return `${Math.floor(diffDays)} days ago`;
		}
	}
</script>

<div class="bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 {isCollapsed ? 'w-16' : 'w-64'}">
	<!-- Header with hamburger -->
	<div class="p-4 border-b border-gray-200 flex items-center justify-between">
		<button
			on:click={() => dispatch('toggleCollapse', !isCollapsed)}
			class="p-2 hover:bg-gray-100 rounded transition-colors"
			title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
			</svg>
		</button>
		
		{#if !isCollapsed}
			<h2 class="text-lg font-semibold text-gray-800">Notes</h2>
		{/if}
	</div>
	
	<div class="p-4">
		<!-- New Note Button -->
		<button 
			on:click={() => dispatch('createNew')}
			class="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
			title="Create new note"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
			</svg>
			{#if !isCollapsed}
				New Note
			{/if}
		</button>
		
		<!-- Sortable Note List -->
		{#if isReceivingSectionDrag}
			<!-- When receiving section drag, disable container DnD -->
			<div class="space-y-2 receiving-section-drag">
				{#each containers as container (container.id)}
					{@const isDragTarget = $dragStore.dragOverTargetContainer === container.id}
					{@const canReceive = isReceivingSectionDrag && $dragStore.draggedFromContainer !== container.id}
					<div class="group relative">
						<div 
							class="p-3 rounded border-l-4 cursor-pointer transition-all duration-200 {
								selectedContainer?.id === container.id 
									? 'bg-gray-100 border-blue-500' 
									: isDragTarget
									? 'border-blue-500'
									: canReceive
									? 'border-gray-400'
									: 'bg-white border-gray-300 hover:bg-gray-50'
							}"
							data-drop-zone="container"
							data-container-id={container.id}
							on:click={(e) => handleContainerClick(container, e)}
							on:mouseenter={() => handleContainerMouseEnter(container)}
							on:mouseleave={() => handleContainerMouseLeave(container)}
							title={isCollapsed ? container.title : ''}
						>
							{#if isCollapsed}
								<div class="text-center">
									<div class="w-6 h-6 bg-gray-300 rounded mx-auto mb-1 flex items-center justify-center">
										<span class="text-xs font-medium text-gray-600">
											{container.title.charAt(0).toUpperCase()}
										</span>
									</div>
									<div class="w-2 h-2 bg-gray-400 rounded-full mx-auto"></div>
								</div>
							{:else}
								<div class="font-medium text-sm pr-6 pl-3">
									{container.title}
								</div>
								<div class="text-xs text-gray-500 pl-3">
									{formatDate(container.updated_at)}
								</div>
								
								<!-- Subtle blue bottom border for drop target -->
								{#if isDragTarget}
									<div class="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-b"></div>
								{/if}
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Normal container DnD mode -->
			<div 
				class="space-y-2"
				use:dndzone={{ items: dndItems, ...dndOptions }}
				on:consider={handleDndConsider}
				on:finalize={handleDndFinalize}
			>
				{#each dndItems as container (container.id)}
					<div class="group relative">
						<div 
							class="p-3 rounded border-l-4 cursor-pointer transition-colors {
								selectedContainer?.id === container.id 
									? 'bg-gray-100 border-blue-500' 
									: 'bg-white border-gray-300 hover:bg-gray-50'
							}"
							data-drop-zone="container"
							data-container-id={container.id}
							on:click={(e) => handleContainerClick(container, e)}
							title={isCollapsed ? container.title : ''}
						>
							{#if isCollapsed}
								<div class="text-center">
									<div class="w-6 h-6 bg-gray-300 rounded mx-auto mb-1 flex items-center justify-center">
										<span class="text-xs font-medium text-gray-600">
											{container.title.charAt(0).toUpperCase()}
										</span>
									</div>
									<div class="w-2 h-2 bg-gray-400 rounded-full mx-auto"></div>
								</div>
							{:else}
								<!-- Drag Handle (visible on hover) -->
								<div class="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
									<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
										<path d="M7 2v20l-5-5V7l5-5zm2 0h3v2H9V2zm0 4h3v2H9V6zm0 4h3v2H9v-2zm0 4h3v2H9v-2zm0 4h3v2H9v-2zm5-16v20l5-5V7l-5-5z"/>
									</svg>
								</div>
								
								<div class="font-medium text-sm pr-6 pl-6">{container.title}</div>
								<div class="text-xs text-gray-500 pl-6">{formatDate(container.updated_at)}</div>
							{/if}
						</div>
						
						{#if !isCollapsed}
							<button 
								class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-opacity"
								on:click|stopPropagation={() => dispatch('deleteContainer', container.id)}
								title="Delete note"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
								</svg>
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.receiving-section-drag {
		/* Visual indication that we're in cross-container drag mode */
		background-color: rgba(59, 130, 246, 0.02);
	}
</style>