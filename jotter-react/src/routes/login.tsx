import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { signInWithGoogle, useAuth } from '@/lib/auth/AuthContext';
import { initDemoMode } from '@/lib/demo/demoMode';

export function LoginRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: '/app' });
  }, [loading, user, navigate]);

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    }
  }

  function handleDemo() {
    initDemoMode();
    navigate({ to: '/app' });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Jotter</h1>
        <p className="mt-1 text-sm text-slate-500">Notepad++ but better — the React build (dev).</p>

        <button
          onClick={handleGoogle}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign in with Google
        </button>

        <button
          onClick={handleDemo}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try without an account
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
