<!-- src/lib/components/editors/DiagramEditor.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let content: string;
	
	const dispatch = createEventDispatcher<{
		contentChange: string;
	}>();
	
	function handleContentChange() {
		dispatch('contentChange', content);
	}
	
	function openExcalidraw() {
		// TODO: Integrate with Excalidraw
		console.log('Opening Excalidraw...');
	}
</script>

<div class="h-full flex flex-col">
	<div class="flex-1 flex flex-col space-y-4">
		<div class="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex-1 flex flex-col justify-center">
			<svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
			</svg>
			<p class="text-gray-500 mb-6 text-lg">Excalidraw integration coming soon!</p>
			<button 
				on:click={openExcalidraw}
				class="mx-auto px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
			>
				Open Diagram Editor
			</button>
		</div>
		
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">
				Diagram Notes (temporary text field)
			</label>
			<textarea
				bind:value={content}
				on:input={handleContentChange}
				class="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
				placeholder="Describe your diagram or paste diagram data here..."
			></textarea>
		</div>
	</div>
</div>