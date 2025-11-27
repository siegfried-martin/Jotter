import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

// Expose supabase client for E2E testing (no security impact - client uses public anon key)
if (typeof window !== 'undefined') {
	(window as any).__SUPABASE_CLIENT__ = supabase;
}

/**
 * Get authenticated user with timeout protection.
 * Prevents infinite hangs when getUser() network call fails silently.
 * @param timeoutMs - Timeout in milliseconds (default 10s)
 * @returns User object or null if timeout/not authenticated
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
