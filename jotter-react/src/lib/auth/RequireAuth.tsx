import { useEffect, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthContext';
import { useDemoMode } from '@/lib/demo/useDemoMode';
import { setPostLoginRedirect } from './redirect';

/** Gate for /app/* routes: allow authed users or demo mode; otherwise bounce to login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const demo = useDemoMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !demo) {
      // Remember where they were headed (e.g. a shared link) to return after login.
      setPostLoginRedirect(window.location.pathname + window.location.search);
      navigate({ to: '/' });
    }
  }, [loading, user, demo, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading…
      </div>
    );
  }
  if (!user && !demo) return null;

  return <>{children}</>;
}
