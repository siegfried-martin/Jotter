import TurndownService from 'turndown';
import type { NoteSection } from '../types';
import { tableToMarkdown } from './table';
import { timelineToMarkdown, calendarToMarkdown } from './schedule';

// Section → Markdown, shared by the app's "Copy as Markdown" (sectionClipboard.ts) and the
// jotter-server MCP connector, which hands notes to Claude as Markdown. Keep this module
// free of browser APIs and `@/` aliases: jotter-server bundles it directly from here.
// (turndown's Node build carries its own DOM parser, so it runs server-side unchanged.)

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});
// Quill emits <s> for strikethrough; turndown core ignores it. Map it to GFM ~~ ~~.
turndown.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`
});
// Quill wraps every line in its own <p>, so turndown's default would put a blank line
// between every line. Emit a single trailing newline so consecutive lines stay consecutive;
// intentional blank lines (empty <p><br></p>) are normalized back in htmlToMarkdown().
turndown.addRule('paragraph', {
  filter: 'p',
  replacement: (content) => content + '\n'
});

/** Wysiwyg HTML → Markdown, with line spacing that matches what the user typed. */
export function htmlToMarkdown(html: string): string {
  return turndown
    .turndown(html)
    .replace(/^[ \t]+$/gm, '') // drop whitespace-only lines left by empty paragraphs
    .replace(/\n{3,}/g, '\n\n') // at most one blank line
    .trim();
}

/** A section's Markdown representation (for the "Copy as Markdown" action). */
export function sectionToMarkdown(section: NoteSection): string {
  switch (section.type) {
    case 'markdown':
      return section.content ?? '';
    case 'wysiwyg':
      return htmlToMarkdown(section.content ?? '');
    case 'checklist':
      return (section.checklist_data ?? [])
        .map(
          (it) => `- [${it.checked ? 'x' : ' '}] ${it.text}${it.date ? ` (due ${it.date})` : ''}`
        )
        .join('\n');
    case 'table':
      return tableToMarkdown(section.content ?? '');
    case 'timeline':
      return timelineToMarkdown(section.content ?? '');
    case 'calendar':
      return calendarToMarkdown(section.content ?? '');
    default:
      // code/diagram have no "Copy as Markdown" affordance, but stay total for safety.
      return section.content ?? '';
  }
}
