import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { Config } from '../config';
import { createApp } from './app';

const config: Config = {
  host: '127.0.0.1',
  port: 0,
  publicUrl: 'https://jotter.test',
  appUrl: 'https://jotter.test',
  supabaseUrl: 'https://proj.supabase.test',
  supabaseAnonKey: 'anon'
};

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp(config, {
    verifyAccessToken: async () => {
      throw new InvalidTokenError('nope');
    }
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe('OAuth discovery', () => {
  it('publishes protected-resource metadata pointing at Supabase Auth', async () => {
    for (const path of [
      '/.well-known/oauth-protected-resource/mcp',
      '/.well-known/oauth-protected-resource'
    ]) {
      const body = await (await fetch(base + path)).json();
      expect(body).toMatchObject({
        resource: 'https://jotter.test/mcp',
        authorization_servers: ['https://proj.supabase.test/auth/v1']
      });
    }
  });

  it('challenges unauthenticated MCP requests with the metadata URL', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain(
      'resource_metadata="https://jotter.test/.well-known/oauth-protected-resource/mcp"'
    );
  });

  it('rejects an invalid bearer token', async () => {
    const res = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer junk' },
      body: '{}'
    });
    expect(res.status).toBe(401);
  });
});
