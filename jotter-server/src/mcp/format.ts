import { getDiagramElementCount, sectionToMarkdown } from '../shared';
import type { Collection, NoteContainer, NoteSection } from '../shared';
import type { SectionLocation, SectionSummary, SectionType } from '../notes/notesApi';

// Tool output formatting. Everything Claude reads comes back as compact Markdown with a
// Jotter link per item, so Claude can cite notes and the user can click straight into them.

/** The app's user-facing names for each section type. */
export const TYPE_LABELS: Record<SectionType, string> = {
  wysiwyg: 'text',
  markdown: 'markdown',
  code: 'code',
  checklist: 'checklist',
  diagram: 'drawing',
  table: 'table',
  timeline: 'timeline',
  calendar: 'calendar'
};

/** Bodies beyond this are cut off, so one giant note can't swamp Claude's context. */
export const MAX_BODY_CHARS = 60_000;

export class Links {
  constructor(private appUrl: string) {}
  section(id: string): string {
    return `${this.appUrl}/app/sections/${id}`;
  }
  collection(id: string): string {
    return `${this.appUrl}/app/collections/${id}`;
  }
  container(collectionId: string, containerId: string): string {
    return `${this.appUrl}/app/collections/${collectionId}/containers/${containerId}`;
  }
}

function day(iso: string): string {
  return iso.slice(0, 10);
}

function titleOf(s: { title?: string | null }): string {
  return s.title?.trim() || 'Untitled';
}

export function formatSectionList(
  heading: string,
  sections: SectionSummary[],
  links: Links,
  empty: string
): string {
  if (sections.length === 0) return empty;
  const lines = sections.map(
    (s) =>
      `- **${titleOf(s)}** (${TYPE_LABELS[s.type]}, updated ${day(s.updated_at)})` +
      `${s.note_container_id ? '' : ' · unfiled'} — id \`${s.id}\` — ${links.section(s.id)}`
  );
  return `${heading}\n\n${lines.join('\n')}`;
}

export function formatCollections(collections: Collection[], links: Links): string {
  if (collections.length === 0) return 'You have no collections yet.';
  const lines = collections.map(
    (c) =>
      `- **${c.name}**${c.description ? ` — ${c.description}` : ''} — id \`${c.id}\` — ${links.collection(c.id)}`
  );
  return `Your collections (${collections.length}):\n\n${lines.join('\n')}`;
}

export function formatContainers(
  collectionId: string,
  containers: NoteContainer[],
  links: Links
): string {
  if (containers.length === 0) return 'This collection has no notebooks yet.';
  const lines = containers.map(
    (c) => `- **${c.title}** — id \`${c.id}\` — ${links.container(collectionId, c.id)}`
  );
  return `Notebooks (${containers.length}):\n\n${lines.join('\n')}`;
}

/** A section's body as Markdown, per type. */
export function sectionBody(section: NoteSection): string {
  switch (section.type) {
    case 'code': {
      const lang = typeof section.meta?.language === 'string' ? section.meta.language : '';
      const fence = section.content.includes('```') ? '````' : '```';
      return `${fence}${lang === 'plaintext' ? '' : lang}\n${section.content}\n${fence}`;
    }
    case 'diagram': {
      const n = getDiagramElementCount(section.content);
      return `_(A drawing with ${n} element${n === 1 ? '' : 's'} — drawings can't be read as text; open it in Jotter to view.)_`;
    }
    default:
      return sectionToMarkdown(section);
  }
}

export function formatSection(
  section: NoteSection,
  location: SectionLocation | null,
  links: Links
): string {
  const where = location
    ? `${location.collection.name} › ${location.container.title}`
    : 'Unfiled (quick jot)';
  let body = sectionBody(section).trim() || '_(empty)_';
  if (body.length > MAX_BODY_CHARS) {
    body = `${body.slice(0, MAX_BODY_CHARS)}\n\n_(Truncated — the note is ${body.length.toLocaleString()} characters; open it in Jotter for the rest.)_`;
  }
  return [
    `# ${titleOf(section)}`,
    '',
    `- **Type:** ${TYPE_LABELS[section.type]}`,
    `- **Location:** ${where}`,
    `- **Updated:** ${section.updated_at}`,
    `- **Id:** \`${section.id}\``,
    `- **Link:** ${links.section(section.id)}`,
    '',
    '---',
    '',
    body
  ].join('\n');
}
