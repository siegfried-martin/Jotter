import TurndownService from 'turndown';
import type { ChecklistItem, NoteSection } from '@/lib/types';
import { renderMarkdown } from './renderMarkdown';
import { getDiagramElementCount } from './diagram';
import { getTableCellCount, tableToCsv, tableToHtml, tableToMarkdown, tableToTsv } from './table';
import {
  getScheduleItemCount,
  timelineToCsv,
  timelineToHtml,
  timelineToMarkdown,
  timelineToTsv
} from './schedule';

// Clipboard export for section cards (requested-features #3b). Two affordances, offered
// per type (see SectionCard): a native "Copy" that pastes naturally into other apps, and
// an explicit "Copy as Markdown". The per-type matrix:
//
//   Text (wysiwyg)  Copy = rich HTML            Copy as Markdown = turndown(HTML)
//   Code            Copy = plain text           —
//   Checklist       Copy = rich HTML (struck)   Copy as Markdown = - [ ] / - [x] list
//   Draw (diagram)  Copy = PNG image            —
//   Markdown        Copy = rich HTML (rendered) Copy as Markdown = raw source
//   Table           Copy = TSV + HTML table     Copy as Markdown = GFM pipe table
//                   (Table also offers a "Download CSV" action — see downloadCsv.)

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

/** HTML (Quill) → Markdown, with line spacing that matches what the user typed. */
function htmlToMarkdown(html: string): string {
  return turndown
    .turndown(html)
    .replace(/^[ \t]+$/gm, '') // drop whitespace-only lines left by empty paragraphs
    .replace(/\n{3,}/g, '\n\n') // at most one blank line
    .trim();
}

function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? '').trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function checklistItems(section: NoteSection): ChecklistItem[] {
  return section.checklist_data ?? [];
}

/** Rich list: checked items are struck through so the done/undone state survives a paste. */
function checklistToHtml(items: ChecklistItem[]): string {
  const lis = items
    .map((it) => {
      const text = escapeHtml(it.text);
      return `<li>${it.checked ? `<s>${text}</s>` : text}</li>`;
    })
    .join('');
  return `<ul>${lis}</ul>`;
}

/** Plain-text fallback for a checklist (no strikethrough possible — mark done with ✓). */
function checklistToPlain(items: ChecklistItem[]): string {
  return items.map((it) => `${it.checked ? '✓' : '•'} ${it.text}`).join('\n');
}

/** A section's Markdown representation (for the "Copy as Markdown" action). */
export function sectionToMarkdown(section: NoteSection): string {
  switch (section.type) {
    case 'markdown':
      return section.content ?? '';
    case 'wysiwyg':
      return htmlToMarkdown(section.content ?? '');
    case 'checklist':
      return checklistItems(section)
        .map(
          (it) => `- [${it.checked ? 'x' : ' '}] ${it.text}${it.date ? ` (due ${it.date})` : ''}`
        )
        .join('\n');
    case 'table':
      return tableToMarkdown(section.content ?? '');
    case 'timeline':
      return timelineToMarkdown(section.content ?? '');
    default:
      // code/diagram have no "Copy as Markdown" affordance, but stay total for safety.
      return section.content ?? '';
  }
}

async function writeRich(html: string, plain: string): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plain], { type: 'text/plain' })
    })
  ]);
}

/** Label for the native-copy menu item (Draw copies a PNG, so "Copy" reads oddly). */
export function nativeCopyLabel(type: NoteSection['type']): string {
  return type === 'diagram' ? 'Copy image' : 'Copy';
}

/** Whether a type offers the explicit "Copy as Markdown" action. */
export function hasMarkdownCopy(type: NoteSection['type']): boolean {
  return (
    type === 'wysiwyg' ||
    type === 'checklist' ||
    type === 'markdown' ||
    type === 'table' ||
    type === 'timeline'
  );
}

/** Whether a type offers the "Download CSV" action (tabular exports). */
export function hasCsvDownload(type: NoteSection['type']): boolean {
  return type === 'table' || type === 'timeline';
}

/**
 * The native "Copy": rich text (text/html + plain fallback) for Text/Checklist/Markdown so
 * it pastes formatted into Docs/Word/email, plain text for Code, and a PNG for Draw.
 * Returns the toast message to show.
 */
export async function copyNative(section: NoteSection): Promise<string> {
  switch (section.type) {
    case 'diagram': {
      if (getDiagramElementCount(section.content) === 0) return 'Nothing to copy';
      const data = JSON.parse(section.content);
      const { exportToBlob } = await import('@excalidraw/excalidraw');
      const blob = await exportToBlob({
        elements: data.elements,
        appState: { ...data.appState, exportBackground: true, exportWithDarkMode: false },
        files: data.files || {},
        mimeType: 'image/png'
      });
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      return 'Copied image to clipboard';
    }
    case 'code': {
      if (!section.content?.trim()) return 'Nothing to copy';
      await navigator.clipboard.writeText(section.content);
      return 'Copied to clipboard';
    }
    case 'wysiwyg': {
      const plain = htmlToPlainText(section.content ?? '');
      if (!plain) return 'Nothing to copy';
      await writeRich(section.content ?? '', plain);
      return 'Copied to clipboard';
    }
    case 'markdown': {
      if (!section.content?.trim()) return 'Nothing to copy';
      const html = renderMarkdown(section.content);
      await writeRich(html, htmlToPlainText(html));
      return 'Copied to clipboard';
    }
    case 'checklist': {
      const items = checklistItems(section);
      if (items.length === 0) return 'Nothing to copy';
      await writeRich(checklistToHtml(items), checklistToPlain(items));
      return 'Copied to clipboard';
    }
    case 'table': {
      // TSV as plain text (pastes into Excel/Sheets) + an HTML <table> for rich targets.
      if (getTableCellCount(section.content) === 0) return 'Nothing to copy';
      await writeRich(tableToHtml(section.content), tableToTsv(section.content));
      return 'Copied to clipboard';
    }
    case 'timeline': {
      // TSV (Title/Lane/Start/End, pastes into Excel/Sheets) + an HTML <table> for rich targets.
      if (getScheduleItemCount(section.content) === 0) return 'Nothing to copy';
      await writeRich(timelineToHtml(section.content), timelineToTsv(section.content));
      return 'Copied to clipboard';
    }
  }
}

/** Trigger a CSV file download of a table or timeline section. Returns the toast message. */
export function downloadCsv(section: NoteSection): string {
  let csv: string;
  if (section.type === 'timeline') {
    if (getScheduleItemCount(section.content) === 0) return 'Nothing to export';
    csv = timelineToCsv(section.content);
  } else {
    if (getTableCellCount(section.content) === 0) return 'Nothing to export';
    csv = tableToCsv(section.content);
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const name = (section.title?.trim() || section.type).replace(/[^\w.-]+/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'Downloaded CSV';
}

/** The "Copy as Markdown" action. Returns the toast message to show. */
export async function copyAsMarkdown(section: NoteSection): Promise<string> {
  const md = sectionToMarkdown(section);
  if (!md.trim()) return 'Nothing to copy';
  await navigator.clipboard.writeText(md);
  return 'Copied as Markdown';
}
