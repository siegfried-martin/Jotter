// Language options for the code-section selector (order + labels mirror the Svelte app).
// Shared by CodeEditor (string-based) and YCodeEditor (Yjs-bound).
export const LANGUAGES: { value: string; label: string }[] = [
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
