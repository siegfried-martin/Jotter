<!-- src/lib/components/ui/InlineEditableTitle.svelte -->
<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	
	export let title: string;
	export let placeholder: string = 'Untitled Note';
	export let maxLength: number = 100;
	export let className: string = '';
	
	const dispatch = createEventDispatcher<{
		save: string;
	}>();
	
	let isEditing = false;
	let inputElement: HTMLInputElement;
	let currentValue = title;
	
	// Update currentValue when title prop changes
	$: currentValue = title;
	
	async function startEditing(event: Event) {
		// Stop propagation to prevent parent click handlers
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		
		isEditing = true;
		await tick(); // Wait for input to be rendered
		if (inputElement) {
			inputElement.focus();
			inputElement.select(); // Select all text for easy replacement
		}
	}
	
	function cancelEditing() {
		isEditing = false;
		currentValue = title; // Reset to original value
	}
	
	function saveTitle() {
		const trimmed = currentValue.trim();
		if (trimmed && trimmed !== title) {
			dispatch('save', trimmed);
		}
		isEditing = false;
	}
	
	function handleKeydown(event: KeyboardEvent) {
		// Stop propagation on all keyboard events during editing
		event.stopPropagation();
		event.stopImmediatePropagation();
		
		if (event.key === 'Enter') {
			event.preventDefault();
			saveTitle();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEditing();
		}
	}
	
	function handleBlur() {
		// Small delay to allow click events to fire first
		setTimeout(() => {
			if (isEditing) {
				saveTitle();
			}
		}, 100);
	}
	
	function handleInputClick(event: Event) {
		// Stop propagation on input clicks to prevent card navigation
		event.stopPropagation();
		event.stopImmediatePropagation();
	}
	
	function handleSpanKeydown(event: KeyboardEvent) {
		// Stop propagation and handle enter key to start editing
		event.stopPropagation();
		event.stopImmediatePropagation();
		
		if (event.key === 'Enter') {
			event.preventDefault();
			startEditing(event);
		}
	}
</script>

{#if isEditing}
	<input
		bind:this={inputElement}
		bind:value={currentValue}
		on:keydown={handleKeydown}
		on:blur={handleBlur}
		on:click={handleInputClick}
		{maxLength}
		class="bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1 -mx-1 {className}"
		style="width: 100%; min-width: 120px;"
	/>
{:else}
	<span
		on:click={startEditing}
		on:keydown={handleSpanKeydown}
		class="cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors {className}"
		tabindex="0"
		role="button"
		aria-label="Click to edit title"
		title="Click to edit title"
	>
		{title || placeholder}
	</span>
{/if}