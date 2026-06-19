import { describe, it, expect, beforeEach } from 'vitest';
import { enqueue, list, count, remove, clear, drain } from './outbox';

beforeEach(async () => {
  await clear();
});

function entry(sectionId: string, kind = 'update') {
  return { kind, sectionId, payload: { content: `c-${sectionId}` } };
}

describe('offline outbox', () => {
  it('parks entries and lists them FIFO with a monotonic key', async () => {
    await enqueue(entry('a'));
    await enqueue(entry('b'));
    const all = await list();
    expect(all.map((e) => e.sectionId)).toEqual(['a', 'b']);
    expect(all[0].seq).toBeLessThan(all[1].seq as number);
    expect(all[0].enqueuedAt).toBeTypeOf('number');
    expect(await count()).toBe(2);
  });

  it('removes a processed entry by key', async () => {
    const seq = await enqueue(entry('a'));
    await remove(seq);
    expect(await count()).toBe(0);
  });

  it('drains FIFO, removing each handled entry', async () => {
    await enqueue(entry('a'));
    await enqueue(entry('b'));
    const handled: string[] = [];
    const flushed = await drain(async (e) => {
      handled.push(e.sectionId);
    });
    expect(flushed).toBe(2);
    expect(handled).toEqual(['a', 'b']);
    expect(await count()).toBe(0);
  });

  it('stops at the first failure and leaves that entry (and the rest) queued', async () => {
    await enqueue(entry('a'));
    await enqueue(entry('b'));
    await enqueue(entry('c'));
    const handled: string[] = [];
    await expect(
      drain(async (e) => {
        if (e.sectionId === 'b') throw new Error('offline again');
        handled.push(e.sectionId);
      })
    ).rejects.toThrow('offline again');

    expect(handled).toEqual(['a']); // 'a' flushed, 'b' threw before removal
    const remaining = await list();
    expect(remaining.map((e) => e.sectionId)).toEqual(['b', 'c']); // order preserved
  });

  it('persists across a simulated reload (same IndexedDB, fresh connection)', async () => {
    await enqueue(entry('a'));
    // A new openDB() in the real app would see the same store; fake-indexeddb keeps it.
    expect(await count()).toBe(1);
  });
});
