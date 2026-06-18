import { useEffect, useRef } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ChecklistItem } from '@/lib/types';

type Priority = ChecklistItem['priority'];

const GripIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <circle cx="7" cy="5" r="1.5" />
    <circle cx="13" cy="5" r="1.5" />
    <circle cx="7" cy="10" r="1.5" />
    <circle cx="13" cy="10" r="1.5" />
    <circle cx="7" cy="15" r="1.5" />
    <circle cx="13" cy="15" r="1.5" />
  </svg>
);

function priorityStyle(priority: Priority): React.CSSProperties {
  switch (priority) {
    case 'high':
      return { backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626' }; // red
    case 'medium':
      return { backgroundColor: '#fef3c7', borderLeft: '4px solid #d97706' }; // amber
    case 'low':
      return { backgroundColor: '#dbeafe', borderLeft: '4px solid #2563eb' }; // blue
    default:
      return {};
  }
}

const EMPTY: ChecklistItem = { text: '', checked: false };

/** One sortable checklist row. Drag is handle-only (the grip), and the grip is
 *  hidden below md — so reordering is desktop-only, matching the mobile policy. */
function ChecklistRow({
  item,
  index,
  onUpdate,
  onRemove,
  onAddAfter
}: {
  item: ChecklistItem;
  index: number;
  onUpdate: (patch: Partial<ChecklistItem>) => void;
  onRemove: () => void;
  onAddAfter: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(index)
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? 'relative' : undefined,
        ...priorityStyle(item.priority)
      }}
      className="checklist-item flex items-center gap-2 rounded-lg p-2 md:gap-3 md:p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        aria-label="Drag to reorder"
        className="hidden flex-shrink-0 cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing md:flex"
      >
        <GripIcon />
      </button>

      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onUpdate({ checked: e.target.checked })}
        className="h-4 w-4 flex-shrink-0 rounded md:h-5 md:w-5"
      />

      {/* Date + priority — hidden below md, matching prod's mobile layout */}
      <input
        type="date"
        value={item.date ?? ''}
        onChange={(e) => onUpdate({ date: e.target.value || undefined })}
        className="hidden w-32 flex-shrink-0 rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-blue-500 focus:outline-none md:block"
      />
      <select
        value={item.priority ?? ''}
        onChange={(e) => onUpdate({ priority: (e.target.value || null) as Priority })}
        className="hidden flex-shrink-0 rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-blue-500 focus:outline-none md:block"
      >
        <option value="">None</option>
        <option value="low">◦ Low</option>
        <option value="medium">● Medium</option>
        <option value="high">⚡ High</option>
      </select>

      <input
        type="text"
        value={item.text}
        data-checklist-input={index}
        placeholder="Enter task..."
        onChange={(e) => onUpdate({ text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAddAfter();
          } else if (e.key === 'Backspace' && !item.text.trim()) {
            e.preventDefault();
            onRemove();
          }
        }}
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2 focus:border-blue-500 focus:outline-none"
      />

      <button
        onClick={onRemove}
        title="Remove item"
        aria-label="Remove item"
        className="flex-shrink-0 rounded-lg p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 md:p-2"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Checklist section editor — parity with the Svelte ChecklistEditor/SortableChecklistItem.
 * Progress bar + priority + due dates; Enter adds an item below, Backspace on an empty
 * item deletes it. Date/priority controls hide below md (matching the prod mobile layout).
 * Drag-reorder is deferred to the DnD phase.
 */
export function ChecklistEditor({
  value,
  onChange
}: {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  // Always show at least one (empty) row; an untouched empty list stays [] until edited.
  const items = value.length === 0 ? [EMPTY] : value;
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    const i = pendingFocus.current;
    pendingFocus.current = null;
    const el = document.querySelector<HTMLInputElement>(`[data-checklist-input="${i}"]`);
    el?.focus();
  });

  const completed = items.filter((it) => it.checked && it.text.trim()).length;
  const total = items.filter((it) => it.text.trim()).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    commit(arrayMove(items, Number(active.id), Number(over.id)));
  }

  function commit(next: ChecklistItem[], focusIndex?: number) {
    if (focusIndex !== undefined) pendingFocus.current = focusIndex;
    onChange(next);
  }
  function update(index: number, patch: Partial<ChecklistItem>) {
    commit(items.map((it, j) => (j === index ? { ...it, ...patch } : it)));
  }
  function addAfter(index: number) {
    commit([...items.slice(0, index + 1), { ...EMPTY }, ...items.slice(index + 1)], index + 1);
  }
  function addEnd() {
    commit([...items, { ...EMPTY }], items.length);
  }
  function remove(index: number) {
    if (items.length === 1) {
      commit([{ ...EMPTY }]);
      return;
    }
    commit(
      items.filter((_, j) => j !== index),
      index > 0 ? index - 1 : 0
    );
  }

  // Enter when focus isn't in a field → add an item at the end.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (e.key === 'Enter' && tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
        e.preventDefault();
        addEnd();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // addEnd reads `items` via closure; re-bind when items identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="flex h-full flex-col">
      {total > 0 && (
        <div className="mb-4 hidden rounded-lg bg-slate-50 p-3 md:block">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Progress: {completed} of {total} completed
            </span>
            <span className="text-sm text-slate-500">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((_, i) => String(i))}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item, i) => (
              <ChecklistRow
                key={i}
                item={item}
                index={i}
                onUpdate={(patch) => update(i, patch)}
                onRemove={() => remove(i)}
                onAddAfter={() => addAfter(i)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <button
          onClick={addEnd}
          className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-600 md:w-auto"
        >
          + Add new item
          <span className="ml-2 hidden text-xs text-slate-400 md:inline">or press Enter</span>
        </button>
      </div>
    </div>
  );
}
