import { useEffect, useState } from 'react';

/**
 * Double-click to edit; Enter/blur saves, Escape cancels. Empty/whitespace-only
 * input is rejected (parity with the Svelte InlineEditableTitle + its E2E specs).
 */
export function InlineEditableTitle({
  value,
  onSave,
  className,
  inputClassName
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') cancel();
        }}
        className={
          inputClassName ?? 'w-full rounded border border-blue-300 px-1 text-sm focus:outline-none'
        }
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Double-click to rename"
      className={className}
    >
      {value}
    </span>
  );
}
