<!-- src/lib/components/CreateNoteItem.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher<{
		createSection: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
	}>();
	
	const sectionTypes = [
		{
			type: 'wysiwyg' as const,
			label: 'Rich Text',
			color: 'blue',
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
		},
		{
			type: 'code' as const,
			label: 'Code',
			color: 'green',
			icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
		},
		{
			type: 'diagram' as const,
			label: 'Diagram',
			color: 'yellow',
			icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
		},
		{
			type: 'checklist' as const,
			label: 'Checklist',
			color: 'purple',
			icon: 'M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0-8v8m0-8h2m-2 0h2m0 0h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-4-6l4-4m0 0l4 4m-4-4v12'
		}
	];
</script>

<div class="bg-white rounded-lg border border-gray-200 p-6">
	<div class="text-center">
		<div class="text-lg font-medium mb-4">Add New Section</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			{#each sectionTypes as sectionType}
				<button 
					class="px-4 py-3 rounded-lg border transition-all hover:scale-105 bg-{sectionType.color}-50 text-{sectionType.color}-600 border-{sectionType.color}-200 hover:bg-{sectionType.color}-100"
					on:click={() => dispatch('createSection', sectionType.type)}
				>
					<svg class="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sectionType.icon}></path>
					</svg>
					<div class="text-sm">{sectionType.label}</div>
				</button>
			{/each}
		</div>
	</div>
</div>