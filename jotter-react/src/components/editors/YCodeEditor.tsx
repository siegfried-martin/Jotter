import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { YCodeMirrorEditor } from './YCodeMirrorEditor';
import { LANGUAGES } from './codeLanguages';

/**
 * Yjs-backed code section editor — same layout as CodeEditor, but the text lives in a
 * shared Y.Text (durable via y-indexeddb) instead of a controlled string.
 */
export function YCodeEditor({
  text,
  awareness,
  language,
  onLanguageChange
}: {
  text: Y.Text;
  awareness: Awareness;
  language: string;
  onLanguageChange: (language: string) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-hidden">
        <YCodeMirrorEditor text={text} awareness={awareness} language={language} />
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <label htmlFor="code-language" className="text-sm font-medium text-slate-600">
          Language:
        </label>
        <select
          id="code-language"
          value={LANGUAGES.some((l) => l.value === language) ? language : 'plaintext'}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400 focus:border-blue-500 focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
