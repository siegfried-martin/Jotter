import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
let name: string;
const marker = `zephyr${Date.now()}`; // unique word to search for

beforeAll(async () => {
  h = await startHarness();
  name = uniqueName('read');
  tree = await seedTree(h.db, h.userId, name, [
    { type: 'markdown', title: `Deploy plan ${marker}`, content: '# Steps\n\n1. build\n2. ship' },
    { type: 'code', title: 'Script', content: 'echo hi', meta: { language: 'bash' } },
    {
      type: 'checklist',
      title: 'Todo',
      checklist_data: [
        { text: 'write tests', checked: true },
        { text: 'deploy', checked: false }
      ]
    }
  ]);
});

afterAll(async () => {
  if (tree) await cleanup(h.db, [tree.collectionId]);
  await h?.close();
});

describe('MCP read tools against jotter-dev', () => {
  it('list_collections includes the seeded collection', async () => {
    const out = toolText(await h.mcp.callTool({ name: 'list_collections', arguments: {} }));
    expect(out).toContain(name);
    expect(out).toContain(tree.collectionId);
  });

  it('list_notebooks → list_notes walks the hierarchy in order', async () => {
    const nb = toolText(
      await h.mcp.callTool({
        name: 'list_notebooks',
        arguments: { collection_id: tree.collectionId }
      })
    );
    expect(nb).toContain(tree.containerId);
    const notes = toolText(
      await h.mcp.callTool({ name: 'list_notes', arguments: { notebook_id: tree.containerId } })
    );
    const order = tree.sectionIds.map((id) => notes.indexOf(id));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('search_notes finds a note by a title word', async () => {
    const out = toolText(
      await h.mcp.callTool({ name: 'search_notes', arguments: { query: marker } })
    );
    expect(out).toContain(tree.sectionIds[0]);
  });

  it('recent_notes includes freshly seeded notes', async () => {
    const out = toolText(await h.mcp.callTool({ name: 'recent_notes', arguments: { limit: 50 } }));
    expect(out).toContain(tree.sectionIds[2]);
  });

  it('get_note returns Markdown with location and link', async () => {
    const md = toolText(
      await h.mcp.callTool({ name: 'get_note', arguments: { note_id: tree.sectionIds[0] } })
    );
    expect(md).toContain(`**Location:** ${name} › ${name}-notebook`);
    expect(md).toContain('1. build');
    const code = toolText(
      await h.mcp.callTool({ name: 'get_note', arguments: { note_id: tree.sectionIds[1] } })
    );
    expect(code).toContain('```bash\necho hi\n```');
    const todo = toolText(
      await h.mcp.callTool({ name: 'get_note', arguments: { note_id: tree.sectionIds[2] } })
    );
    expect(todo).toContain('- [x] write tests\n- [ ] deploy');
  });

  it("refuses to list a collection the user isn't a member of", async () => {
    const r = await h.mcp.callTool({
      name: 'list_notebooks',
      arguments: { collection_id: '00000000-0000-4000-8000-000000000000' }
    });
    expect(r.isError).toBe(true);
  });
});
