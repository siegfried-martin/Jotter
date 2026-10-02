import { describe, expect, it } from 'vitest';
import { applyChecklistChanges, parseChecklistItems } from './checklist';
import { NotesError } from './errors';

describe('parseChecklistItems', () => {
  it('reads task, bullet, numbered, and bare lines, with due dates', () => {
    expect(parseChecklistItems('- [ ] a\n- [x] b (due 2026-10-01)\n* c\n2. d\n\nplain')).toEqual([
      { text: 'a', checked: false },
      { text: 'b', checked: true, date: '2026-10-01' },
      { text: 'c', checked: false },
      { text: 'd', checked: false },
      { text: 'plain', checked: false }
    ]);
  });
});

describe('applyChecklistChanges', () => {
  const base = parseChecklistItems('- [ ] one\n- [ ] two\n- [x] three');

  it('uses pre-call numbering for every change in a batch', () => {
    const out = applyChecklistChanges(base, [
      { action: 'remove', item: 1 },
      { action: 'check', item: 2 },
      { action: 'edit', item: 3, text: 'THREE' },
      { action: 'add', text: 'four\nfive' }
    ]);
    expect(out).toEqual([
      { text: 'two', checked: true },
      { text: 'THREE', checked: true },
      { text: 'four', checked: false },
      { text: 'five', checked: false }
    ]);
  });

  it('rejects out-of-range item numbers', () => {
    expect(() => applyChecklistChanges(base, [{ action: 'check', item: 4 }])).toThrow(NotesError);
  });
});
