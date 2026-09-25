import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { NotesError, type NotesApi } from '../notes/notesApi';
import { createJotterMcpServer } from './server';
import type { NoteSection } from '../shared';

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
  it('exposes read tools marked read-only and write tools that are not', async () => {
    const client = await connect({});
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    const reads = [
      'get_note',
      'list_collections',
      'list_notebooks',
      'list_notes',
      'recent_notes',
      'search_notes'
    ];
    const writes = [
      'append_to_note',
      'create_note',
      'file_note',
      'rename_note',
      'replace_note_body',
      'update_checklist'
    ];
    expect(Object.keys(byName).sort()).toEqual([...reads, ...writes].sort());
    for (const r of reads) expect(byName[r].annotations?.readOnlyHint).toBe(true);
    for (const w of writes) expect(byName[w].annotations?.readOnlyHint).toBe(false);
    expect(byName.replace_note_body.annotations?.destructiveHint).toBe(true);
    expect(byName.append_to_note.annotations?.destructiveHint).toBe(false);
  });

  it('create_note maps "text" to the wysiwyg type and defaults to unfiled markdown', async () => {
    const calls: unknown[] = [];
    const created = { id: 'n1', title: 'T', type: 'wysiwyg' } as NoteSection;
    const client = await connect({
      createSection: async (input: unknown) => {
        calls.push(input);
        return created;
      }
    } as Partial<NotesApi>);
    await client.callTool({
      name: 'create_note',
      arguments: { type: 'text', title: 'T', body: 'hi' }
    });
    const r = await client.callTool({ name: 'create_note', arguments: { title: 'T', body: 'hi' } });
    expect(calls).toEqual([
      { type: 'wysiwyg', title: 'T', body: 'hi', containerId: null, language: undefined },
      { type: 'markdown', title: 'T', body: 'hi', containerId: null, language: undefined }
    ]);
    expect(firstText(r)).toContain('https://jotter.test/app/sections/n1');
  });

  it('append and replace route to editBody with the right mode', async () => {
    const modes: string[] = [];
    const client = await connect({
      editBody: async (_id: string, edit: { mode: string }) => {
        modes.push(edit.mode);
        return { id: 'n1', title: null } as NoteSection;
      }
    } as Partial<NotesApi>);
    const note_id = '11111111-1111-4111-8111-111111111111';
    await client.callTool({ name: 'append_to_note', arguments: { note_id, body: 'x' } });
    await client.callTool({ name: 'replace_note_body', arguments: { note_id, body: 'y' } });
    expect(modes).toEqual(['append', 'replace']);
  });

  it('update_checklist rejects malformed changes before touching the data layer', async () => {
    const client = await connect({});
    const r = await client.callTool({
      name: 'update_checklist',
      arguments: {
        note_id: '11111111-1111-4111-8111-111111111111',
        changes: [{ action: 'check', item: 0 }]
      }
    });
    expect(r.isError).toBe(true);
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
