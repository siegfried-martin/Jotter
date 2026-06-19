import { Link } from '@tanstack/react-router';
import { UserMenu } from '@/components/layout/UserMenu';

/** Shared top bar for the app screens. */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <Link to="/app" className="flex flex-shrink-0 items-center gap-2">
          <img src="/favicon_2.png" alt="Jotter" className="h-8 w-8" />
          <span className="text-lg font-semibold text-slate-900">Jotter</span>
        </Link>
        {children}
      </div>
      <UserMenu />
    </header>
  );
}
