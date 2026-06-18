import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { signInWithGoogle, useAuth } from '@/lib/auth/AuthContext';
import { hasDemoData, initDemoMode } from '@/lib/demo/demoMode';

function mapAuthError(code: string, message: string | null): string {
  switch (code) {
    case 'auth_error':
      return 'Authentication failed. Please try again.';
    case 'callback_failed':
      return 'Login callback failed. Please try again.';
    case 'oauth_error':
      return message ? decodeURIComponent(message) : 'OAuth authentication failed.';
    case 'no_auth_code':
      return 'No authorization code received. Please try signing in again.';
    case 'session_exchange_failed':
      return message
        ? `Session creation failed: ${decodeURIComponent(message)}`
        : 'Failed to create session.';
    case 'no_session_created':
      return 'No session was created after authentication. Please try again.';
    default:
      return message ? decodeURIComponent(message) : 'An authentication error occurred.';
  }
}

const GoogleLogo = () => (
  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const FEATURES = [
  { d: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Lightning-fast note creation' },
  { d: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', label: 'Built for developers' },
  {
    d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    label: 'Code, diagrams, and checklists'
  }
];

export function LoginRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [hasDemo] = useState(() => hasDemoData());

  useEffect(() => {
    if (!loading && user) navigate({ to: '/app' });
  }, [loading, user, navigate]);

  // Surface auth errors passed back via URL params, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('error');
    if (!code) return;
    setError(mapAuthError(code, params.get('message')));
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    url.searchParams.delete('message');
    window.history.replaceState({}, '', url.toString());
  }, []);

  async function handleGoogle() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Sign-in failed:', e);
      setError('Sign-in failed. Please try again.');
      setSigningIn(false);
    }
  }

  function handleDemo() {
    initDemoMode();
    navigate({ to: '/app' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h1 className="mb-3 text-5xl font-bold text-slate-900">Jotter</h1>
            <p className="mb-2 text-xl text-slate-600">Lightning-fast notes for developers</p>
            <p className="mb-8 text-sm text-slate-500">
              The better whiteboard for devs — pseudocode, algorithms, and structured thinking
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-500 shadow-lg">
              Initializing…
            </div>
          ) : signingIn ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-500 shadow-lg">
              Signing you in…
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg">
                {error && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-1 text-xs text-red-600 underline hover:text-red-500"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <h2 className="text-center text-2xl font-semibold text-slate-900">
                  Welcome to Jotter
                </h2>
                <p className="mt-2 text-center text-slate-600">
                  Sign in to access your lightning-fast developer notes
                </p>

                <button
                  onClick={handleGoogle}
                  className="mt-6 flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <GoogleLogo />
                  Continue with Google
                </button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-slate-500">or</span>
                  </div>
                </div>

                <button
                  onClick={handleDemo}
                  className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100"
                >
                  <svg
                    className="mr-2 h-5 w-5 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {hasDemo ? 'Continue Demo' : 'Try Without Account'}
                </button>

                <p className="mt-3 text-center text-xs text-slate-500">
                  No sign-up required. Your notes are saved locally in your browser.
                </p>
              </div>

              <div className="space-y-3 text-center text-sm text-slate-600">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.d} />
                    </svg>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
