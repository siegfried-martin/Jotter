import { CodeMirrorEditor } from './CodeMirrorEditor';

// Order + labels mirror the Svelte CodeEditor's dropdown.
const LANGUAGES: { value: string; label: string }[] = [
  { value: 'plaintext', label: 'Plain Text (Pseudocode)' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'php', label: 'PHP' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' }
];

/** Code section editor: CodeMirror fills the height; language selector sits in a bottom bar. */
export function CodeEditor({
  content,
  language,
  onContentChange,
  onLanguageChange
}: {
  content: string;
  language: string;
  onContentChange: (content: string) => void;
  onLanguageChange: (language: string) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirrorEditor initial={content} language={language} onChange={onContentChange} />
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
