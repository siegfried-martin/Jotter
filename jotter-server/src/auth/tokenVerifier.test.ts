import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { SupabaseTokenVerifier, decodeClaims } from './tokenVerifier';

function jwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`;
}

function fakeAnon(getUser: ReturnType<typeof vi.fn>): SupabaseClient {
  return { auth: { getUser } } as unknown as SupabaseClient;
}

const future = () => Math.floor(Date.now() / 1000) + 3600;

describe('decodeClaims', () => {
  it('reads the payload and rejects garbage', () => {
    expect(decodeClaims(jwt({ exp: 5, client_id: 'c' }))).toEqual({ exp: 5, client_id: 'c' });
    expect(decodeClaims('nope')).toBeNull();
  });
});

describe('SupabaseTokenVerifier', () => {
  it('accepts a token Supabase vouches for and carries the user + OAuth client', async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c' } }, error: null });
    const v = new SupabaseTokenVerifier(fakeAnon(getUser));
    const token = jwt({ exp: future(), client_id: 'claude', scope: 'openid email' });
    const info = await v.verifyAccessToken(token);
    expect(info.clientId).toBe('claude');
    expect(info.scopes).toEqual(['openid', 'email']);
    expect(info.extra).toEqual({ userId: 'u1', email: 'a@b.c' });
  });

  it('caches successful verifications', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const v = new SupabaseTokenVerifier(fakeAnon(getUser));
    const token = jwt({ exp: future() });
    await v.verifyAccessToken(token);
    await v.verifyAccessToken(token);
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('rejects expired, malformed, and revoked tokens', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const v = new SupabaseTokenVerifier(fakeAnon(getUser));
    await expect(v.verifyAccessToken(jwt({ exp: 1 }))).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(v.verifyAccessToken('x.y.z')).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(v.verifyAccessToken(jwt({ exp: future() }))).rejects.toBeInstanceOf(
      InvalidTokenError
    );
    expect(getUser).toHaveBeenCalledTimes(1); // expired/malformed never reach Supabase
  });
});
