// src/lib/components/notes/utils/checklistUtils.ts
import type { ChecklistItem } from '$lib/types';

export function parseChecklistItems(section: any): Array<ChecklistItem & { isOverdue: boolean; displayDate: string | null }> {
  if (section.type !== 'checklist') return [];

  const items = section.checklist_data && section.checklist_data.length > 0 
    ? section.checklist_data
    : parseChecklistFromContent(section.content);

  return items.map((item: ChecklistItem) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let itemDate = null;
    let isOverdue = false;
    let displayDate = null;

    if (item.date) {
      const [year, month, day] = item.date.split('-');
      itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      itemDate.setHours(0, 0, 0, 0);
      isOverdue = itemDate.getTime() < today.getTime();
      displayDate = itemDate.toLocaleDateString();
    }

    return { ...item, isOverdue, displayDate };
  });
}

function parseChecklistFromContent(content: string): ChecklistItem[] {
  return content.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [taskPart, datePart] = line.split('|');
      const checked = taskPart.includes('[x]');
      const text = taskPart.replace(/^- \[[x ]\] /, '');
      const date = datePart ? datePart.trim() : undefined;

      return { text, checked, date };
    });
}