import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Config } from '../src/config';
import { createApp } from '../src/http/app';
import { createAnonClient } from '../src/supabase';
import { SupabaseTokenVerifier } from '../src/auth/tokenVerifier';

// Integration harness: signs in as the jotter-dev e2e user, boots the real HTTP app on an
// ephemeral port, and connects a real MCP client over Streamable HTTP with that user's
// access token. The Supabase URL/key come from ../jotter-react/.env.local and the e2e user's
// credentials from ../jotter-react/.env.test (both gitignored).

function readEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

export interface Harness {
  /** The e2e user's own Supabase client (for seeding + asserting on the DB). */
  db: SupabaseClient;
  userId: string;
  mcp: Client;
  config: Config;
  close(): Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const env = {
    ...readEnv(new URL('../../jotter-react/.env.local', import.meta.url).pathname),
    ...readEnv(new URL('../../jotter-react/.env.test', import.meta.url).pathname)
  };
  const config: Config = {
    host: '127.0.0.1',
    port: 0,
    publicUrl: 'http://127.0.0.1',
    appUrl: 'http://localhost:5174',
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY
  };

  const db = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await db.auth.signInWithPassword({
    email: env.E2E_EMAIL,
    password: env.E2E_PASSWORD
  });
  if (error || !data.session) throw new Error(`e2e sign-in failed: ${error?.message}`);

  const app = createApp(config, new SupabaseTokenVerifier(createAnonClient(config)));
  const server: Server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const port = (server.address() as AddressInfo).port;

  const mcp = new Client({ name: 'jotter-int-test', version: '0' });
  await mcp.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
    })
  );

  return {
    db,
    userId: data.user.id,
    mcp,
    config,
    async close() {
      await mcp.close();
      server.close();
    }
  };
}

export interface SeededTree {
  collectionId: string;
  containerId: string;
  sectionIds: string[];
}

/** Seed collection → container → sections as the e2e user. Delete via cleanup(). */
export async function seedTree(
  db: SupabaseClient,
  userId: string,
  name: string,
  sections: Record<string, unknown>[]
): Promise<SeededTree> {
  const { data: col, error: ce } = await db
    .from('collections')
    .insert({ name, color: '#3B82F6', user_id: userId })
    .select()
    .single();
  if (ce) throw new Error(`collection insert: ${ce.message}`);
  const { data: cont, error: ne } = await db
    .from('note_container')
    .insert({ title: `${name}-notebook`, collection_id: col.id, user_id: userId })
    .select()
    .single();
  if (ne) throw new Error(`container insert: ${ne.message}`);
  const sectionIds: string[] = [];
  for (const [i, s] of sections.entries()) {
    const { data: sec, error: se } = await db
      .from('note_section')
      // Distinct, non-zero sequences (the DB reassigns a 0 on insert), in array order.
      .insert({
        content: '',
        sequence: (i + 1) * 10,
        ...s,
        note_container_id: cont.id,
        user_id: userId
      })
      .select()
      .single();
    if (se) throw new Error(`section insert: ${se.message}`);
    sectionIds.push(sec.id);
  }
  return { collectionId: col.id, containerId: cont.id, sectionIds };
}

/** Remove seeded data (collections cascade to containers + filed sections). */
export async function cleanup(
  db: SupabaseClient,
  collectionIds: string[],
  sectionIds: string[] = []
) {
  if (sectionIds.length) await db.from('note_section').delete().in('id', sectionIds);
  if (collectionIds.length) await db.from('collections').delete().in('id', collectionIds);
}

/** A unique, e2e-prefixed name (the SPA's e2e global setup sweeps leaked `e2e%` data). */
export function uniqueName(label: string): string {
  return `e2e-mcp-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function toolText(result: Awaited<ReturnType<Client['callTool']>>): string {
  return (result.content as { type: string; text: string }[]).map((c) => c.text).join('\n');
}
