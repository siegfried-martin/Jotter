import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { OAuthAuthorizationDetails } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { setPostLoginRedirect } from '@/lib/auth/redirect';
import { useDocumentTitle } from '@/lib/util/useDocumentTitle';

// OAuth consent screen for Supabase Auth's OAuth 2.1 server (docs/initiatives/mcp-connector.md).
// When Claude (or any MCP client) connects to Jotter, Supabase Auth sends the user here with an
// `authorization_id`. We show who is asking, and on Allow/Deny Supabase redirects back to the
// client with an authorization code (or an error). Logged-out users go through the normal
// Google login and are returned here afterwards.

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'consent'; details: OAuthAuthorizationDetails }
  | { kind: 'redirecting' };

const CAPABILITIES = [
  'Search and read the notes you can access in Jotter',
  'Create notes, and add to or edit existing ones',
  'It cannot delete anything'
];

export function OAuthConsentRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id');

  useDocumentTitle('Connect to Jotter');

  useEffect(() => {
    if (loading) return;
    if (!authorizationId) {
      setState({ kind: 'error', message: 'This link is missing its authorization request.' });
      return;
    }
    if (!user) {
      setPostLoginRedirect(window.location.pathname + window.location.search);
      navigate({ to: '/' });
      return;
    }
    let active = true;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setState({
          kind: 'error',
          message: error?.message ?? 'This authorization request is invalid or has expired.'
        });
      } else if ('authorization_id' in data) {
        setState({ kind: 'consent', details: data });
      } else {
        // Already approved earlier for these scopes. Supabase hands back the redirect directly.
        setState({ kind: 'redirecting' });
        window.location.assign(data.redirect_url);
      }
    });
    return () => {
      active = false;
    };
  }, [loading, user, authorizationId, navigate]);

  async function decide(approve: boolean) {
    if (!authorizationId) return;
    setState({ kind: 'redirecting' });
    const opts = { skipBrowserRedirect: true };
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, opts)
      : await supabase.auth.oauth.denyAuthorization(authorizationId, opts);
    if (error || !data) {
      setState({ kind: 'error', message: error?.message ?? 'Something went wrong. Try again.' });
      return;
    }
    window.location.assign(data.redirect_url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg">
          {state.kind === 'loading' && (
            <p className="text-center text-slate-500">Loading authorization request…</p>
          )}
          {state.kind === 'redirecting' && (
            <p className="text-center text-slate-500">Returning you to the app…</p>
          )}
          {state.kind === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
              <p className="text-sm text-red-800">{state.message}</p>
            </div>
          )}
          {state.kind === 'consent' && (
            <ConsentForm details={state.details} onDecide={(approve) => void decide(approve)} />
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentForm({
  details,
  onDecide
}: {
  details: OAuthAuthorizationDetails;
  onDecide: (approve: boolean) => void;
}) {
  const clientName = details.client.name || 'An application';
  return (
    <>
      <h1 className="text-center text-2xl font-semibold text-slate-900">
        Allow {clientName} to access Jotter?
      </h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        Signed in as <span className="font-medium text-slate-800">{details.user.email}</span>
      </p>

      <ul className="mt-6 space-y-2 text-sm text-slate-700">
        {CAPABILITIES.map((c) => (
          <li key={c} className="flex gap-2">
            <span aria-hidden className="text-blue-600">
              •
            </span>
            {c}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs break-all text-slate-500">
        After you decide, you&apos;ll be sent back to{' '}
        <span className="font-mono">{details.redirect_uri}</span>
      </p>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => onDecide(false)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Deny
        </button>
        <button
          type="button"
          onClick={() => onDecide(true)}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Allow
        </button>
      </div>
    </>
  );
}
