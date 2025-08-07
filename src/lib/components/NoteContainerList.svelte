<!-- src/lib/components/NoteContainerList.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { NoteContainer } from '$lib/types';
	
	export let containers: NoteContainer[] = [];
	export let selectedContainer: NoteContainer | null = null;
	export let isCollapsed = true;
	
	const dispatch = createEventDispatcher<{
		selectContainer: NoteContainer;
		createNew: void;
		toggleCollapse: boolean;
		deleteContainer: string; // container id
	}>();
	
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
		
		<!-- Note List -->
		<div class="space-y-2">
			{#each containers as container}
				<div class="group relative">
					<div 
						class="p-3 rounded border-l-4 cursor-pointer transition-colors {
							selectedContainer?.id === container.id 
								? 'bg-gray-100 border-blue-500' 
								: 'bg-white border-gray-300 hover:bg-gray-50'
						}"
						on:click={() => dispatch('selectContainer', container)}
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
							<div class="font-medium text-sm pr-6">{container.title}</div>
							<div class="text-xs text-gray-500">{formatDate(container.updated_at)}</div>
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
			
			{#if containers.length === 0 && !isCollapsed}
				<div class="text-center text-gray-500 text-sm py-8">
					No notes yet.<br>Click "New Note" to get started!
				</div>
			{/if}
		</div>
	</div>
</div>