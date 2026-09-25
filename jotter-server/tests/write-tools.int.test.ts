import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  cleanup,
  seedTree,
  startHarness,
  toolText,
  uniqueName,
  type Harness,
  type SeededTree
} from './harness';

let h: Harness;
let tree: SeededTree;
const unfiled: string[] = []; // notes created outside the seeded collection

beforeAll(async () => {
  h = await startHarness();
  tree = await seedTree(h.db, h.userId, uniqueName('write'), [
    { type: 'table', title: 'Grid', content: '{}' }
  ]);
});

afterAll(async () => {
  if (tree) await cleanup(h.db, [tree.collectionId], unfiled);
  await h?.close();
});

async function call(name: string, args: Record<string, unknown>) {
  const result = await h.mcp.callTool({ name, arguments: args });
  return { text: toolText(result), isError: Boolean(result.isError) };
}

/** The note id a write tool reports back. */
function idFrom(text: string): string {
  const m = text.match(/id `([0-9a-f-]{36})`/);
  if (!m) throw new Error(`no id in: ${text}`);
  return m[1];
}

async function row(id: string) {
  const { data, error } = await h.db.from('note_section').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function create(args: Record<string, unknown>, track = true) {
  const r = await call('create_note', args);
  expect(r.isError, r.text).toBe(false);
  const id = idFrom(r.text);
  if (track) unfiled.push(id);
  return id;
}

describe('MCP write tools against jotter-dev', () => {
  it('create_note makes an unfiled markdown note by default', async () => {
    const id = await create({ title: 'Jot', body: '# Hi' });
    const r = await row(id);
    expect(r).toMatchObject({
      type: 'markdown',
      title: 'Jot',
      content: '# Hi',
      note_container_id: null
    });
    expect(r.user_id).toBe(h.userId);
  });

  it('create_note files into a notebook and renders text notes as HTML', async () => {
    const r = await call('create_note', {
      type: 'text',
      title: 'Minutes',
      body: 'We agreed to **ship**.',
      notebook_id: tree.containerId
    });
    const note = await row(idFrom(r.text));
    expect(note.note_container_id).toBe(tree.containerId);
    expect(note.content).toBe('<p>We agreed to <strong>ship</strong>.</p>');
  });

  it('create_note builds checklist items and code with a language', async () => {
    const todo = await row(
      await create({ type: 'checklist', title: 'T', body: '- [ ] a\n- [x] b' })
    );
    expect(todo.checklist_data).toEqual([
      { text: 'a', checked: false },
      { text: 'b', checked: true }
    ]);
    const code = await row(
      await create({ type: 'code', title: 'C', body: 'print(1)', language: 'python' })
    );
    expect(code.meta).toEqual({ language: 'python' });
  });

  it('append_to_note on a markdown note writes a CRDT snapshot that keeps both appends', async () => {
    const id = await create({ title: 'Log', body: 'start' });
    await call('append_to_note', { note_id: id, body: 'one' });
    await call('append_to_note', { note_id: id, body: 'two' });
    const r = await row(id);
    expect(r.content).toBe('start\n\none\n\ntwo');
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(r.ydoc, 'base64'));
    expect(doc.getText('content').toString()).toBe(r.content);
  });

  it('append_to_note on a text note appends rich text', async () => {
    const id = await create({ type: 'text', title: 'Doc', body: 'first' });
    await call('append_to_note', { note_id: id, body: '- a\n- b' });
    expect((await row(id)).content).toBe('<p>first</p><ul><li><p>a</p></li><li><p>b</p></li></ul>');
  });

  it('replace_note_body overwrites a code note', async () => {
    const id = await create({ type: 'code', title: 'C', body: 'old()' });
    await call('replace_note_body', { note_id: id, body: 'new()' });
    expect((await row(id)).content).toBe('new()');
  });

  it('update_checklist checks, edits, removes, and adds in one batch', async () => {
    const id = await create({ type: 'checklist', title: 'T', body: 'a\nb\nc' });
    const r = await call('update_checklist', {
      note_id: id,
      changes: [
        { action: 'check', item: 1 },
        { action: 'remove', item: 2 },
        { action: 'edit', item: 3, text: 'C' },
        { action: 'add', text: 'd' }
      ]
    });
    expect(r.text).toContain('1/3 items done');
    expect((await row(id)).checklist_data).toEqual([
      { text: 'a', checked: true },
      { text: 'C', checked: false },
      { text: 'd', checked: false }
    ]);
  });

  it('rename_note and file_note update the title and filing', async () => {
    const id = await create({ title: 'Before', body: 'x' });
    await call('rename_note', { note_id: id, title: 'After' });
    await call('file_note', { note_id: id, notebook_id: tree.containerId });
    expect(await row(id)).toMatchObject({ title: 'After', note_container_id: tree.containerId });
    await call('file_note', { note_id: id, notebook_id: null });
    expect((await row(id)).note_container_id).toBeNull();
  });

  it("refuses to edit bodies of types it can't write", async () => {
    const r = await call('append_to_note', { note_id: tree.sectionIds[0], body: 'x' });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("Can't edit the body of a table note");
  });

  it('broadcasts the Yjs delta to an editor listening on the section channel', async () => {
    const id = await create({ type: 'code', title: 'Live', body: 'base' });
    const received = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no broadcast within 10s')), 10_000);
      const channel = h.db
        .channel(`yjs:${id}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'update' }, ({ payload }) => {
          clearTimeout(timer);
          void h.db.removeChannel(channel);
          resolve(payload.update as string);
        });
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await call('append_to_note', { note_id: id, body: 'LIVE' });
      });
    });
    const update = await received;
    // The delta carries the seed + the append (the section had no snapshot before).
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(update, 'base64'));
    expect(doc.getText('content').toString()).toBe('base\nLIVE');
  });
});
