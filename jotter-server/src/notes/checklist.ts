import type { ChecklistItem } from '../shared';
import { NotesError } from './errors';

// Checklist sections store their items in note_section.checklist_data (LWW track, no Yjs).
// Claude writes items as Markdown-ish lines and edits them by their 1-based position, which
// is the order get_note shows them in.

const TASK = /^\s*(?:[-*+]|\d+[.)])?\s*\[( |x|X)\]\s+(.*)$/;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const DUE = /\s*\(due (\d{4}-\d{2}-\d{2})\)\s*$/;

function item(text: string, checked: boolean): ChecklistItem {
  const due = text.match(DUE);
  const clean = (due ? text.slice(0, due.index) : text).trim();
  return due ? { text: clean, checked, date: due[1] } : { text: clean, checked };
}

/** "- [ ] a", "- [x] b", "- c", "1. d", or bare lines → items. Blank lines are skipped. */
export function parseChecklistItems(body: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    const task = line.match(TASK);
    if (task) {
      items.push(item(task[2], task[1].toLowerCase() === 'x'));
      continue;
    }
    const bullet = line.match(BULLET);
    items.push(item(bullet ? bullet[1] : line, false));
  }
  return items.filter((i) => i.text !== '');
}

export type ChecklistChange =
  | { action: 'check' | 'uncheck' | 'remove'; item: number }
  | { action: 'edit'; item: number; text: string }
  | { action: 'add'; text: string };

/**
 * Apply changes. Item numbers always refer to the list as it was BEFORE this call (so a
 * remove doesn't shift later numbers mid-batch); added items go to the end, in order.
 */
export function applyChecklistChanges(
  items: ChecklistItem[],
  changes: ChecklistChange[]
): ChecklistItem[] {
  const next = items.map((i) => ({ ...i }));
  const removed = new Set<number>();
  const added: ChecklistItem[] = [];
  for (const change of changes) {
    if (change.action === 'add') {
      added.push(...parseChecklistItems(change.text));
      continue;
    }
    const index = change.item - 1;
    if (!Number.isInteger(change.item) || index < 0 || index >= next.length) {
      throw new NotesError(
        `There is no item ${change.item}; the checklist has ${next.length} item(s).`
      );
    }
    if (change.action === 'edit') {
      // Keeps the item's other fields (priority; its due date unless a new one is given).
      next[index] = { ...next[index], ...item(change.text, next[index].checked) };
    } else if (change.action === 'remove') removed.add(index);
    else next[index].checked = change.action === 'check';
  }
  return [...next.filter((_, i) => !removed.has(i)), ...added];
}
