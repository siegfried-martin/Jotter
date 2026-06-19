import { Link } from '@tanstack/react-router';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { AppHeader } from '@/components/AppHeader';
import { useDocumentTitle } from '@/lib/util/useDocumentTitle';

export function SettingsRoute() {
  useDocumentTitle('Settings');
  return (
    <RequireAuth>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AppHeader>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-600">Settings</span>
        </AppHeader>

        <div className="mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-2 text-slate-600">Manage your account and preferences</p>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-500">User preferences coming soon.</p>
            <Link
              to="/app"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              ← Back to Notes
            </Link>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
