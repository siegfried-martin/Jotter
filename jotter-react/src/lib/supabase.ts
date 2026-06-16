import { createClient } from '@supabase/supabase-js';

// Vite exposes env vars prefixed with VITE_ on import.meta.env.
// For `dev`, these point at the SEPARATE dev Supabase project (see
// docs/initiatives/react-migration.md → Environments).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud in dev rather than silently constructing a broken client.
  console.error(
    '❌ Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in jotter-react/.env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expose the client for E2E testing (parity with the Svelte app's window hook;
// no security impact — client uses the public anon key).
if (typeof window !== 'undefined') {
  (window as unknown as { __SUPABASE_CLIENT__: typeof supabase }).__SUPABASE_CLIENT__ = supabase;
}

/**
 * Get the authenticated user with timeout protection.
 * Prevents infinite hangs when getUser() network call fails silently.
 * (Ported verbatim from the Svelte app.)
 */
export async function getAuthenticatedUser(timeoutMs = 10000) {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn('⚠️ getUser() timed out after', timeoutMs, 'ms');
      resolve(null);
    }, timeoutMs);
  });

  const getUserPromise = supabase.auth.getUser().then(({ data: { user } }) => user);

  return Promise.race([getUserPromise, timeoutPromise]);
}
