<!-- src/lib/components/CollectionGrid.svelte (Refactored) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Collection } from '$lib/types';
  import CollectionCard from './CollectionCard.svelte';
  import CollectionCreateCard from './CollectionCreateCard.svelte';
  import CollectionDeleteConfirm from './CollectionDeleteConfirm.svelte';

  export let collections: Collection[] = [];

  const dispatch = createEventDispatcher<{
    select: Collection;
    create: { name: string; color: string; description?: string };
    edit: Collection;
    delete: Collection;
  }>();

  let editingCollectionId: string | null = null;
  let deletingCollection: Collection | null = null;

  function handleSelect(event: CustomEvent<Collection>) {
    dispatch('select', event.detail);
  }

  function handleCreate(event: CustomEvent<{ name: string; color: string; description?: string }>) {
    dispatch('create', event.detail);
  }

  function handleStartEdit(event: CustomEvent<Collection>) {
    editingCollectionId = event.detail.id;
  }

  function handleEdit(event: CustomEvent<Collection>) {
    dispatch('edit', event.detail);
    editingCollectionId = null;
  }

  function handleCancelEdit() {
    editingCollectionId = null;
  }

  function handleDelete(event: CustomEvent<Collection>) {
    deletingCollection = event.detail;
  }

  function handleConfirmDelete(event: CustomEvent<Collection>) {
    dispatch('delete', event.detail);
    deletingCollection = null;
  }

  function handleCancelDelete() {
    deletingCollection = null;
  }
</script>

<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <!-- Collection Cards -->
  {#each collections as collection (collection.id)}
    <div class="relative">
      <CollectionCard 
        {collection}
        isEditing={editingCollectionId === collection.id}
        on:select={handleSelect}
        on:startEdit={handleStartEdit}
        on:edit={handleEdit}
        on:cancelEdit={handleCancelEdit}
        on:delete={handleDelete}
      />
      
      <!-- Delete Confirmation Overlay -->
      {#if deletingCollection?.id === collection.id}
        <CollectionDeleteConfirm 
          collection={deletingCollection}
          on:confirm={handleConfirmDelete}
          on:cancel={handleCancelDelete}
        />
      {/if}
    </div>
  {/each}

  <!-- Create New Collection Card -->
  <CollectionCreateCard collectionCount={collections.length} on:create={handleCreate} />
</div>