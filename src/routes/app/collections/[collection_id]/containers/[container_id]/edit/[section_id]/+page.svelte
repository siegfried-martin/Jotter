<!-- src/routes/app/collections/[collection_id]/containers/[container_id]/edit/[section_id]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { SectionService } from '$lib/services/sectionService';
	import type { NoteSection } from '$lib/types';
	
	// Import editor components
	import ChecklistEditor from '$lib/components/editors/ChecklistEditor.svelte';
	import CodeEditor from '$lib/components/editors/CodeEditor.svelte';
	import WysiwygEditor from '$lib/components/editors/WysiwygEditor.svelte';
	import DiagramEditor from '$lib/components/editors/DiagramEditor.svelte';
	
	let section: NoteSection | null = null;
	let loading = true;
	let saving = false;
	let error = '';
	let hasUnsavedChanges = false;
	
	// Form data
	let content = '';
	let language = 'plaintext';
	let checklistData: import('$lib/types').ChecklistItem[] = [];
	
	$: sectionId = $page.params.section_id;
	$: collectionId = $page.params.collection_id;
	
	onMount(async () => {
		await loadSection();
	});
	
	// Warn before leaving if there are unsaved changes
	beforeNavigate(({ cancel }) => {
		if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
			cancel();
		}
	});
	
	async function loadSection() {
		if (!sectionId) return;
		
		try {
			section = await SectionService.getSection(sectionId);
			
			if (!section) {
				error = 'Section not found';
				loading = false;
				return;
			}
			
			// Check for draft content first (only if localStorage is available)
			let draftContent = null;
			try {
				draftContent = localStorage?.getItem(`draft_${section.id}`);
			} catch (e) {
				// localStorage not available, continue normally
			}
			
			content = draftContent || section.content;
			language = section.meta?.language || 'plaintext';
			checklistData = section.checklist_data || [];
			
			// Mark as having unsaved changes if we loaded draft content
			hasUnsavedChanges = !!draftContent;
			
		} catch (loadError) {
			console.error('Error loading section:', loadError);
			error = 'Failed to load section';
		} finally {
			loading = false;
		}
	}
	
	async function saveSection() {
		if (!section) return;
		
		saving = true;
		
		try {
			const updateData: any = {
				content,
			};
			
			if (section.type === 'code') {
				updateData.meta = { ...section.meta, language };
			} else if (section.type === 'checklist') {
				updateData.checklist_data = checklistData;
			}
			
			await SectionService.updateSection(section.id, updateData);
			
			// Clear draft and mark as saved
			try {
				localStorage?.removeItem(`draft_${section.id}`);
			} catch (e) {
				// localStorage not available, continue
			}
			hasUnsavedChanges = false;
			
			// Navigate back to collection page
			goto(`/app/collections/${collectionId}`);
			
		} catch (saveError) {
			console.error('Error saving section:', saveError);
			error = 'Failed to save changes';
		} finally {
			saving = false;
		}
	}
	
	function handleCancel() {
		// Cancel without saving - just go back to collection
		goto(`/app/collections/${collectionId}`);
	}
	
	function handleContentChange(event: CustomEvent<string>) {
		content = event.detail;
		hasUnsavedChanges = true;
		
		// Auto-save draft if localStorage is available
		try {
			if (section) {
				localStorage?.setItem(`draft_${section.id}`, content);
			}
		} catch (e) {
			// localStorage not available, continue
		}
	}
	
	function handleLanguageChange(event: CustomEvent<string>) {
		language = event.detail;
		hasUnsavedChanges = true;
		
		// Update the section meta immediately for consistency
		if (section) {
			section.meta = { ...section.meta, language };
		}
	}
	
	function handleChecklistDataChange(event: CustomEvent<import('$lib/types').ChecklistItem[]>) {
		checklistData = event.detail;
		hasUnsavedChanges = true;
	}
	
	// Auto-save and close
	async function saveAndClose() {
		await saveSection();
		// saveSection already handles navigation on success
	}
	
	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (event.ctrlKey || event.metaKey) {
			if (event.key === 's') {
				event.preventDefault();
				saveAndClose();
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			saveAndClose();
		}
	}
	
	// Handle background click
	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			saveAndClose();
		}
	}
</script>

<svelte:head>
	<title>Edit {section?.type || 'Section'} - Jotter</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<!-- Full-screen modal background -->
<div 
	class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
	on:click={handleBackgroundClick}
>
	<!-- Wider modal - changed from max-w-7xl to max-w-full with specific width -->
	<div class="bg-white rounded-xl shadow-2xl w-full border border-gray-200 flex flex-col"
		 style="width: 95vw; height: 90vh;">
		
		{#if loading}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p class="text-gray-600">Loading section...</p>
				</div>
			</div>
			
		{:else if error}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-center">
					<p class="text-red-600 mb-4 text-lg">{error}</p>
					<button 
						on:click={handleCancel}
						class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
					>
						Go Back
					</button>
				</div>
			</div>
			
		{:else if section}
			<!-- Content Area -->
			<div class="flex-1 p-6 overflow-hidden">
				{#if section.type === 'checklist'}
					<ChecklistEditor 
						{checklistData}
						on:dataChange={handleChecklistDataChange}
					/>
				{:else if section.type === 'code'}
					<CodeEditor 
						{content} 
						{language}
						on:contentChange={handleContentChange}
						on:languageChange={handleLanguageChange}
					/>
				{:else if section.type === 'wysiwyg'}
					<WysiwygEditor 
						{content}
						on:contentChange={handleContentChange}
					/>
				{:else if section.type === 'diagram'}
					<DiagramEditor 
						{content}
						on:contentChange={handleContentChange}
					/>
				{/if}
			</div>
			
			<!-- Footer -->
			<div class="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
				<button 
					on:click={handleCancel}
					class="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
					disabled={saving}
				>
					Cancel
				</button>
				<button 
					on:click={saveAndClose}
					class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors font-medium shadow-sm"
					disabled={saving}
				>
					{#if saving}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
					{/if}
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		{/if}
	</div>
</div>