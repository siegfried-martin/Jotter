import type { SupabaseClient } from '@supabase/supabase-js';
import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

// Validates Supabase access tokens presented as `Authorization: Bearer <token>`.
//
// Tokens come from Supabase Auth's OAuth 2.1 server (what Claude's connector flow obtains)
// or are ordinary Supabase session tokens (handy for local testing). Either way they are
// Supabase JWTs, so `auth.getUser(token)` is the authoritative check — it also catches
// revoked sessions, which a local signature check would not. Results are cached briefly so
// a burst of tool calls doesn't round-trip to Auth for each one.

export interface JotterAuthExtra extends Record<string, unknown> {
  userId: string;
  email: string | null;
}

interface Claims {
  exp?: number;
  client_id?: string;
  scope?: string;
}

const CACHE_TTL_MS = 60_000;

/** Decode a JWT's payload WITHOUT verifying it (verification is getUser's job). */
export function decodeClaims(token: string): Claims | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Claims;
  } catch {
    return null;
  }
}

export class SupabaseTokenVerifier implements OAuthTokenVerifier {
  private cache = new Map<string, { info: AuthInfo; until: number }>();

  constructor(private anon: SupabaseClient) {}

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const now = Date.now();
    const hit = this.cache.get(token);
    if (hit && hit.until > now) return hit.info;

    const claims = decodeClaims(token);
    if (!claims?.exp) throw new InvalidTokenError('Malformed access token');
    if (claims.exp * 1000 <= now) throw new InvalidTokenError('Token has expired');

    const { data, error } = await this.anon.auth.getUser(token);
    if (error || !data.user) throw new InvalidTokenError('Invalid or revoked access token');

    const extra: JotterAuthExtra = { userId: data.user.id, email: data.user.email ?? null };
    const info: AuthInfo = {
      token,
      clientId: claims.client_id ?? 'supabase-session',
      scopes: (claims.scope ?? '').split(' ').filter(Boolean),
      expiresAt: claims.exp,
      extra
    };
    this.pruneExpired(now);
    this.cache.set(token, { info, until: Math.min(now + CACHE_TTL_MS, claims.exp * 1000) });
    return info;
  }

  private pruneExpired(now: number): void {
    for (const [key, entry] of this.cache) if (entry.until <= now) this.cache.delete(key);
  }
}
