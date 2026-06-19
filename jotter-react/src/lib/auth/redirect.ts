// Preserve the page a logged-out user was trying to reach across the Google OAuth
// round trip (RequireAuth bounces them to login → Google → /auth/callback). Stored in
// localStorage so it survives the full-page redirect to Google and back.

const KEY = 'jotter_post_login_redirect';

/** Remember an in-app destination to return to after login (only /app/* paths). */
export function setPostLoginRedirect(path: string): void {
  try {
    if (path.startsWith('/app')) localStorage.setItem(KEY, path);
  } catch {
    /* localStorage unavailable */
  }
}

/** Read-and-clear the saved destination (null if none / not an in-app path). */
export function consumePostLoginRedirect(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v) localStorage.removeItem(KEY);
    return v && v.startsWith('/app') ? v : null;
  } catch {
    return null;
  }
}
