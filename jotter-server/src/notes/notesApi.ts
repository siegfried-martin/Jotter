import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChecklistItem, Collection, NoteContainer, NoteSection } from '../shared';
import { NotesError } from './errors';
import { applyCrdtEdit, isCrdtType, markdownToHtml, type CrdtEdit } from './crdt';
import { applyChecklistChanges, parseChecklistItems, type ChecklistChange } from './checklist';

export { NotesError };

// Data access for the MCP tools, always as the calling user (a user-scoped client).
//
// SELECT on collections / containers / sections is PUBLIC under open sharing (migration
// 0002), so every *listing* here goes through a membership check or a membership-scoped
// RPC — a bare select would return everyone's notes. Fetching a single section by id is
// fine: that is exactly what opening a shared link does in the app.

export type SectionType = NoteSection['type'];

/** Where a section is filed, resolved to names for display. */
export interface SectionLocation {
  collection: Pick<Collection, 'id' | 'name'>;
  container: Pick<NoteContainer, 'id' | 'title'>;
}

export interface SectionSummary {
  id: string;
  type: SectionType;
  title: string | null;
  note_container_id: string | null;
  updated_at: string;
}

const SUMMARY_COLUMNS = 'id, type, title, note_container_id, updated_at';

/** The types Claude can create. Structured types (table, timeline, calendar, drawing) are
 *  read-only through the connector: their bodies are library-specific JSON. */
export type WritableType = 'wysiwyg' | 'markdown' | 'code' | 'checklist';

/** Code languages the editor knows (keys of CODE_LANGUAGES in the SPA's CodeMirrorEditor). */
export const CODE_LANGUAGES = [
  'plaintext',
  'javascript',
  'typescript',
  'jsx',
  'python',
  'json',
  'html',
  'css',
  'sql',
  'markdown',
  'cpp',
  'java',
  'php',
  'rust',
  'xml'
] as const;

export interface CreateSectionInput {
  type: WritableType;
  title: string | null;
  /** Markdown for text/markdown, source for code, item lines for checklist. */
  body: string;
  containerId: string | null;
  language?: string;
}

/** Optimistic-concurrency attempts before giving up on a hot section. */
const CAS_ATTEMPTS = 4;

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

function summarize(s: NoteSection): SectionSummary {
  return {
    id: s.id,
    type: s.type,
    title: s.title ?? null,
    note_container_id: s.note_container_id,
    updated_at: s.updated_at
  };
}

export class NotesApi {
  constructor(
    private db: SupabaseClient,
    readonly userId: string
  ) {}

  /** Collections the user owns or has joined. */
  async listCollections(): Promise<Collection[]> {
    const { data, error } = await this.db.rpc('get_my_collections');
    if (error) fail('Loading collections', error);
    return (data as Collection[]) ?? [];
  }

  /** Containers ("notebooks") in a collection the user is a member of. */
  async listContainers(collectionId: string): Promise<NoteContainer[]> {
    await this.assertCollectionMember(collectionId);
    const { data, error } = await this.db
      .from('note_container')
      .select('id, title, collection_id, sequence, created_at, updated_at')
      .eq('collection_id', collectionId)
      .order('sequence', { ascending: true });
    if (error) fail('Loading notebooks', error);
    return (data as NoteContainer[]) ?? [];
  }

  /** Sections in a container, in display order. */
  async listSections(containerId: string): Promise<SectionSummary[]> {
    const container = await this.getContainer(containerId);
    await this.assertCollectionMember(container.collection_id);
    const { data, error } = await this.db
      .from('note_section')
      .select(SUMMARY_COLUMNS)
      .eq('note_container_id', containerId)
      .order('sequence', { ascending: true });
    if (error) fail('Loading notes', error);
    return (data as SectionSummary[]) ?? [];
  }

  /** Keyword search over the user's accessible sections (migration 0013). */
  async searchSections(query: string, limit: number): Promise<SectionSummary[]> {
    const { data, error } = await this.db.rpc('search_sections', {
      p_query: query,
      p_limit: limit
    });
    if (error) fail('Searching notes', error);
    return ((data as NoteSection[]) ?? []).map(summarize);
  }

  /** Most recently updated sections the user can access (the home-page feed). */
  async recentSections(limit: number): Promise<SectionSummary[]> {
    const { data, error } = await this.db.rpc('get_recent_sections', { p_limit: limit });
    if (error) fail('Loading recent notes', error);
    return ((data as NoteSection[]) ?? []).map(summarize);
  }

  /** One section, in full. */
  async getSection(id: string): Promise<NoteSection> {
    const { data, error } = await this.db
      .from('note_section')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      // A malformed uuid is a caller mistake, not a server fault.
      if (/invalid input syntax for type uuid/i.test(error.message)) {
        throw new NotesError(`"${id}" is not a valid note id.`);
      }
      fail('Loading note', error);
    }
    if (!data) throw new NotesError(`No note found with id ${id}.`);
    return data as NoteSection;
  }

  /** Resolve a section's container + collection names (null when unfiled). */
  async locate(section: Pick<NoteSection, 'note_container_id'>): Promise<SectionLocation | null> {
    if (!section.note_container_id) return null;
    const { data, error } = await this.db
      .from('note_container')
      .select('id, title, collections ( id, name )')
      .eq('id', section.note_container_id)
      .maybeSingle();
    if (error) fail('Loading note location', error);
    const row = data as unknown as {
      id: string;
      title: string;
      collections: { id: string; name: string } | null;
    } | null;
    if (!row?.collections) return null;
    return { container: { id: row.id, title: row.title }, collection: row.collections };
  }

  // ---------------------------------------------------------------------------------------
  // Writes. All run as the user (RLS decides), and every update is compare-and-swap on
  // updated_at, so a concurrent save by the app is never silently clobbered: we re-read and
  // re-apply instead. CRDT-track bodies are edited as Yjs ops (see crdt.ts) and the delta is
  // broadcast so editors open in a browser merge it live.
  // ---------------------------------------------------------------------------------------

  async createSection(input: CreateSectionInput): Promise<NoteSection> {
    let sequence = 0;
    if (input.containerId) {
      const container = await this.getContainer(input.containerId);
      await this.assertCollectionMember(container.collection_id);
      sequence = await this.nextSequence(input.containerId);
    }
    const row: Record<string, unknown> = {
      type: input.type,
      title: input.title?.trim() || null,
      note_container_id: input.containerId,
      user_id: this.userId,
      sequence,
      content: '',
      meta: {}
    };
    if (input.type === 'checklist') row.checklist_data = parseChecklistItems(input.body);
    else if (input.type === 'wysiwyg') row.content = markdownToHtml(input.body);
    else row.content = input.body;
    if (input.type === 'code') {
      const language = input.language?.toLowerCase() ?? 'plaintext';
      row.meta = {
        language: (CODE_LANGUAGES as readonly string[]).includes(language) ? language : 'plaintext'
      };
    }
    // No ydoc: a new CRDT section seeds from `content` the first time it's opened.
    const { data, error } = await this.db.from('note_section').insert(row).select('*').single();
    if (error) fail('Creating note', error);
    if (input.containerId) await this.touchContainer(input.containerId);
    return data as NoteSection;
  }

  /** Append to (or, with mode 'replace', overwrite) a note's body. */
  async editBody(id: string, edit: CrdtEdit): Promise<NoteSection> {
    await this.ensureWritable(id);
    let delta: Uint8Array | null = null;
    const updated = await this.updateWithRetry(id, (current) => {
      if (current.type === 'checklist') {
        const items = parseChecklistItems(edit.body);
        return {
          checklist_data:
            edit.mode === 'replace' ? items : [...(current.checklist_data ?? []), ...items]
        };
      }
      if (!isCrdtType(current.type)) {
        throw new NotesError(
          `Can't edit the body of a ${current.type} note through Jotter's connector (only text, ` +
            'markdown, code, and checklist notes). Open it in Jotter instead.'
        );
      }
      const result = applyCrdtEdit(
        { type: current.type, content: current.content, ydoc: current.ydoc },
        edit
      );
      delta = result.update;
      return { ydoc: result.ydoc, content: result.content };
    });
    if (delta) await this.broadcastYjs(id, delta);
    return updated;
  }

  async updateChecklist(id: string, changes: ChecklistChange[]): Promise<NoteSection> {
    await this.ensureWritable(id);
    return this.updateWithRetry(id, (current) => {
      if (current.type !== 'checklist') {
        throw new NotesError(`That note is a ${current.type} note, not a checklist.`);
      }
      const next: ChecklistItem[] = applyChecklistChanges(current.checklist_data ?? [], changes);
      return { checklist_data: next };
    });
  }

  async renameSection(id: string, title: string): Promise<NoteSection> {
    await this.ensureWritable(id);
    return this.updateWithRetry(id, () => ({ title: title.trim() || null }));
  }

  /** File a note into a container, or unfile it (containerId null). */
  async fileSection(id: string, containerId: string | null): Promise<NoteSection> {
    await this.ensureWritable(id);
    let sequence = 0;
    if (containerId) {
      const container = await this.getContainer(containerId);
      await this.assertCollectionMember(container.collection_id);
      sequence = await this.nextSequence(containerId);
    }
    return this.updateWithRetry(id, () => ({ note_container_id: containerId, sequence }));
  }

  /**
   * Read → compute → compare-and-swap write, retried when someone else saved in between.
   * `compute` may throw NotesError to refuse the edit.
   */
  private async updateWithRetry(
    id: string,
    compute: (current: NoteSection) => Record<string, unknown>
  ): Promise<NoteSection> {
    for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
      const current = await this.getSection(id);
      const { data, error } = await this.db
        .from('note_section')
        .update({ ...compute(current), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('updated_at', current.updated_at)
        .select('*')
        .maybeSingle();
      if (error) fail('Saving note', error);
      if (data) {
        const saved = data as NoteSection;
        if (saved.note_container_id) await this.touchContainer(saved.note_container_id);
        return saved;
      }
    }
    throw new NotesError(
      "Couldn't save: the note kept changing while saving (or you don't have edit access to it). " +
        'Try again in a moment.'
    );
  }

  /** Editing a note you can see but aren't a member of joins you to it, as the app does. */
  private async ensureWritable(id: string): Promise<void> {
    await this.getSection(id); // clear "not found" before anything else
    const { error } = await this.db.rpc('open_shared_section', { p_section_id: id });
    if (error) fail('Joining shared note', error);
  }

  private async nextSequence(containerId: string): Promise<number> {
    const { data, error } = await this.db.rpc('get_next_note_section_sequence', {
      p_note_container_id: containerId
    });
    if (error) fail('Ordering note', error);
    return (data as number) ?? 0;
  }

  /** Bump the container's timestamp, as the app does on every section save. */
  private async touchContainer(containerId: string): Promise<void> {
    await this.db
      .from('note_container')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', containerId);
  }

  /**
   * Push a Yjs delta to editors that have the section open, over the same Realtime channel
   * and message shape as the SPA's SupabaseYjsProvider. Best effort: the snapshot in
   * Postgres is already saved, and editors merge it on their next open or save anyway.
   */
  private async broadcastYjs(sectionId: string, update: Uint8Array): Promise<void> {
    const channel = this.db.channel(`yjs:${sectionId}`);
    try {
      await channel.httpSend('update', { update: Buffer.from(update).toString('base64') });
    } catch (e) {
      console.warn(`Realtime broadcast for section ${sectionId} failed:`, e);
    } finally {
      void this.db.removeChannel(channel);
    }
  }

  private async getContainer(id: string): Promise<NoteContainer> {
    const { data, error } = await this.db
      .from('note_container')
      .select('id, title, collection_id, sequence, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (/invalid input syntax for type uuid/i.test(error.message)) {
        throw new NotesError(`"${id}" is not a valid notebook id.`);
      }
      fail('Loading notebook', error);
    }
    if (!data) throw new NotesError(`No notebook found with id ${id}.`);
    return data as NoteContainer;
  }

  private async assertCollectionMember(collectionId: string): Promise<void> {
    const { data, error } = await this.db
      .from('collection_member')
      .select('collection_id')
      .eq('collection_id', collectionId)
      .eq('user_id', this.userId)
      .maybeSingle();
    if (error) {
      if (/invalid input syntax for type uuid/i.test(error.message)) {
        throw new NotesError(`"${collectionId}" is not a valid collection id.`);
      }
      fail('Checking collection access', error);
    }
    if (!data) {
      throw new NotesError(`Collection ${collectionId} was not found in your collections.`);
    }
  }
}
