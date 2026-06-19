import { useEffect, useRef } from 'react';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  keymap
} from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  indentOnInput,
  bracketMatching
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { CODE_LANGUAGES } from './CodeMirrorEditor';

// Same look as CodeMirrorEditor; the editor fills its container's height.
const theme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', fontSize: '13px', height: '100%' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-gutters': { backgroundColor: '#f8fafc', color: '#94a3b8', border: 'none' },
  '.cm-content': { padding: '0.75rem 0' }
});

/**
 * Code editor bound to a Yjs document (slice 3). Edits flow into the shared `text`, which
 * y-indexeddb persists durably — so there's no onChange/content prop; the modal reads the
 * Y.Text on save. yCollab brings its own (Yjs) undo history, so CodeMirror's `history()` is
 * intentionally omitted to avoid a double undo stack.
 */
export function YCodeMirrorEditor({
  text,
  awareness,
  language
}: {
  text: Y.Text;
  awareness: Awareness;
  language: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  // Recreate on language change; content lives in the shared `text`, so it's preserved.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const langExt = (CODE_LANGUAGES[language] ?? CODE_LANGUAGES.plaintext)();
    const view = new EditorView({
      doc: text.toString(),
      parent: host,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...closeBracketsKeymap, ...yUndoManagerKeymap, ...defaultKeymap, indentWithTab]),
        EditorView.lineWrapping,
        theme,
        langExt,
        yCollab(text, awareness)
      ]
    });

    return () => view.destroy();
  }, [language, text, awareness]);

  return <div ref={hostRef} className="h-full" />;
}
