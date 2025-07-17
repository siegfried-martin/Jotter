<!-- src/lib/components/NoteItem.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { NoteSection } from '$lib/types';
	import DiagramThumbnail from './DiagramThumbnail.svelte';
	
	export let section: NoteSection;
	
	const dispatch = createEventDispatcher<{
		edit: string; // section id
		delete: string; // section id
		checkboxChange: { sectionId: string; checked: boolean; lineIndex: number };
	}>();
	
	function handleCheckboxChange(event: Event, lineIndex: number) {
		const target = event.target as HTMLInputElement;
		dispatch('checkboxChange', {
			sectionId: section.id,
			checked: target.checked,
			lineIndex
		});
	}
	
	function handleItemClick(event: Event) {
		// Don't open editor if clicking on checkbox
		if ((event.target as HTMLInputElement).type === 'checkbox') {
			console.log('Checkbox clicked, not opening editor');
			return;
		}
		console.log('Opening editor for section:', section.id);
		dispatch('edit', section.id);
	}
	
	function handleKeyDown(event: KeyboardEvent) {
		// Allow Enter or Space to activate the item
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleItemClick(event);
		}
	}
	
	function copyToClipboard() {
		navigator.clipboard.writeText(section.content);
		// TODO: Show toast notification
	}
	
	function deleteSection() {
		dispatch('delete', section.id);
	}
	
	// Parse checklist data from structured field or fallback to content parsing
	$: checklistItems = section.type === 'checklist' 
		? (section.checklist_data && section.checklist_data.length > 0 
			? section.checklist_data.map(item => {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				
				// Fix timezone issue: treat date string as local date
				let itemDate = null;
				let isOverdue = false;
				let displayDate = null;
				
				if (item.date) {
					const [year, month, day] = item.date.split('-');
					itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
					itemDate.setHours(0, 0, 0, 0);
					isOverdue = itemDate.getTime() < today.getTime();
					displayDate = itemDate.toLocaleDateString();
				}
				
				return {
					...item,
					isOverdue,
					displayDate
				};
			})
			: section.content.split('\n')
				.filter(line => line.trim())
				.map(line => {
					const [taskPart, datePart] = line.split('|');
					const checked = taskPart.includes('[x]');
					const text = taskPart.replace(/^- \[[x ]\] /, '');
					const date = datePart ? datePart.trim() : null;
					
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					
					let itemDate = null;
					let isOverdue = false;
					let displayDate = null;
					
					if (date) {
						const [year, month, day] = date.split('-');
						itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
						itemDate.setHours(0, 0, 0, 0);
						isOverdue = itemDate.getTime() < today.getTime();
						displayDate = itemDate.toLocaleDateString();
					}
					
					return { 
						text, 
						checked, 
						date, 
						isOverdue,
						displayDate
					};
				})
		)
		: [];
	
	// Helper function to get element count for diagrams
	function getDiagramElementCount(content: string): number {
		try {
			const data = JSON.parse(content);
			return data.elements?.length || 0;
		} catch {
			return 0;
		}
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
	class="note-item bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:transform hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
	role="button"
	tabindex="0"
	aria-label="Edit {section.type} section"
	on:click={handleItemClick}
	on:keydown={handleKeyDown}
>
	<div class="flex justify-between items-start mb-3">
		<div class="text-sm font-medium text-gray-700 capitalize">{section.type}</div>
		<div class="flex items-center space-x-2">
			{#if section.type === 'code' || section.type === 'wysiwyg'}
				<button 
					class="copy-button opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity"
					on:click|stopPropagation={copyToClipboard}
					aria-label="Copy content to clipboard"
					title="Copy to clipboard"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
					</svg>
				</button>
			{/if}
			<button 
				class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-opacity"
				on:click|stopPropagation={deleteSection}
				aria-label="Delete section"
				title="Delete section"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
				</svg>
			</button>
			<div class="text-xs text-gray-400" aria-hidden="true">
				{section.type === 'checklist' ? '✓ Click checkboxes • Click elsewhere to edit' : 'Click to edit'}
			</div>
		</div>
	</div>
	
	<!-- Updated content area with proper scrolling -->
	<div class="note-item-content overflow-hidden relative" style="height: calc(100% - 60px); min-height: 160px;">
		<div class="h-full overflow-y-auto pr-2">
			{#if section.type === 'checklist'}
				<div class="space-y-2" role="group" aria-label="Checklist items">
					{#each checklistItems as item, index}
						<div class="flex items-center space-x-3">
							<input 
								type="checkbox" 
								class="w-4 h-4 text-blue-600 rounded cursor-pointer flex-shrink-0" 
								checked={item.checked}
								on:change={(e) => handleCheckboxChange(e, index)}
								on:click|stopPropagation
								aria-label="Mark task as {item.checked ? 'incomplete' : 'complete'}: {item.text}"
							>
							<span class="text-sm flex-1 break-words">{item.text}</span>
							{#if item.displayDate}
								<span class="text-xs flex-shrink-0 {item.isOverdue ? 'text-red-500' : 'text-gray-400'}" aria-label="Due date: {item.displayDate}">
									{item.displayDate}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			{:else if section.type === 'code'}
				<pre class="text-sm bg-gray-50 rounded p-3 font-mono text-gray-800 whitespace-pre-wrap break-all" aria-label="Code content">{section.content}</pre>
				{#if section.meta?.language}
					<div class="mt-2 text-xs text-gray-500" aria-label="Programming language: {section.meta.language}">
						{section.meta.language}
					</div>
				{/if}
			{:else if section.type === 'wysiwyg'}
				<div class="prose prose-sm max-w-none text-sm leading-relaxed break-words overflow-hidden" role="region" aria-label="Rich text content">
					{@html section.content}
				</div>
			{:else if section.type === 'diagram'}
				<div class="bg-gray-50 rounded p-4 flex items-center justify-center h-full" role="region" aria-label="Diagram preview">
					{#if section.content && section.content.trim() !== '' && getDiagramElementCount(section.content) > 0}
						<DiagramThumbnail 
							diagramContent={section.content}
							elementCount={getDiagramElementCount(section.content)} 
						/>
					{:else}
						<div class="text-center text-gray-500">
							<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
							</svg>
							<div class="text-xs">
								{section.content && section.content.trim() !== '' ? 'Empty Diagram' : 'New Diagram'}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
		
		<!-- Scroll fade indicator - only shows when content is scrollable -->
		<div class="scroll-fade absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none opacity-0 transition-opacity" aria-hidden="true"></div>
	</div>
</div>

<style>
	.note-item {
		min-height: 240px;
		height: fit-content;
		max-height: 450px; /* Back to original */
		min-width: 500px; /* Ensures wider cards */
		display: flex;
		flex-direction: column;
	}
	
	.note-item:hover .copy-button,
	.note-item:hover .opacity-0 {
		opacity: 1 !important;
	}
	
	.note-item-content {
		scrollbar-width: thin;
		scrollbar-color: #cbd5e0 transparent;
	}
	
	/* Scrollbar styling for the content area */
	.note-item-content::-webkit-scrollbar {
		width: 6px;
	}
	
	.note-item-content::-webkit-scrollbar-track {
		background: transparent;
	}
	
	.note-item-content::-webkit-scrollbar-thumb {
		background-color: #cbd5e0;
		border-radius: 3px;
	}
	
	.note-item-content::-webkit-scrollbar-thumb:hover {
		background-color: #a0aec0;
	}
	
	/* Show scroll fade when content is scrollable */
	.note-item-content:hover .scroll-fade {
		opacity: 1;
	}
	
	/* Hide scroll fade when at bottom */
	.note-item-content:not([data-at-bottom]) .scroll-fade {
		opacity: 0;
	}
	
	/* Better text wrapping for long content */
	.note-item-content * {
		word-wrap: break-word;
		overflow-wrap: break-word;
	}
</style>