<!-- src/lib/components/ui/MigrationPrompt.svelte -->
<!-- Modal prompt for migrating demo data to authenticated user's cloud storage -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		getDemoDataStats,
		migrateDemoToCloud,
		skipMigrationAndClearDemo,
		type MigrationStats,
		type MigrationResult
	} from '$lib/services/migrationService';

	const dispatch = createEventDispatcher<{
		complete: { migrated: boolean; result?: MigrationResult };
	}>();

	let stats: MigrationStats | null = null;
	let isMigrating = false;
	let migrationError: string | null = null;

	// Load stats on mount
	$: {
		stats = getDemoDataStats();
	}

	async function handleImport() {
		isMigrating = true;
		migrationError = null;

		try {
			const result = await migrateDemoToCloud();

			if (result.success) {
				dispatch('complete', { migrated: true, result });
			} else {
				migrationError = result.error || 'Migration failed';
				isMigrating = false;
			}
		} catch (error) {
			migrationError = error instanceof Error ? error.message : 'Unknown error';
			isMigrating = false;
		}
	}

	function handleStartFresh() {
		skipMigrationAndClearDemo();
		dispatch('complete', { migrated: false });
	}
</script>

<!-- Modal backdrop -->
<div
	class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="migration-title"
>
	<!-- Modal content -->
	<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-5">
		<!-- Header -->
		<div class="text-center">
			<div class="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
				<svg
					class="w-6 h-6 text-blue-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
			</div>
			<h2 id="migration-title" class="text-xl font-semibold text-gray-900">
				Import Your Demo Notes?
			</h2>
		</div>

		<!-- Stats -->
		{#if stats}
			<div class="bg-gray-50 rounded-lg p-4">
				<p class="text-sm text-gray-600 mb-3">
					You have notes saved locally from demo mode:
				</p>
				<div class="grid grid-cols-3 gap-4 text-center">
					<div>
						<div class="text-2xl font-bold text-gray-900">{stats.collections}</div>
						<div class="text-xs text-gray-500">
							{stats.collections === 1 ? 'Collection' : 'Collections'}
						</div>
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-900">{stats.containers}</div>
						<div class="text-xs text-gray-500">
							{stats.containers === 1 ? 'Note' : 'Notes'}
						</div>
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-900">{stats.sections}</div>
						<div class="text-xs text-gray-500">
							{stats.sections === 1 ? 'Section' : 'Sections'}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Description -->
		<p class="text-sm text-gray-600 text-center">
			Would you like to import these notes to your account? They'll sync across all your devices.
		</p>

		<!-- Error message -->
		{#if migrationError}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3">
				<p class="text-sm text-red-700">{migrationError}</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="space-y-3">
			<button
				on:click={handleImport}
				disabled={isMigrating}
				class="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{#if isMigrating}
					<span class="flex items-center justify-center gap-2">
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
							/>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						Importing...
					</span>
				{:else}
					Import Notes
				{/if}
			</button>

			<button
				on:click={handleStartFresh}
				disabled={isMigrating}
				class="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				Start Fresh
			</button>
		</div>

		<!-- Fine print -->
		<p class="text-xs text-gray-400 text-center">
			Starting fresh will permanently delete your demo notes.
		</p>
	</div>
</div>
