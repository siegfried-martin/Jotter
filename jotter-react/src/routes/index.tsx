import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Phase 0 scaffold landing page.
 *
 * This is a throwaway placeholder that proves the stack is wired:
 * React + TanStack Router (rendering this route) + TanStack Query (the health
 * check below) + Tailwind v4 (styling) + the Supabase client. It will be
 * replaced by the real landing page in Phase 2.
 */
function useSupabaseHealth() {
  return useQuery({
    queryKey: ['health', 'supabase'],
    queryFn: async () => {
      // getSession() is a safe, auth-free probe that confirms the client is
      // configured and reachable. We only care that it resolves without throwing.
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      return 'ok' as const;
    }
  });
}

export function IndexRoute() {
  const health = useSupabaseHealth();

  const status = health.isPending
    ? { label: 'checking…', cls: 'bg-amber-100 text-amber-800' }
    : health.isError
      ? { label: 'unreachable', cls: 'bg-red-100 text-red-800' }
      : { label: 'connected', cls: 'bg-emerald-100 text-emerald-800' };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-8 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Jotter — React scaffold</h1>
        <p className="mt-2 text-sm text-slate-500">
          Phase 0 of the Svelte → React migration. Parity build in progress.
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">React + TanStack Router</dt>
            <dd className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
              rendering
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Tailwind v4</dt>
            <dd className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
              styled
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">TanStack Query → Supabase</dt>
            <dd className={`rounded-full px-3 py-1 font-medium ${status.cls}`}>{status.label}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
