import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { signOut, useAuth } from '@/lib/auth/AuthContext';
import { useDemoMode } from '@/lib/demo/useDemoMode';
import { exitDemoMode } from '@/lib/demo/demoMode';
import { useCollections, useCreateCollection } from '@/lib/data/useCollections';
import { preloadAppData } from '@/lib/data/preload';

const PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'];

/** Route shell: guards access, then renders the authed/demo collections grid. */
export function AppHomeRoute() {
  const { user, loading } = useAuth();
  const demo = useDemoMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !demo) navigate({ to: '/' });
  }, [loading, user, demo, navigate]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading…
      </main>
    );
  }
  if (!user && !demo) return null; // redirecting

  return <CollectionsHome label={demo ? 'Demo' : (user?.email ?? 'Signed in')} isDemo={demo} />;
}

function CollectionsHome({ label, isDemo }: { label: string; isDemo: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: collections, isPending, isError, error } = useCollections();
  const createCollection = useCreateCollection();
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

  async function handleExit() {
    if (isDemo) exitDemoMode(false);
    else await signOut();
    navigate({ to: '/' });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold">Jotter — Collections</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{label}</span>
          <button
            onClick={handleExit}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            {isDemo ? 'Exit demo' : 'Sign out'}
          </button>
        </div>
      </header>

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
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow"
            >
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
            </div>
          ))}
        </div>

        {!isPending && collections?.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-400">
            No collections yet — create one to get started.
          </p>
        )}
      </div>
    </main>
  );
}
