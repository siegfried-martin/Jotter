<!-- src/lib/components/editors/WysiwygEditor.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let content: string;
	
	const dispatch = createEventDispatcher<{
		contentChange: string;
	}>();
	
	function handleContentChange() {
		dispatch('contentChange', content);
	}
	
	// Basic text formatting functions (placeholder for future TipTap integration)
	function formatText(type: 'bold' | 'italic' | 'list') {
		// TODO: Implement with TipTap or similar rich text editor
		console.log('Format:', type);
	}
</script>

<div class="h-full flex flex-col">
	<div class="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden flex-1 flex flex-col">
		<div class="border-b border-gray-200 p-3 flex space-x-2 bg-gray-50">
			<button 
				on:click={() => formatText('bold')}
				class="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors" 
				title="Bold"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 110 8H6z"></path>
				</svg>
			</button>
			<button 
				on:click={() => formatText('italic')}
				class="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors" 
				title="Italic"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 011-1.732l.5-.447a1 1 0 011.366.366L18.732 3H19a2 2 0 012 2v1M10 6v4a1 1 0 001 1h4"></path>
				</svg>
			</button>
			<button 
				on:click={() => formatText('list')}
				class="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors" 
				title="List"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
				</svg>
			</button>
		</div>
		<textarea
			bind:value={content}
			on:input={handleContentChange}
			class="flex-1 p-4 outline-none resize-none bg-white"
			placeholder="Start typing your notes here..."
		></textarea>
	</div>
</div>