import { useEffect, useState } from 'react';

/**
 * Click (or double-click) to edit; Enter/blur saves, Escape cancels. Empty/
 * whitespace-only input is rejected (parity with the Svelte InlineEditableTitle
 * + its E2E specs, which use single-click → type → Enter).
 *
 * `trigger='dblclick'` is used where a single click already means something else
 * (e.g. selecting a note in the sidebar).
 */
export function InlineEditableTitle({
  value,
  onSave,
  className,
  inputClassName,
  trigger = 'click'
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  inputClassName?: string;
  trigger?: 'click' | 'dblclick';
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

  function startEdit(e: React.SyntheticEvent) {
    e.stopPropagation();
    setEditing(true);
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
      onClick={trigger === 'click' ? startEdit : undefined}
      onDoubleClick={trigger === 'dblclick' ? startEdit : undefined}
      title={trigger === 'dblclick' ? 'Double-click to rename' : 'Click to rename'}
      className={className}
    >
      {value}
    </span>
  );
}
