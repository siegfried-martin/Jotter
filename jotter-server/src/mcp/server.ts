import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CODE_LANGUAGES, NotesError, type NotesApi, type WritableType } from '../notes/notesApi';
import type { NoteSection } from '../shared';
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
list_collections → list_notebooks → list_notes.
When writing: new notes are unfiled unless the user names a notebook. Prefer append_to_note
for adding to an existing note. Use replace_note_body only when the user asked to rewrite
it, and read the note first. You can edit the bodies of text, markdown, code, and checklist
notes. Table, timeline, calendar, and drawing notes are read-only here. Nothing can be
deleted through this connector.`;

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
const ADDITIVE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
const OVERWRITES = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const;

/** Tool-facing type names → the stored section type. */
const CREATABLE: Record<string, WritableType> = {
  text: 'wysiwyg',
  markdown: 'markdown',
  code: 'code',
  checklist: 'checklist'
};

const BODY_HELP =
  'Text and markdown notes: Markdown (text notes render it as rich text). Code notes: the ' +
  'source code only, without Markdown fences. Checklist notes: one item per line, e.g. ' +
  '"- [ ] task" or "- [x] done", optionally ending "(due YYYY-MM-DD)".';

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

  const saved = (verb: string, s: NoteSection) =>
    `${verb} **${s.title?.trim() || 'Untitled'}** — id \`${s.id}\` — ${links.section(s.id)}`;

  server.registerTool(
    'create_note',
    {
      title: 'Create a note',
      description:
        'Create a new note. It is unfiled (a quick jot on the Jotter home page) unless ' +
        `notebook_id is given. ${BODY_HELP}`,
      inputSchema: {
        type: z
          .enum(['text', 'markdown', 'code', 'checklist'])
          .default('markdown')
          .describe('Note type (default markdown).'),
        title: z.string().max(200).describe('A short title.'),
        body: z.string().describe('The initial content.'),
        notebook_id: id('notebook').optional().describe('File it in this notebook (optional).'),
        language: z
          .enum(CODE_LANGUAGES)
          .optional()
          .describe('Code notes only: the syntax-highlighting language.')
      },
      annotations: ADDITIVE
    },
    ({ type, title, body, notebook_id, language }) =>
      run(async () =>
        saved(
          'Created',
          await api.createSection({
            type: CREATABLE[type],
            title,
            body,
            containerId: notebook_id ?? null,
            language
          })
        )
      )
  );

  server.registerTool(
    'append_to_note',
    {
      title: 'Append to a note',
      description:
        'Add content to the end of an existing text, markdown, code, or checklist note. ' +
        `It merges safely with edits the user is making at the same moment. ${BODY_HELP}`,
      inputSchema: { note_id: id('note'), body: z.string().min(1).describe('What to add.') },
      annotations: ADDITIVE
    },
    ({ note_id, body }) =>
      run(async () => saved('Appended to', await api.editBody(note_id, { mode: 'append', body })))
  );

  server.registerTool(
    'replace_note_body',
    {
      title: "Replace a note's content",
      description:
        'Overwrite the entire body of a text, markdown, code, or checklist note. Read it with ' +
        'get_note first and only use this when the user asked for a rewrite; otherwise prefer ' +
        `append_to_note or update_checklist. ${BODY_HELP}`,
      inputSchema: { note_id: id('note'), body: z.string().describe('The complete new content.') },
      annotations: OVERWRITES
    },
    ({ note_id, body }) =>
      run(async () =>
        saved('Replaced the content of', await api.editBody(note_id, { mode: 'replace', body }))
      )
  );

  const itemNumber = z
    .number()
    .int()
    .min(1)
    .describe('The item number (1 = first), as numbered in the list before this call.');
  server.registerTool(
    'update_checklist',
    {
      title: 'Update a checklist',
      description:
        'Check, uncheck, edit, remove, or add items in a checklist note, in one batch. Item ' +
        'numbers refer to the list as get_note shows it BEFORE this call. Added items go to the end.',
      inputSchema: {
        note_id: id('note'),
        changes: z
          .array(
            z.discriminatedUnion('action', [
              z.object({ action: z.enum(['check', 'uncheck', 'remove']), item: itemNumber }),
              z.object({ action: z.literal('edit'), item: itemNumber, text: z.string().min(1) }),
              z.object({
                action: z.literal('add'),
                text: z.string().min(1).describe('One item per line.')
              })
            ])
          )
          .min(1)
      },
      annotations: OVERWRITES
    },
    ({ note_id, changes }) =>
      run(async () => {
        const s = await api.updateChecklist(note_id, changes);
        const items = s.checklist_data ?? [];
        const done = items.filter((i) => i.checked).length;
        return `${saved('Updated', s)}\n\n${done}/${items.length} items done.`;
      })
  );

  server.registerTool(
    'rename_note',
    {
      title: 'Rename a note',
      description: "Change a note's title.",
      inputSchema: { note_id: id('note'), title: z.string().max(200) },
      annotations: ADDITIVE
    },
    ({ note_id, title }) =>
      run(async () => saved('Renamed', await api.renameSection(note_id, title)))
  );

  server.registerTool(
    'file_note',
    {
      title: 'File or unfile a note',
      description:
        'Move a note into a notebook, or pass notebook_id null to unfile it (back to a quick ' +
        'jot on the home page).',
      inputSchema: {
        note_id: id('note'),
        notebook_id: id('notebook').nullable().describe('The target notebook, or null to unfile.')
      },
      annotations: ADDITIVE
    },
    ({ note_id, notebook_id }) =>
      run(async () =>
        saved(notebook_id ? 'Filed' : 'Unfiled', await api.fileSection(note_id, notebook_id))
      )
  );

  return server;
}
