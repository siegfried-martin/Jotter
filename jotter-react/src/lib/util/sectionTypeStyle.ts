import type { NoteSection } from '@/lib/types';

type SectionType = NoteSection['type'];

// Shared per-type identity used by the section "Add" buttons and the card title pill,
// so both color-code by type consistently: a muted tint at rest, a darker tint on
// hover. Class strings are spelled out (not interpolated) so Tailwind keeps them.
export const SECTION_TYPE_META: Record<
  SectionType,
  { typeLabel: string; addLabel: string; icon: string; base: string; hover: string }
> = {
  wysiwyg: {
    typeLabel: 'Text',
    addLabel: 'Text',
    icon: 'M4 6h16M4 12h16M4 18h7',
    base: 'bg-blue-50 text-blue-700',
    hover: 'hover:bg-blue-100'
  },
  code: {
    typeLabel: 'Code',
    addLabel: 'Code',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    base: 'bg-green-50 text-green-700',
    hover: 'hover:bg-green-100'
  },
  diagram: {
    typeLabel: 'Diagram',
    addLabel: 'Draw',
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    base: 'bg-amber-50 text-amber-700',
    hover: 'hover:bg-amber-100'
  },
  checklist: {
    typeLabel: 'Checklist',
    addLabel: 'Tasks',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    base: 'bg-purple-50 text-purple-700',
    hover: 'hover:bg-purple-100'
  },
  markdown: {
    typeLabel: 'Markdown',
    addLabel: 'Markdown',
    // Document with a folded corner and a centered "M" — reads clearly at icon size.
    icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9.5 17v-5l2.5 3 2.5-3v5',
    base: 'bg-rose-50 text-rose-700',
    hover: 'hover:bg-rose-100'
  },
  table: {
    typeLabel: 'Table',
    addLabel: 'Table',
    // A 3×3 grid: outer rounded rect with one vertical and one horizontal divider.
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z M4 10h16 M4 15h16 M10 4v16',
    base: 'bg-teal-50 text-teal-700',
    hover: 'hover:bg-teal-100'
  },
  timeline: {
    typeLabel: 'Timeline',
    addLabel: 'Timeline',
    // Three swimlane bars of varying start/length — the gantt/roadmap read.
    icon: 'M3 6h7 M8 12h11 M5 18h9',
    base: 'bg-cyan-50 text-cyan-700',
    hover: 'hover:bg-cyan-100'
  }
};

// Display order for the Add row (and a stable iteration order).
export const SECTION_TYPE_ORDER: SectionType[] = [
  'wysiwyg',
  'code',
  'markdown',
  'table',
  'timeline',
  'diagram',
  'checklist'
];
