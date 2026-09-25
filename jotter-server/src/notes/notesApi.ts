import type { SupabaseClient } from '@supabase/supabase-js';
import type { Collection, NoteContainer, NoteSection } from '../shared';

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

/** A user-facing failure (bad id, no access) — reported to Claude as a tool error. */
export class NotesError extends Error {}

const SUMMARY_COLUMNS = 'id, type, title, note_container_id, updated_at';

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
