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

const LANGUAGES: Record<string, () => Extension | Extension[]> = {
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

// Light theme — syntax highlighting only, no IDE chrome.
const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-gutters': { backgroundColor: '#f8fafc', color: '#94a3b8', border: 'none' },
  '.cm-content': { padding: '0.75rem 0' },
  '.cm-editor': { minHeight: '60vh' }
});

export function CodeMirrorEditor({
  initial,
  language,
  onSave,
  onLanguageChange
}: {
  initial: string;
  language: string;
  onSave: (content: string) => void;
  onLanguageChange: (language: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(initial);
  const saveRef = useCallbackRef(onSave);

  // Recreate the editor on language change (content preserved via contentRef).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let timer: ReturnType<typeof setTimeout>;
    const langExt = (LANGUAGES[language] ?? LANGUAGES.plaintext)();

    const view = new EditorView({
      doc: contentRef.current,
      parent: host,
      extensions: [
        // Minimal set: highlighting + basic editing only. No autocomplete,
        // bracket-closing, or search panel (this isn't a code IDE — it's for
        // sharing snippets / discussing technical requirements).
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
        lightTheme,
        langExt,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          contentRef.current = update.state.doc.toString();
          clearTimeout(timer);
          timer = setTimeout(() => saveRef(contentRef.current), 800);
        })
      ]
    });

    return () => {
      clearTimeout(timer);
      saveRef(contentRef.current); // flush pending edits before teardown
      view.destroy();
    };
  }, [language, saveRef]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <label className="text-xs text-slate-500">Language</label>
        <select
          value={LANGUAGES[language] ? language : 'plaintext'}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          {Object.keys(LANGUAGES).map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div ref={hostRef} className="overflow-hidden rounded-lg border border-slate-200 text-sm" />
    </div>
  );
}
