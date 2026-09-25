import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { NotesError, type NotesApi } from '../notes/notesApi';
import { createJotterMcpServer } from './server';

// Tool wiring over an in-memory transport with a stubbed data layer (the real data layer is
// covered by the integration test against jotter-dev).

async function connect(api: Partial<NotesApi>) {
  const server = createJotterMcpServer(api as NotesApi, 'https://jotter.test');
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const firstText = (r: Awaited<ReturnType<Client['callTool']>>) =>
  (r.content as { type: string; text: string }[])[0].text;

describe('jotter MCP tools', () => {
  it('exposes the read tools, all marked read-only', async () => {
    const client = await connect({});
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'get_note',
      'list_collections',
      'list_notebooks',
      'list_notes',
      'recent_notes',
      'search_notes'
    ]);
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
  });

  it('search_notes passes the query and default limit through', async () => {
    let args: unknown[] = [];
    const client = await connect({
      searchSections: async (...a: unknown[]) => {
        args = a;
        return [];
      }
    } as Partial<NotesApi>);
    const r = await client.callTool({ name: 'search_notes', arguments: { query: 'deploy' } });
    expect(args).toEqual(['deploy', 20]);
    expect(firstText(r)).toBe('No notes match "deploy".');
  });

  it('reports user-facing failures as tool errors', async () => {
    const client = await connect({
      getSection: async () => {
        throw new NotesError('No note found with id x.');
      }
    });
    const r = await client.callTool({
      name: 'get_note',
      arguments: { note_id: '11111111-1111-4111-8111-111111111111' }
    });
    expect(r.isError).toBe(true);
    expect(firstText(r)).toBe('No note found with id x.');
  });

  it('validates ids before touching the data layer', async () => {
    const client = await connect({});
    const r = await client.callTool({ name: 'get_note', arguments: { note_id: 'not-a-uuid' } });
    expect(r.isError).toBe(true);
  });
});
