import { type Page, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/** Second test account for cross-user sharing tests (provisioned in global-setup). */
export const SECOND_EMAIL = 'e2e-tester-2@example.com';

function envTest(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    for (const line of fs.readFileSync(path.resolve('.env.test'), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && m[1] === key) return m[2];
    }
  } catch {
    /* no .env.test */
  }
  return undefined;
}

/** The shared E2E password (both test users use it). */
export function e2ePassword(): string {
  const pw = envTest('E2E_PASSWORD');
  if (!pw) throw new Error('E2E_PASSWORD missing (.env.test)');
  return pw;
}

/** Sign a page's Supabase client in as the given user (for a second-user context). */
export async function signInAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(
    () => Boolean((window as unknown as Record<string, unknown>).__SUPABASE_CLIENT__),
    null,
    { timeout: 15000 }
  );
  const err = await page.evaluate(
    async ({ email, password }) => {
      const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    { email, password }
  );
  if (err) throw new Error(`sign-in failed for ${email}: ${err}`);
}

// ---------------------------------------------------------------------------
// E2E helpers — seed/cleanup via the app's authed Supabase client
// (window.__SUPABASE_CLIENT__). This "API-bypass" pattern lets a test arrange
// real rows (exercising RLS / FKs / triggers) without clicking through the UI,
// then drive assertions against the rendered app. Always clean up by deleting
// the root collection — note_container and note_section cascade.
//
// All seeded names are prefixed `e2e-` so a stray row is easy to spot in the
// dev DB. Tests run serially (workers:1) against shared jotter-dev.
// ---------------------------------------------------------------------------

export type SectionType = 'code' | 'wysiwyg' | 'checklist' | 'diagram';

export interface SeededSection {
  id: string;
  type: SectionType;
  sequence: number;
}

export interface SeededTree {
  collectionId: string;
  containerId: string;
  sections: SeededSection[];
}

interface SeedSectionSpec {
  type: SectionType;
  content?: string;
  /** Checklists persist items in the separate `checklist_data` jsonb column. */
  checklistData?: unknown;
  title?: string;
  meta?: unknown;
  sequence: number;
}

/**
 * Seed a full collection → container → sections tree in one round-trip.
 * Returns the created ids (collectionId is the cleanup handle).
 */
export async function seedTree(
  page: Page,
  opts: {
    collectionName?: string;
    color?: string;
    description?: string;
    collectionSequence?: number;
    containerTitle?: string;
    containerSequence?: number;
    sections?: SeedSectionSpec[];
  } = {}
): Promise<SeededTree> {
  const {
    collectionName = 'e2e-collection',
    color = '#3B82F6',
    description,
    collectionSequence,
    containerTitle = 'e2e-note',
    containerSequence,
    sections = []
  } = opts;

  return page.evaluate(
    async ({
      collectionName,
      color,
      description,
      collectionSequence,
      containerTitle,
      containerSequence,
      sections
    }) => {
      const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
      const {
        data: { user }
      } = await sb.auth.getUser();
      const uid = user.id;

      const colRow: Record<string, unknown> = { name: collectionName, color, user_id: uid };
      if (description !== undefined) colRow.description = description;
      if (collectionSequence !== undefined) colRow.sequence = collectionSequence;
      const { data: col, error: ce } = await sb
        .from('collections')
        .insert(colRow)
        .select()
        .single();
      if (ce) throw new Error('collection insert: ' + ce.message);

      const contRow: Record<string, unknown> = {
        title: containerTitle,
        collection_id: col.id,
        user_id: uid
      };
      if (containerSequence !== undefined) contRow.sequence = containerSequence;
      const { data: cont, error: ne } = await sb
        .from('note_container')
        .insert(contRow)
        .select()
        .single();
      if (ne) throw new Error('container insert: ' + ne.message);

      const seeded: { id: string; type: string; sequence: number }[] = [];
      for (const s of sections) {
        const row: Record<string, unknown> = {
          note_container_id: cont.id,
          type: s.type,
          content: s.content ?? '',
          sequence: s.sequence,
          user_id: uid
        };
        if (s.meta !== undefined) row.meta = s.meta;
        if (s.checklistData !== undefined) row.checklist_data = s.checklistData;
        if (s.title !== undefined) row.title = s.title;
        const { data: sec, error: se } = await sb
          .from('note_section')
          .insert(row)
          .select()
          .single();
        if (se) throw new Error('section insert: ' + se.message);
        seeded.push({ id: sec.id, type: sec.type, sequence: sec.sequence });
      }

      return { collectionId: col.id, containerId: cont.id, sections: seeded };
    },
    {
      collectionName,
      color,
      description,
      collectionSequence,
      containerTitle,
      containerSequence,
      sections
    }
  );
}

/** Seed an extra container under an existing collection. Returns its id. */
export async function seedContainer(
  page: Page,
  collectionId: string,
  title: string,
  sequence?: number
): Promise<string> {
  return page.evaluate(
    async ({ collectionId, title, sequence }) => {
      const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
      const {
        data: { user }
      } = await sb.auth.getUser();
      const row: Record<string, unknown> = {
        title,
        collection_id: collectionId,
        user_id: user.id
      };
      if (sequence !== undefined) row.sequence = sequence;
      const { data, error } = await sb.from('note_container').insert(row).select().single();
      if (error) throw new Error('container insert: ' + error.message);
      return data.id as string;
    },
    { collectionId, title, sequence }
  );
}

/** Delete a seeded collection (note_container + note_section cascade). */
export async function cleanup(page: Page, collectionId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    await sb.from('collections').delete().eq('id', id);
  }, collectionId);
}

/**
 * Read back the persisted ordering of sections for a container, straight from
 * the DB (ascending by sequence). Useful to assert a reorder actually committed,
 * independent of the rendered DOM.
 */
export async function fetchSectionOrder(page: Page, containerId: string): Promise<string[]> {
  return page.evaluate(async (cid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data, error } = await sb
      .from('note_section')
      .select('id, sequence')
      .eq('note_container_id', cid)
      .order('sequence', { ascending: true });
    if (error) throw new Error('section fetch: ' + error.message);
    return (data as { id: string }[]).map((r) => r.id);
  }, containerId);
}

/** Which container a section currently belongs to. */
export async function fetchSectionContainerId(
  page: Page,
  sectionId: string
): Promise<string | null> {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb
      .from('note_section')
      .select('note_container_id')
      .eq('id', sid)
      .maybeSingle();
    return (data?.note_container_id as string) ?? null;
  }, sectionId);
}

/** Current persisted title of a section (null if untitled). */
export async function fetchSectionTitle(page: Page, sectionId: string): Promise<string | null> {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb.from('note_section').select('title').eq('id', sid).maybeSingle();
    return (data?.title as string) ?? null;
  }, sectionId);
}

/** Which collection a container currently belongs to. */
export async function fetchContainerCollectionId(
  page: Page,
  containerId: string
): Promise<string | null> {
  return page.evaluate(async (cid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb
      .from('note_container')
      .select('collection_id')
      .eq('id', cid)
      .maybeSingle();
    return (data?.collection_id as string) ?? null;
  }, containerId);
}

/** Persisted checklist item texts (in stored order) for a section. */
export async function fetchChecklistTexts(page: Page, sectionId: string): Promise<string[]> {
  return page.evaluate(async (sid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb
      .from('note_section')
      .select('checklist_data')
      .eq('id', sid)
      .maybeSingle();
    return ((data?.checklist_data as { text: string }[]) ?? []).map((it) => it.text);
  }, sectionId);
}

/** Persisted ordering of containers under a collection (ascending by sequence). */
export async function fetchContainerOrder(page: Page, collectionId: string): Promise<string[]> {
  return page.evaluate(async (cid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data, error } = await sb
      .from('note_container')
      .select('id, sequence')
      .eq('collection_id', cid)
      .order('sequence', { ascending: true });
    if (error) throw new Error('container fetch: ' + error.message);
    return (data as { id: string }[]).map((r) => r.id);
  }, collectionId);
}

/** How many of the test user's collections currently have this exact name. */
export async function countCollectionsNamed(page: Page, name: string): Promise<number> {
  return page.evaluate(async (n) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { count } = await sb
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('name', n);
    return count ?? 0;
  }, name);
}

/** Current persisted name of a collection (null if gone). For settle-then-reload polls. */
export async function fetchCollectionName(page: Page, id: string): Promise<string | null> {
  return page.evaluate(async (cid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb.from('collections').select('name').eq('id', cid).maybeSingle();
    return (data?.name as string) ?? null;
  }, id);
}

/** Current persisted title of a container (null if gone). */
export async function fetchContainerTitle(page: Page, id: string): Promise<string | null> {
  return page.evaluate(async (cid) => {
    const sb = (window as unknown as { __SUPABASE_CLIENT__: any }).__SUPABASE_CLIENT__;
    const { data } = await sb.from('note_container').select('title').eq('id', cid).maybeSingle();
    return (data?.title as string) ?? null;
  }, id);
}

/**
 * Read the rendered order of ids straight from the DOM via a data attribute
 * (`data-collection-id` / `data-container-id` / `data-section-id`). This is the
 * basis for ordering assertions: rendered order should match persisted sequence,
 * and — once DnD lands — a reorder should change this to the expected permutation.
 */
export async function readDomOrder(
  page: Page,
  attr: 'data-collection-id' | 'data-container-id' | 'data-section-id'
): Promise<string[]> {
  return page.$$eval(`[${attr}]`, (els, a) => els.map((el) => el.getAttribute(a) as string), attr);
}

/** Open the app once so window.__SUPABASE_CLIENT__ is available for seeding. */
export async function gotoAppForSeeding(page: Page): Promise<void> {
  await page.goto('/app');
  await page.waitForFunction(
    () => Boolean((window as unknown as Record<string, unknown>).__SUPABASE_CLIENT__),
    null,
    { timeout: 15000 }
  );
}

/** Wait until the collections grid has loaded (the "N collection(s)" counter). */
export async function waitForCollectionsGrid(page: Page): Promise<void> {
  await expect(page.getByText(/\d+ collection\(s\)/)).toBeVisible();
}
