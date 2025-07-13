<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';
	import type { NoteContainer, NoteSection, CreateNoteContainer, CreateNoteSection, ChecklistItem } from '$lib/types';
	
	import NoteContainerList from '$lib/components/NoteContainerList.svelte';
	import NoteItem from '$lib/components/NoteItem.svelte';
	import CreateNoteItem from '$lib/components/CreateNoteItem.svelte';
	
	let containers: NoteContainer[] = [];
	let selectedContainer: NoteContainer | null = null;
	let selectedContainerSections: NoteSection[] = [];
	let isCollapsed = false;
	let lastRefreshTime = 0;
	
	onMount(async () => {
		await loadContainers();
		if (containers.length > 0) {
			await selectContainer(containers[0]);
		}
	});
	
	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		// New note shortcuts - multiple options
		if ((event.ctrlKey || event.metaKey) && (event.key === 'm' || event.key === 'M')) {
			event.preventDefault();
			if (event.shiftKey) {
				// Ctrl+Shift+M: Create note with code section and open editor
				createNewNoteWithCode();
			} else {
				// Ctrl+M: Create new note
				createNewNote();
			}
		} else if (event.altKey && (event.key === 'n' || event.key === 'N')) {
			event.preventDefault();
			if (event.shiftKey) {
				// Alt+Shift+N: Create note with code section and open editor
				createNewNoteWithCode();
			} else {
				// Alt+N: Create new note
				createNewNote();
			}
		}
	}
	
	// Auto-refresh when returning to this page (e.g., from edit page)
	$: if ($page.url.pathname === '/' && Date.now() - lastRefreshTime > 1000) {
		refreshCurrentContainer();
		lastRefreshTime = Date.now();
	}
	
	async function refreshCurrentContainer() {
		if (selectedContainer) {
			await selectContainer(selectedContainer);
		}
	}
	
	async function loadContainers() {
		const { data, error } = await supabase
			.from('note_container')
			.select('*')
			.order('updated_at', { ascending: false });
			
		if (error) {
			console.error('Error loading containers:', error);
		} else {
			containers = data || [];
		}
	}
	
	async function selectContainer(container: NoteContainer) {
		selectedContainer = container;
		
		// Load sections for this container
		const { data, error } = await supabase
			.from('note_section')
			.select('*')
			.eq('note_container_id', container.id)
			.order('sequence');
			
		if (error) {
			console.error('Error loading sections:', error);
		} else {
			selectedContainerSections = data || [];
		}
	}
	
	async function createNewNote() {
		const newContainer: CreateNoteContainer = {
			title: `New Note ${new Date().toLocaleDateString()}`
		};
		
		const { data, error } = await supabase
			.from('note_container')
			.insert(newContainer)
			.select()
			.single();
			
		if (error) {
			console.error('Error creating container:', error);
		} else {
			await loadContainers();
			await selectContainer(data);
		}
	}
	
	async function createNewNoteWithCode() {
		// First create the note
		const newContainer: CreateNoteContainer = {
			title: `New Note ${new Date().toLocaleDateString()}`
		};
		
		const { data: containerData, error: containerError } = await supabase
			.from('note_container')
			.insert(newContainer)
			.select()
			.single();
			
		if (containerError) {
			console.error('Error creating container:', containerError);
			return;
		}
		
		// Then create a code section
		const newSection: CreateNoteSection = {
			note_container_id: containerData.id,
			type: 'code',
			content: '',
			sequence: 0,
			meta: { language: 'plaintext' }
		};
		
		const { data: sectionData, error: sectionError } = await supabase
			.from('note_section')
			.insert(newSection)
			.select()
			.single();
			
		if (sectionError) {
			console.error('Error creating section:', sectionError);
		} else {
			// Update containers list and navigate to the editor
			await loadContainers();
			await selectContainer(containerData);
			goto(`/edit/${sectionData.id}`);
		}
	}
	
	async function createSection(sectionType: 'checklist' | 'code' | 'wysiwyg' | 'diagram') {
		if (!selectedContainer) return;
		
		const defaultContent = {
			checklist: '',  // Empty for structured approach
			code: '',
			wysiwyg: '<p>Start typing your notes here...</p>',
			diagram: ''
		};
		
		const newSection: CreateNoteSection = {
			note_container_id: selectedContainer.id,
			type: sectionType,
			content: defaultContent[sectionType],
			sequence: selectedContainerSections.length,
			meta: sectionType === 'code' ? { language: 'plaintext' } : {},
			checklist_data: sectionType === 'checklist' ? [{ text: 'New task', checked: false }] : undefined
		};
		
		const { data, error } = await supabase
			.from('note_section')
			.insert(newSection)
			.select()
			.single();
			
		if (error) {
			console.error('Error creating section:', error);
		} else {
			console.log('Created section:', data);
			// Refresh sections and navigate to edit the new section
			await selectContainer(selectedContainer);
			console.log('Navigating to:', `/edit/${data.id}`);
			goto(`/edit/${data.id}`);
		}
	}
	
	function handleEdit(sectionId: string) {
		console.log('handleEdit called with:', sectionId);
		goto(`/edit/${sectionId}`);
	}
	
	async function deleteSection(sectionId: string) {
		if (!confirm('Are you sure you want to delete this section?')) return;
		
		const { error } = await supabase
			.from('note_section')
			.delete()
			.eq('id', sectionId);
			
		if (error) {
			console.error('Error deleting section:', error);
		} else {
			// Refresh sections
			if (selectedContainer) {
				await selectContainer(selectedContainer);
			}
		}
	}
	
	async function deleteContainer(containerId: string) {
		if (!confirm('Are you sure you want to delete this note and all its sections?')) return;
		
		// Delete the container (sections will be deleted via CASCADE)
		const { error } = await supabase
			.from('note_container')
			.delete()
			.eq('id', containerId);
			
		if (error) {
			console.error('Error deleting container:', error);
		} else {
			// Refresh containers and select a new one
			await loadContainers();
			if (containers.length > 0) {
				await selectContainer(containers[0]);
			} else {
				selectedContainer = null;
				selectedContainerSections = [];
			}
		}
	}
	
	async function handleCheckboxChange(event: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>) {
		const { sectionId, checked, lineIndex } = event.detail;
		const section = selectedContainerSections.find(s => s.id === sectionId);
		if (!section || !section.checklist_data) return;
		
		// Update the checkbox state in structured data
		if (section.checklist_data[lineIndex]) {
			section.checklist_data[lineIndex].checked = checked;
			
			// Update in database
			const { error } = await supabase
				.from('note_section')
				.update({ 
					checklist_data: section.checklist_data,
					updated_at: new Date().toISOString()
				})
				.eq('id', sectionId);
				
			if (error) {
				console.error('Error updating checkbox:', error);
			} else {
				// Update local state
				selectedContainerSections = [...selectedContainerSections];
				
				// Update container timestamp
				if (selectedContainer) {
					await supabase
						.from('note_container')
						.update({ updated_at: new Date().toISOString() })
						.eq('id', selectedContainer.id);
				}
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex h-screen bg-gray-50">
	<!-- Sidebar -->
	<NoteContainerList 
		{containers}
		{selectedContainer}
		{isCollapsed}
		on:selectContainer={(e) => selectContainer(e.detail)}
		on:createNew={createNewNote}
		on:toggleCollapse={(e) => isCollapsed = e.detail}
		on:deleteContainer={(e) => deleteContainer(e.detail)}
	/>

	<!-- Main Content Area -->
	<div class="flex-1 p-6 overflow-y-auto">
		<div class="w-full">
			{#if selectedContainer}
				<div class="flex justify-between items-center mb-6">
					<h1 class="text-2xl font-bold">{selectedContainer.title}</h1>
					<div class="flex items-center gap-2">
						<div class="text-xs text-gray-500">
							Ctrl+M or Alt+N: New note • Ctrl+Shift+M or Alt+Shift+N: New note with code
						</div>
						<button 
							on:click={refreshCurrentContainer}
							class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
							title="Refresh content"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
							</svg>
						</button>
					</div>
				</div>
				
				<!-- Note Items Grid - Dynamic sizing -->
				<div class="grid gap-6 mb-6" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
					{#each selectedContainerSections as section (section.id)}
						<NoteItem 
							{section}
							on:edit={(e) => handleEdit(e.detail)}
							on:delete={(e) => deleteSection(e.detail)}
							on:checkboxChange={handleCheckboxChange}
						/>
					{/each}
					
					{#if selectedContainerSections.length === 0}
						<div class="col-span-full text-center text-gray-500 py-12">
							This note is empty. Add a section below to get started!
						</div>
					{/if}
				</div>

				<!-- Add Section Controls -->
				<CreateNoteItem on:createSection={(e) => createSection(e.detail)} />
			{:else}
				<div class="text-center text-gray-500 py-12">
					<h1 class="text-2xl font-bold mb-4">Welcome to Jotter</h1>
					<p>Select a note from the sidebar or create a new one to get started!</p>
				</div>
			{/if}
		</div>
	</div>
</div>