import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth/AuthContext';

/**
 * OAuth return target. supabase-js detects the session from the URL on load and
 * fires onAuthStateChange, which flips `user` truthy — then we forward to /app.
 * If no session materializes within a grace window, fall back to the login page.
 */
export function AuthCallbackRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: '/app' });
      return;
    }
    const timeout = setTimeout(() => navigate({ to: '/' }), 6000);
    return () => clearTimeout(timeout);
  }, [user, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      Signing you in…
    </main>
  );
}
