import type { NoteSection } from '@/lib/types';

type SectionType = NoteSection['type'];

// Shared per-type identity used by the section "Add" buttons and the card title pill,
// so both color-code by type consistently. Class strings are spelled out (not
// interpolated) so Tailwind keeps them.
//
// Colors vary in VALUE (lightness), not just hue: hue-adjacent types were
// indistinguishable under red-green colorblindness ({blue/indigo/purple},
// {green/slate}, {teal/cyan}), so each such group spans different tiers — light
// tint (*-50/700), mid tint (*-200/900), and solid (*-600 at 70% with white
// text — full-strength *-600 made the buttons/pills shout; 70% over the white
// card keeps the dark-value tier without the saturation).
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
    base: 'bg-purple-200 text-purple-900',
    hover: 'hover:bg-purple-300'
  },
  markdown: {
    typeLabel: 'Markdown',
    addLabel: 'Markdown',
    // Document with a folded corner and a centered "M" — reads clearly at icon size.
    icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9.5 17v-5l2.5 3 2.5-3v5',
    // Solid slate, not red: markdown's classic dark-gray identity — a solid red
    // button read as an error/destructive action.
    base: 'bg-slate-600/70 text-white',
    hover: 'hover:bg-slate-600/85'
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
    base: 'bg-cyan-600/70 text-white',
    hover: 'hover:bg-cyan-600/85'
  },
  calendar: {
    typeLabel: 'Calendar',
    addLabel: 'Calendar',
    // A month grid: rounded rect with a header bar (two hanging "rings") and one inner divider.
    icon: 'M4 6a1 1 0 011-1h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6z M4 10h16 M8 3v4 M16 3v4',
    base: 'bg-indigo-600/70 text-white',
    hover: 'hover:bg-indigo-600/85'
  }
};

// Display order for the Add row (and a stable iteration order).
export const SECTION_TYPE_ORDER: SectionType[] = [
  'wysiwyg',
  'code',
  'markdown',
  'checklist',
  'table',
  'timeline',
  'calendar',
  'diagram'
];
