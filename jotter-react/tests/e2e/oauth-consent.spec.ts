import { test, expect, type Page } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// The full OAuth 2.1 connect flow an MCP client (Claude) runs against Jotter
// (docs/initiatives/mcp-connector.md): discover Supabase Auth's metadata, register a client
// dynamically, send the user to /authorize → Supabase forwards to Jotter's /oauth/consent →
// Allow → the client gets a code → exchanges it (PKCE) for an access token that Supabase
// accepts as this user. Requires the OAuth 2.1 server + dynamic registration to be enabled
// on the jotter-dev project, with its Site URL set to http://localhost:5174.
//
// Each run registers a new OAuth client on jotter-dev (there's no self-service delete).
// They're harmless; clean them up in the dashboard occasionally.

const REDIRECT_URI = 'http://localhost:5174/e2e-oauth-callback';

function supabaseUrl(): string {
  const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
  const m = env.match(/^VITE_SUPABASE_URL=(.*)$/m);
  if (!m) throw new Error('VITE_SUPABASE_URL missing from .env.local');
  return m[1].trim().replace(/\/+$/, '');
}

interface AuthServerMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
}

async function discover(): Promise<AuthServerMetadata> {
  const res = await fetch(`${supabaseUrl()}/.well-known/oauth-authorization-server/auth/v1`);
  expect(res.ok, 'OAuth server metadata (is the OAuth 2.1 server enabled on jotter-dev?)').toBe(
    true
  );
  return res.json();
}

async function registerClient(meta: AuthServerMetadata, name: string): Promise<string> {
  const res = await fetch(meta.registration_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: name,
      redirect_uris: [REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    })
  });
  expect(res.ok, `dynamic client registration: ${res.status} ${await res.clone().text()}`).toBe(
    true
  );
  return (await res.json()).client_id as string;
}

/** Start an authorization request and land on Jotter's consent screen. */
async function startAuthorization(page: Page, meta: AuthServerMetadata, clientId: string) {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(8).toString('hex');
  const url = new URL(meta.authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state
  }).toString();
  await page.goto(url.toString());
  await expect(page).toHaveURL(/\/oauth\/consent\?authorization_id=/);
  return { verifier, state };
}

test.describe('OAuth consent (MCP connector auth)', () => {
  test('Allow issues a code that exchanges for an access token for this user', async ({ page }) => {
    const meta = await discover();
    const name = `e2e-mcp-client-${Date.now()}`;
    const clientId = await registerClient(meta, name);
    const { verifier, state } = await startAuthorization(page, meta, clientId);

    await expect(
      page.getByRole('heading', { name: `Allow ${name} to access Jotter?` })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Allow' }).click();

    await page.waitForURL((u) => u.href.startsWith(REDIRECT_URI));
    const back = new URL(page.url());
    expect(back.searchParams.get('state')).toBe(state);
    const code = back.searchParams.get('code');
    expect(code).toBeTruthy();

    const tokenRes = await fetch(meta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: REDIRECT_URI,
        client_id: clientId,
        code_verifier: verifier
      })
    });
    expect(tokenRes.ok, `token exchange: ${await tokenRes.clone().text()}`).toBe(true);
    const tokens = await tokenRes.json();
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();

    // The token is a Supabase access token for the signed-in e2e user, tagged with the client.
    const claims = JSON.parse(
      Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString('utf8')
    );
    expect(claims.client_id).toBe(clientId);
    const userRes = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        apikey: fs
          .readFileSync(path.resolve('.env.local'), 'utf8')
          .match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m)![1]
          .trim()
      }
    });
    expect(userRes.ok).toBe(true);
    expect((await userRes.json()).email).toBe(process.env.E2E_EMAIL);
  });

  test('Deny returns access_denied to the client', async ({ page }) => {
    const meta = await discover();
    const name = `e2e-mcp-client-${Date.now()}`;
    const clientId = await registerClient(meta, name);
    await startAuthorization(page, meta, clientId);

    await page.getByRole('button', { name: 'Deny' }).click();
    await page.waitForURL((u) => u.href.startsWith(REDIRECT_URI));
    const back = new URL(page.url());
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.get('code')).toBeNull();
  });

  test('a missing authorization id shows an error, not a blank page', async ({ page }) => {
    await page.goto('/oauth/consent');
    await expect(page.getByRole('alert')).toContainText('missing its authorization request');
  });
});
