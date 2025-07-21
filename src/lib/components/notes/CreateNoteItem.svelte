<!-- src/lib/components/CreateNoteItem.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	
	const dispatch = createEventDispatcher<{
		createSection: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
	}>();
	
	// Check if device is mobile
	let isMobile = false;
	
	const sectionTypes = [
		{
			type: 'wysiwyg' as const,
			label: 'Text',
			color: 'blue',
			icon: 'M4 6h16M4 12h16M4 18h7',
			hotkey: 'Alt+T'
		},
		{
			type: 'code' as const,
			label: 'Code',
			color: 'green',
			icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
			hotkey: 'Alt+K'
		},
		{
			type: 'diagram' as const,
			label: 'Draw',
			color: 'yellow',
			icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
			hotkey: 'Alt+D'
		},
		{
			type: 'checklist' as const,
			label: 'Tasks',
			color: 'purple',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			hotkey: 'Alt+L'
		}
	];
	
	// Keyboard event handler
	function handleKeydown(event: KeyboardEvent) {
		if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;
		
		const key = event.key.toLowerCase();
		let sectionType: string | null = null;
		
		switch (key) {
			case 't':
				sectionType = 'wysiwyg';
				break;
			case 'k':
				sectionType = 'code';
				break;
			case 'd':
				sectionType = 'diagram';
				break;
			case 'l':
				sectionType = 'checklist';
				break;
		}
		
		if (sectionType) {
			event.preventDefault();
			dispatch('createSection', sectionType as any);
		}
	}
	
	onMount(() => {
		if (browser) {
			// Detect mobile devices
			isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
				|| window.innerWidth < 768;
			
			// Add keyboard listener
			window.addEventListener('keydown', handleKeydown);
		}
	});
	
	onDestroy(() => {
		if (browser) {
			window.removeEventListener('keydown', handleKeydown);
		}
	});
</script>

<!-- Compact horizontal layout with hotkeys for desktop -->
<div class="flex items-center gap-3 px-4 py-2.5">
	<span class="text-sm text-gray-500 font-medium whitespace-nowrap">Add:</span>
	
	<div class="flex gap-2">
		{#each sectionTypes as sectionType}
			<button 
				class="group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150
					   bg-gray-100 text-gray-600 hover:bg-{sectionType.color}-100 hover:text-{sectionType.color}-700 
					   border border-transparent hover:border-{sectionType.color}-200 min-h-[2.5rem]"
				on:click={() => dispatch('createSection', sectionType.type)}
				title="{sectionType.label} Section {!isMobile ? `(${sectionType.hotkey})` : ''}"
			>
				<svg class="w-4 h-4 transition-transform group-hover:scale-110 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sectionType.icon}></path>
				</svg>
				<span class="hidden sm:inline">{sectionType.label}</span>
				
				{#if !isMobile}
					<span class="hidden lg:inline text-xs text-gray-400 ml-1 font-mono">{sectionType.hotkey}</span>
				{/if}
			</button>
		{/each}
	</div>
	
	{#if !isMobile}
		<div class="hidden xl:flex text-xs text-gray-400 ml-auto">
			<span class="font-mono">Ctrl+T/K/D/L</span>
		</div>
	{/if}
</div>