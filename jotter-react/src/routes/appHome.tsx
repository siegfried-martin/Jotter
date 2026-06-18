import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { AppHeader } from '@/components/AppHeader';
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection
} from '@/lib/data/useCollections';
import { preloadAppData } from '@/lib/data/preload';
import { CollectionCard, type CollectionSaveInput } from '@/components/collections/CollectionCard';
import { CollectionCreateCard } from '@/components/collections/CollectionCreateCard';

export function AppHomeRoute() {
  return (
    <RequireAuth>
      <CollectionsHome />
    </RequireAuth>
  );
}

function CollectionsHome() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: collections, isPending, isError, error } = useCollections();
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();

  useEffect(() => {
    preloadAppData(qc).catch((e) => console.warn('preload failed:', e));
  }, [qc]);

  function open(collectionId: string) {
    navigate({ to: '/app/collections/$collectionId', params: { collectionId } });
  }

  function handleSave(id: string, input: CollectionSaveInput) {
    updateCollection.mutate({ id, updates: input });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Its notes move to your default collection.`)) return;
    deleteCollection.mutate(id);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-600">Collections</span>
      </AppHeader>

      <div className="mx-auto max-w-6xl p-6">
        <p className="mb-4 text-sm text-slate-500">
          {isPending ? 'Loading…' : `${collections?.length ?? 0} collection(s)`}
        </p>

        {isError && (
          <p className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Failed to load collections'}
          </p>
        )}

        {/* Render the whole grid (cards + create card) only once collections have
            loaded, so the static create card doesn't flash in first and then jump. */}
        {!isPending && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections?.map((c) => (
              <CollectionCard
                key={c.id}
                collection={c}
                onSelect={() => open(c.id)}
                onSave={(input) => handleSave(c.id, input)}
                onDelete={() => handleDelete(c.id, c.name)}
              />
            ))}
            <CollectionCreateCard
              count={collections?.length ?? 0}
              onCreate={(input) => createCollection.mutate(input)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
