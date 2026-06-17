import { Link, useNavigate } from '@tanstack/react-router';
import { signOut, useAuth } from '@/lib/auth/AuthContext';
import { useDemoMode } from '@/lib/demo/useDemoMode';
import { exitDemoMode } from '@/lib/demo/demoMode';

/** Shared top bar for the app screens. */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const demo = useDemoMode();
  const navigate = useNavigate();

  async function handleExit() {
    if (demo) exitDemoMode(false);
    else await signOut();
    navigate({ to: '/' });
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <Link to="/app" className="text-lg font-semibold text-slate-900 hover:text-blue-600">
          Jotter
        </Link>
        {children}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-500">{demo ? 'Demo' : (user?.email ?? 'Signed in')}</span>
        <button
          onClick={handleExit}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          {demo ? 'Exit demo' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}
