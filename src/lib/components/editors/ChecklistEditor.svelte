<!-- src/lib/components/editors/ChecklistEditor.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { ChecklistItem, DateShortcut } from '$lib/types';
	
	export let checklistData: ChecklistItem[] = [];
	
	const dispatch = createEventDispatcher<{
		dataChange: ChecklistItem[];
	}>();
	
	let items: ChecklistItem[] = [];
	let draggedIndex: number | null = null;
	let dropTargetIndex: number | null = null;
	
	// Date constraints - today through next month
	$: today = new Date().toISOString().split('T')[0];
	$: nextMonth = (() => {
		const date = new Date();
		date.setMonth(date.getMonth() + 1);
		return date.toISOString().split('T')[0];
	})();
	
	// Date shortcuts - simplified, always visible
	const dateShortcuts: DateShortcut[] = [
		{ label: 'T', value: new Date().toISOString().split('T')[0], key: 't' },
		{ label: 'M', value: new Date(Date.now() + 86400000).toISOString().split('T')[0], key: 'm' },
		{ label: 'W', value: new Date(Date.now() + 604800000).toISOString().split('T')[0], key: 'w' }
	];
	
	// Initialize from props - make sure we always have at least one empty item
	$: if (checklistData.length === 0) {
		items = [{ text: '', checked: false, priority: null }];
	} else {
		items = [...checklistData];
	}
	
	// Progress calculation
	$: completedCount = items.filter(item => item.checked && item.text.trim()).length;
	$: totalCount = items.filter(item => item.text.trim()).length;
	$: progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
	
	onMount(() => {
		// Focus the first input if it's empty
		if (items.length === 1 && !items[0].text.trim()) {
			focusInput(0);
		}
	});
	
	async function focusInput(index: number) {
		await tick();
		const input = document.querySelector(`[data-input-index="${index}"]`) as HTMLInputElement;
		if (input) {
			input.focus();
			if (!input.value.trim()) {
				input.select();
			}
		}
	}
	
	async function addChecklistItem(index?: number) {
		const insertIndex = index !== undefined ? index + 1 : items.length;
		const newItem: ChecklistItem = { text: '', checked: false, priority: null };
		items = [
			...items.slice(0, insertIndex),
			newItem,
			...items.slice(insertIndex)
		];
		updateData();
		await tick();
		focusInput(insertIndex);
	}
	
	function removeChecklistItem(index: number) {
		if (items.length === 1) {
			// Keep at least one item, just clear it
			items[0] = { text: '', checked: false, priority: null };
		} else {
			items = items.filter((_, i) => i !== index);
		}
		updateData();
	}
	
	function handleTextKeyDown(event: KeyboardEvent, index: number) {
		// Handle text input specific shortcuts
		if (event.key === 'Enter') {
			event.preventDefault();
			addChecklistItem(index);
		} else if (event.key === 'Backspace' && !items[index].text.trim() && items.length > 1) {
			event.preventDefault();
			removeChecklistItem(index);
			if (index > 0) {
				focusInput(index - 1);
			}
		}
		// Handle date shortcuts with Ctrl/Cmd key on text inputs
		else if (event.ctrlKey || event.metaKey) {
			const key = event.key.toLowerCase();
			let shortcut = null;
			
			if (key === 't') shortcut = dateShortcuts[0]; // Today
			else if (key === 'm') shortcut = dateShortcuts[1]; // Tomorrow  
			else if (key === 'w') shortcut = dateShortcuts[2]; // Next Week
			
			if (shortcut) {
				event.preventDefault();
				setDateShortcut(index, shortcut.value);
			}
		}
	}
	
	function handleDateKeyDown(event: KeyboardEvent, index: number) {
		// Handle Enter on date inputs to create new item
		if (event.key === 'Enter') {
			event.preventDefault();
			addChecklistItem(index);
		}
	}
	
	function handleGlobalKeyDown(event: KeyboardEvent) {
		// Enter anywhere should add new item if no input is focused
		if (event.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
			event.preventDefault();
			addChecklistItem();
		}
	}
	
	function setDateShortcut(index: number, dateValue: string) {
		items[index].date = dateValue;
		updateData();
	}
	
	function clearDate(index: number) {
		items[index].date = undefined;
		updateData();
	}
	
	function formatDateForInput(dateString?: string): string {
		if (!dateString) return '';
		
		// Fix timezone issue by treating as local date
		const [year, month, day] = dateString.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
		const currentYear = new Date().getFullYear();
		
		// Only show year if it's different from current year
		if (date.getFullYear() === currentYear) {
			return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
		} else {
			return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
		}
	}
	
	// Drag and drop functions with improved drag image
	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			
			// Create a better drag image
			const draggedElement = event.target?.closest('.checklist-item') as HTMLElement;
			if (draggedElement) {
				const clone = draggedElement.cloneNode(true) as HTMLElement;
				
				// Style the drag image
				clone.style.position = 'absolute';
				clone.style.top = '-1000px';
				clone.style.left = '0';
				clone.style.width = draggedElement.offsetWidth + 'px';
				clone.style.opacity = '0.9';
				clone.style.transform = 'rotate(2deg)';
				clone.style.background = 'white';
				clone.style.border = '2px solid #3b82f6';
				clone.style.borderRadius = '8px';
				clone.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
				clone.style.zIndex = '1000';
				
				document.body.appendChild(clone);
				event.dataTransfer.setDragImage(clone, draggedElement.offsetWidth / 2, 20);
				
				// Clean up clone
				setTimeout(() => {
					if (document.body.contains(clone)) {
						document.body.removeChild(clone);
					}
				}, 0);
			}
		}
	}
	
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}
	
	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		dropTargetIndex = null;
		
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			const draggedItem = items[draggedIndex];
			const newItems = [...items];
			newItems.splice(draggedIndex, 1);
			newItems.splice(dropIndex, 0, draggedItem);
			items = newItems;
			updateData();
		}
		draggedIndex = null;
	}
	
	function getPriorityColor(priority?: string | null): string {
		switch (priority) {
			case 'high': return 'bg-red-100 text-red-800 border-red-300';
			case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
			case 'low': return 'bg-green-100 text-green-800 border-green-300';
			default: return 'bg-gray-100 text-gray-600 border-gray-300';
		}
	}
	
	function updateData() {
		dispatch('dataChange', items);
	}
	
	// Watch for changes and update
	$: if (items) {
		updateData();
	}
</script>

<svelte:window on:keydown={handleGlobalKeyDown} />

<div class="h-full flex flex-col">
	<!-- Progress Header -->
	{#if totalCount > 0 || items.some(item => item.text.trim())}
		<div class="mb-4 p-3 bg-gray-50 rounded-lg">
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-gray-700">
					Progress: {completedCount} of {totalCount} completed
				</span>
				<span class="text-sm text-gray-500">{progressPercentage}%</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div 
					class="bg-blue-500 h-2 rounded-full transition-all duration-300"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Checklist Items - Fixed Layout: Single column using left 50% on large screens -->
	<div class="flex-1 overflow-y-auto pr-2">
		<div class="flex flex-col space-y-4 lg:w-1/2">
			{#each items as item, index}
				<div 
					class="checklist-item flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors {draggedIndex === index ? 'opacity-50' : ''} {dropTargetIndex === index ? 'border-blue-500 bg-blue-50' : ''}"
					on:dragover={handleDragOver}
					on:drop={(e) => handleDrop(e, index)}
					on:dragenter={() => dropTargetIndex = index}
					on:dragleave={() => dropTargetIndex = null}
				>
					<!-- Drag Handle -->
					<div 
						class="text-gray-400 cursor-move flex-shrink-0 hover:text-gray-600"
						draggable="true"
						on:dragstart={(e) => handleDragStart(e, index)}
						title="Drag to reorder"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path>
						</svg>
					</div>
					
					<!-- Checkbox -->
					<input 
						type="checkbox" 
						bind:checked={item.checked}
						class="w-5 h-5 text-blue-600 rounded flex-shrink-0"
					>
					
					<!-- Task Input -->
					<input 
						type="text" 
						bind:value={item.text}
						placeholder="Enter task..."
						data-input-index={index}
						class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-0"
						on:keydown={(e) => handleTextKeyDown(e, index)}
						draggable="false"
					>
					
					<!-- Date Input with Quick Action Buttons -->
					<div class="flex items-center space-x-1 flex-shrink-0">
						<!-- Quick Date Buttons -->
						{#each dateShortcuts as shortcut}
							<button
								class="text-xs px-2 py-1 bg-gray-200 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded transition-colors"
								on:click={() => setDateShortcut(index, shortcut.value)}
								title="{shortcut.label === 'T' ? 'Today' : shortcut.label === 'M' ? 'Tomorrow' : 'Next Week'} (Ctrl+{shortcut.key})"
							>
								{shortcut.label}
							</button>
						{/each}
						
						<!-- Native Date Picker -->
						<input 
							type="date" 
							bind:value={item.date}
							min={today}
							max={nextMonth}
							class="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
							on:keydown={(e) => handleDateKeyDown(e, index)}
						>
						
						<!-- Clear Date Button -->
						{#if item.date}
							<button
								class="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
								on:click={() => clearDate(index)}
								title="Clear date"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						{/if}
					</div>
					
					<!-- Priority Indicator -->
					<div class="relative flex-shrink-0">
						<select 
							bind:value={item.priority}
							class="appearance-none border border-gray-300 cursor-pointer w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm {getPriorityColor(item.priority)}"
							title="Priority: {item.priority || 'None'}"
						>
							<option value={null}>None</option>
							<option value="high">High</option>
							<option value="medium">Medium</option>
							<option value="low">Low</option>
						</select>
					</div>
					
					<!-- Remove Button -->
					<button 
						on:click={() => removeChecklistItem(index)}
						class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
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
	
	<!-- Add Item Footer -->
	<div class="mt-6 pt-4 border-t border-gray-200">
		<button 
			on:click={() => addChecklistItem()}
			class="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:bg-blue-50"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
			</svg>
			Add new item
			<span class="text-gray-400 text-xs ml-2">or press Enter</span>
		</button>
		
		<!-- Keyboard Hints -->
		<div class="mt-2 text-xs text-gray-500">
			<div>⌨️ Shortcuts: Enter = new item • Backspace on empty = delete • Ctrl+T/M/W = quick dates • Drag handle to reorder</div>
		</div>
	</div>
</div>