import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Typography from '@tiptap/extension-typography';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

// The TipTap extensions that define the Text (wysiwyg) section's document SCHEMA: which
// nodes and marks exist, and their attributes. It's shared by the editor (YTipTapEditor adds
// its collaboration/UI-only extensions on top) and jotter-server, which reads and writes the
// same Y.XmlFragment for the MCP connector. The two must agree exactly, or content one side
// writes is dropped by the other. Keep this module free of React and browser APIs.
export function richTextExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      // Undo/redo comes from the Yjs document (Collaboration ships its own manager);
      // TipTap's local history would fight it.
      undoRedo: false,
      link: { openOnClick: false, autolink: true, linkOnPaste: true }
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    // The "Word-like" upgrades that motivated the TipTap move (wysiwyg-upgrade.md).
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    // Tables: without the schema, pasted <table> HTML (e.g. from a rendered markdown
    // preview) silently flattens to paragraphs — the owner hit this on day one.
    TableKit.configure({ table: { resizable: false } }),
    // Docs-like niceties (owner-picked batch): checkable task lists in prose, smart
    // punctuation, sub/superscript, and per-run font size.
    TaskList,
    TaskItem.configure({ nested: true }),
    Typography,
    Subscript,
    Superscript,
    FontSize
  ];
}
