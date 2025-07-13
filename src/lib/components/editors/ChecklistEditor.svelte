<!-- src/lib/components/editors/ChecklistEditor.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ChecklistItem } from '$lib/types';
	
	export let checklistData: ChecklistItem[] = [];
	
	const dispatch = createEventDispatcher<{
		dataChange: ChecklistItem[];
	}>();
	
	let items: ChecklistItem[] = [];
	
	// Initialize from props - make sure we always have at least one empty item
	$: if (checklistData.length === 0) {
		items = [{ text: '', checked: false }];
	} else {
		items = [...checklistData];
	}
	
	function addChecklistItem() {
		items = [...items, { text: '', checked: false }];
		updateData();
	}
	
	function removeChecklistItem(index: number) {
		items = items.filter((_, i) => i !== index);
		updateData();
	}
	
	function updateData() {
		// Always dispatch, even if empty - let parent decide what to save
		dispatch('dataChange', items);
	}
	
	// Watch for changes and update
	$: if (items) {
		updateData();
	}
</script>

<div class="h-full flex flex-col">
	<div class="flex-1 overflow-y-auto pr-2">
		<div class="space-y-4">
			{#each items as item, index}
				<div class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
					<input 
						type="checkbox" 
						bind:checked={item.checked}
						class="w-5 h-5 text-blue-600 rounded"
					>
					<input 
						type="text" 
						bind:value={item.text}
						placeholder="Enter task..."
						class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
					<input 
						type="date" 
						bind:value={item.date}
						class="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
					>
					<button 
						on:click={() => removeChecklistItem(index)}
						class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
						title="Remove item"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
						</svg>
					</button>
				</div>
			{/each}
		</div>
	</div>
	
	<div class="mt-6 pt-4 border-t border-gray-200">
		<button 
			on:click={addChecklistItem}
			class="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition-colors"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
			</svg>
			Add new item
		</button>
	</div>
</div>