// Preserve the page a logged-out user was trying to reach across the Google OAuth
// round trip (RequireAuth bounces them to login → Google → /auth/callback). Stored in
// localStorage so it survives the full-page redirect to Google and back.

const KEY = 'jotter_post_login_redirect';

/** In-app pages worth returning to: the app itself, and the OAuth consent screen (an MCP
 *  client's connect flow must resume there after login). Never an external URL. */
function isReturnable(path: string): boolean {
  return path.startsWith('/app') || path.startsWith('/oauth/consent');
}

/** Remember an in-app destination to return to after login. */
export function setPostLoginRedirect(path: string): void {
  try {
    if (isReturnable(path)) localStorage.setItem(KEY, path);
  } catch {
    /* localStorage unavailable */
  }
}

/** Read-and-clear the saved destination (null if none / not returnable). */
export function consumePostLoginRedirect(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v) localStorage.removeItem(KEY);
    return v && isReturnable(v) ? v : null;
  } catch {
    return null;
  }
}
