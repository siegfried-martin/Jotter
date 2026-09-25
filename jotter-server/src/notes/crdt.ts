import * as Y from 'yjs';
import MarkdownIt from 'markdown-it';
import { getSchema } from '@tiptap/core';
import { generateHTML, generateJSON } from '@tiptap/html';
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON } from '@tiptap/y-tiptap';
import { isWysiwygEmpty, richTextExtensions } from '../shared';

// Server-side edits to CRDT-track sections (code, markdown, wysiwyg). Their source of truth
// is the Yjs document in note_section.ydoc, and `content` is only a mirror of it, so an edit
// must be a real Yjs op on that document. Writing `content` alone would be overwritten by the
// next editor save. The document layout matches the SPA (src/lib/offline/crdtSection.ts):
//   code / markdown → Y.Text 'content' (plain text)
//   wysiwyg         → Y.XmlFragment 'richtext' (TipTap/ProseMirror tree, via y-tiptap)

export type CrdtType = 'code' | 'markdown' | 'wysiwyg';

export interface CrdtEdit {
  mode: 'append' | 'replace';
  /** Plain text for code; Markdown for markdown and wysiwyg (rendered to rich text). */
  body: string;
}

export interface CrdtEditResult {
  /** The full new document state (base64), for note_section.ydoc. */
  ydoc: string;
  /** The re-materialized mirror, for note_section.content. */
  content: string;
  /** Just the ops this edit produced, for broadcasting to live editors. */
  update: Uint8Array;
}

const extensions = richTextExtensions();
const schema = getSchema(extensions);
const markdown = new MarkdownIt({ html: false, linkify: true });

export function isCrdtType(type: string): type is CrdtType {
  return type === 'code' || type === 'markdown' || type === 'wysiwyg';
}

export function markdownToHtml(md: string): string {
  // markdown-it ends every fenced block with a newline, which would become a blank last
  // line in the editor's code block.
  return markdown.render(md).replace(/\n<\/code><\/pre>/g, '</code></pre>');
}

/** HTML → a fragment of top-level Y nodes, built in a scratch doc (for cloning in). */
function htmlToYNodes(html: string): Array<Y.XmlElement | Y.XmlText> {
  const scratch = new Y.Doc();
  const fragment = scratch.getXmlFragment('richtext');
  prosemirrorJSONToYXmlFragment(schema, generateJSON(html, extensions), fragment);
  return fragment.toArray() as Array<Y.XmlElement | Y.XmlText>;
}

export function fragmentToHtml(fragment: Y.XmlFragment): string {
  const html = generateHTML(yXmlFragmentToProsemirrorJSON(fragment), extensions);
  return isWysiwygEmpty(html) ? '' : html;
}

/** A doc that is nothing but one empty paragraph: what a blank TipTap editor leaves behind. */
function isBlankRichText(fragment: Y.XmlFragment): boolean {
  if (fragment.length === 0) return true;
  if (fragment.length !== 1) return false;
  const only = fragment.get(0);
  return only instanceof Y.XmlElement && only.nodeName === 'paragraph' && only.length === 0;
}

/**
 * Seed a document that has never been saved as a CRDT (legacy section, or brand new with
 * content), the same way the editor would on first open: the plain text for code/markdown,
 * the parsed HTML for wysiwyg.
 */
function seed(doc: Y.Doc, type: CrdtType, content: string): void {
  if (!content) return;
  if (type === 'wysiwyg') {
    const fragment = doc.getXmlFragment('richtext');
    if (fragment.length === 0 && !isWysiwygEmpty(content)) {
      fragment.insert(
        0,
        htmlToYNodes(content).map((n) => n.clone())
      );
    }
  } else {
    const text = doc.getText('content');
    if (text.length === 0) text.insert(0, content);
  }
}

/** Separator so appended text starts on its own line (code) or its own paragraph (markdown). */
function joiner(existing: string, type: 'code' | 'markdown'): string {
  if (!existing) return '';
  const want = type === 'markdown' ? '\n\n' : '\n';
  let trailing = 0;
  while (trailing < want.length && existing[existing.length - 1 - trailing] === '\n') trailing++;
  return want.slice(trailing);
}

export function applyCrdtEdit(
  section: { type: CrdtType; content: string; ydoc: string | null | undefined },
  edit: CrdtEdit
): CrdtEditResult {
  const doc = new Y.Doc();
  if (section.ydoc) Y.applyUpdate(doc, Buffer.from(section.ydoc, 'base64'));
  // Measure from here, so the broadcast delta includes any seed ops too (a live editor
  // can't integrate an append whose anchor it has never seen).
  const before = Y.encodeStateVector(doc);

  let content: string;
  doc.transact(() => {
    if (!section.ydoc) seed(doc, section.type, section.content);

    if (section.type === 'wysiwyg') {
      const fragment = doc.getXmlFragment('richtext');
      if (edit.mode === 'replace' || isBlankRichText(fragment)) {
        fragment.delete(0, fragment.length);
      }
      fragment.insert(
        fragment.length,
        htmlToYNodes(markdownToHtml(edit.body)).map((n) => n.clone())
      );
      content = fragmentToHtml(fragment);
    } else {
      const text = doc.getText('content');
      if (edit.mode === 'replace') {
        text.delete(0, text.length);
        text.insert(0, edit.body);
      } else {
        text.insert(text.length, joiner(text.toString(), section.type) + edit.body);
      }
      content = text.toString();
    }
  });

  return {
    ydoc: Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64'),
    content: content!,
    update: Y.encodeStateAsUpdate(doc, before)
  };
}
