import { useEffect, useRef } from 'react';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  keymap
} from '@codemirror/view';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  indentOnInput,
  bracketMatching
} from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sql } from '@codemirror/lang-sql';
import { markdown } from '@codemirror/lang-markdown';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { rust } from '@codemirror/lang-rust';
import { xml } from '@codemirror/lang-xml';
import { useCallbackRef } from '@/lib/util/useCallbackRef';

export const CODE_LANGUAGES: Record<string, () => Extension | Extension[]> = {
  plaintext: () => [],
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  jsx: () => javascript({ jsx: true }),
  python: () => python(),
  json: () => json(),
  html: () => html(),
  css: () => css(),
  sql: () => sql(),
  markdown: () => markdown(),
  cpp: () => cpp(),
  java: () => java(),
  php: () => php(),
  rust: () => rust(),
  xml: () => xml()
};

// Light, syntax-highlighting-only theme; editor fills its container's height.
const theme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', fontSize: '13px', height: '100%' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-gutters': { backgroundColor: '#f8fafc', color: '#94a3b8', border: 'none' },
  '.cm-content': { padding: '0.75rem 0' }
});

export function CodeMirrorEditor({
  initial,
  language,
  onChange
}: {
  initial: string;
  language: string;
  onChange: (content: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(initial);
  const changeRef = useCallbackRef(onChange);

  // Recreate on language change (content preserved via contentRef).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const langExt = (CODE_LANGUAGES[language] ?? CODE_LANGUAGES.plaintext)();
    const view = new EditorView({
      doc: contentRef.current,
      parent: host,
      extensions: [
        // Highlighting + basic editing only — no autocomplete / bracket-closing / search.
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.lineWrapping,
        theme,
        langExt,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          contentRef.current = update.state.doc.toString();
          changeRef(contentRef.current);
        })
      ]
    });

    return () => view.destroy();
  }, [language, changeRef]);

  return <div ref={hostRef} className="h-full" />;
}
