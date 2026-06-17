import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { AppHeader } from '@/components/AppHeader';
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection
} from '@/lib/data/useCollections';
import { preloadAppData } from '@/lib/data/preload';

const PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'];

export function AppHomeRoute() {
  return (
    <RequireAuth>
      <CollectionsHome />
    </RequireAuth>
  );
}

function CollectionsHome() {
  const qc = useQueryClient();
  const { data: collections, isPending, isError, error } = useCollections();
  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    preloadAppData(qc).catch((e) => console.warn('preload failed:', e));
  }, [qc]);

  async function handleNew() {
    setCreating(true);
    try {
      await createCollection.mutateAsync({
        name: `New collection ${new Date().toLocaleTimeString()}`,
        color: PALETTE[(collections?.length ?? 0) % PALETTE.length]
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-600">Collections</span>
      </AppHeader>

      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {isPending ? 'Loading…' : `${collections?.length ?? 0} collection(s)`}
          </p>
          <button
            onClick={handleNew}
            disabled={creating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'New collection'}
          </button>
        </div>

        {isError && (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Failed to load collections'}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {collections?.map((c) => (
            <Link
              key={c.id}
              to="/app/collections/$collectionId"
              params={{ collectionId: c.id }}
              className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (
                    window.confirm(`Delete "${c.name}"? Its notes move to your default collection.`)
                  ) {
                    deleteCollection.mutate(c.id);
                  }
                }}
                className="absolute top-2 right-2 rounded p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                aria-label="Delete collection"
              >
                ✕
              </button>
              <span
                className="mb-3 block h-2 w-10 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <h2 className="truncate font-medium">{c.name}</h2>
              {c.description && (
                <p className="mt-1 truncate text-xs text-slate-500">{c.description}</p>
              )}
              {c.is_default && (
                <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 uppercase">
                  default
                </span>
              )}
            </Link>
          ))}
        </div>

        {!isPending && collections?.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-400">
            No collections yet — create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
