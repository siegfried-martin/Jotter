import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { NotesError, type NotesApi } from '../notes/notesApi';
import {
  Links,
  formatCollections,
  formatContainers,
  formatSection,
  formatSectionList
} from './format';

// The Jotter MCP server: one instance per request (stateless Streamable HTTP), bound to the
// calling user's NotesApi. Tool names use "notes" / "notebooks", which read naturally in a
// prompt; the instructions map them onto the app's collections → containers → sections.

const INSTRUCTIONS = `Jotter is the user's personal note-taking app. Notes are organized as
collections → notebooks → notes. In the Jotter app, notebooks are called "containers" and
notes are called "sections". A note can also be unfiled (a "quick jot"), with no notebook.
Note types: text (rich text), markdown, code, checklist, table, timeline, calendar, and
drawing. Notes are returned as Markdown. Every result includes a link to open the note in
Jotter, and you should include that link when you cite a note.
To find something, use search_notes first (it matches titles, plus the body for text,
markdown, and code notes). Use recent_notes for "what was I working on", and browse with
list_collections → list_notebooks → list_notes.`;

type ToolResult = CallToolResult;

const text = (t: string): ToolResult => ({ content: [{ type: 'text', text: t }] });

/** Run a tool body, turning expected failures into tool errors Claude can read. */
async function run(body: () => Promise<string>): Promise<ToolResult> {
  try {
    return text(await body());
  } catch (e) {
    if (e instanceof NotesError) return { ...text(e.message), isError: true };
    console.error('Tool failed:', e);
    const message = e instanceof Error ? e.message : String(e);
    return { ...text(`Jotter request failed: ${message}`), isError: true };
  }
}

const id = (what: string) => z.string().uuid().describe(`The ${what} id (a UUID).`);
const limit = (dflt: number, max: number) =>
  z.number().int().min(1).max(max).default(dflt).describe(`Max results (default ${dflt}).`);

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

export function createJotterMcpServer(api: NotesApi, appUrl: string): McpServer {
  const links = new Links(appUrl);
  const server = new McpServer(
    { name: 'jotter', title: 'Jotter', version: '0.1.0' },
    { instructions: INSTRUCTIONS }
  );

  server.registerTool(
    'search_notes',
    {
      title: 'Search notes',
      description:
        'Keyword search across all notes the user can access (their own and shared). Matches ' +
        'note titles, plus the body of text, markdown, and code notes. Returns a list of notes; ' +
        'use get_note to read one.',
      inputSchema: {
        query: z.string().min(1).describe('Words to look for.'),
        limit: limit(20, 50)
      },
      annotations: READ_ONLY
    },
    ({ query, limit }) =>
      run(async () =>
        formatSectionList(
          `Notes matching "${query}":`,
          await api.searchSections(query, limit),
          links,
          `No notes match "${query}".`
        )
      )
  );

  server.registerTool(
    'recent_notes',
    {
      title: 'Recent notes',
      description: 'The most recently updated notes the user can access, newest first.',
      inputSchema: { limit: limit(15, 50) },
      annotations: READ_ONLY
    },
    ({ limit }) =>
      run(async () =>
        formatSectionList(
          'Recently updated notes:',
          await api.recentSections(limit),
          links,
          'No notes yet.'
        )
      )
  );

  server.registerTool(
    'list_collections',
    {
      title: 'List collections',
      description: "The user's collections: the top level of Jotter's organization.",
      annotations: READ_ONLY
    },
    () => run(async () => formatCollections(await api.listCollections(), links))
  );

  server.registerTool(
    'list_notebooks',
    {
      title: 'List notebooks',
      description: 'The notebooks (the app calls them "containers") in one collection.',
      inputSchema: { collection_id: id('collection') },
      annotations: READ_ONLY
    },
    ({ collection_id }) =>
      run(async () =>
        formatContainers(collection_id, await api.listContainers(collection_id), links)
      )
  );

  server.registerTool(
    'list_notes',
    {
      title: 'List notes in a notebook',
      description: 'The notes in one notebook, in the order the user arranged them.',
      inputSchema: { notebook_id: id('notebook') },
      annotations: READ_ONLY
    },
    ({ notebook_id }) =>
      run(async () =>
        formatSectionList(
          'Notes in this notebook:',
          await api.listSections(notebook_id),
          links,
          'This notebook has no notes yet.'
        )
      )
  );

  server.registerTool(
    'get_note',
    {
      title: 'Read a note',
      description:
        "Read one note in full, as Markdown, with its type, location, and link. Drawings can't " +
        'be read as text.',
      inputSchema: { note_id: id('note') },
      annotations: READ_ONLY
    },
    ({ note_id }) =>
      run(async () => {
        const section = await api.getSection(note_id);
        return formatSection(section, await api.locate(section), links);
      })
  );

  return server;
}
