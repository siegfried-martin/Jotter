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
  }
};

// Display order for the Add row (and a stable iteration order).
export const SECTION_TYPE_ORDER: SectionType[] = ['wysiwyg', 'code', 'diagram', 'checklist'];
