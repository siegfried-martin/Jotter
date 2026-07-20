import { Link } from '@tanstack/react-router';
import { UserMenu } from '@/components/layout/UserMenu';

/** Shared top bar for the app screens. */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Link to="/app" className="flex flex-shrink-0 items-center gap-2">
          <img src="/favicon_2.png" alt="Jotter" className="h-8 w-8" />
          <span className="text-lg font-semibold text-slate-900">Jotter</span>
        </Link>
        {children}
      </div>
      <div className="flex-shrink-0">
        <UserMenu />
      </div>
    </header>
  );
}
