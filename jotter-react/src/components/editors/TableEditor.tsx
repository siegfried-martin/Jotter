import { useState } from 'react';

/**
 * Table (spreadsheet) section editor.
 *
 * Mirrors ExcalidrawEditor's `{ initial, onChange }` contract: the editor owns an opaque
 * JSON blob (a Univer workbook snapshot) that is mirrored into `note_section.content` and
 * synced on the LWW track — no Yjs. See docs/initiatives/table-section.md.
 *
 * SLICE 1 STUB: a raw-content textarea so the type round-trips (create → save → reopen)
 * end-to-end. Slice 2 swaps this for a code-split Univer instance with the same props.
 */
export function TableEditor({
  initial,
  onChange
}: {
  initial: string;
  onChange: (content: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="flex h-full flex-col" data-testid="table-editor">
      <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Spreadsheet editor (Univer) lands in slice 2. This placeholder stores raw content.
      </div>
      <textarea
        data-testid="table-editor-raw"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        spellCheck={false}
        className="w-full flex-1 resize-none p-3 font-mono text-sm text-slate-800 focus:outline-none"
        placeholder="(table data)"
      />
    </div>
  );
}
