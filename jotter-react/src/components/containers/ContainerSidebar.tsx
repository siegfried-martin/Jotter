import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NoteContainer } from '@/lib/types';
import {
  useCreateContainer,
  useDeleteContainer,
  useUpdateContainer
} from '@/lib/data/useContainers';
import { useDndEnabled } from '@/lib/util/useDndEnabled';
import { InlineEditableTitle } from '@/components/ui/InlineEditableTitle';

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

// A stable per-note color from its title (parity with prod's note avatars).
const NOTE_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500'
];
function noteColor(title: string): string {
  const hash = [...title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return NOTE_COLORS[hash % NOTE_COLORS.length];
}

/** One sidebar note: a dnd-kit sortable (for reorder + cross-collection move) that
 *  is simultaneously a drop target for sections being moved between notes. */
function SortableContainerItem({
  container,
  index,
  collectionId,
  active,
  collapsed,
  dndEnabled,
  activeType,
  onSelect,
  onRename,
  onDelete
}: {
  container: NoteContainer;
  index: number;
  collectionId: string;
  active: boolean;
  collapsed: boolean;
  dndEnabled: boolean;
  activeType: 'section' | 'container' | null;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
    active: activeDrag
  } = useSortable({
    id: container.id,
    data: {
      type: 'container',
      containerId: container.id,
      collectionId,
      index,
      title: container.title
    },
    disabled: !dndEnabled
  });

  // A section being dragged → every note is an eligible target (dashed); the hovered
  // one is highlighted solid.
  const eligible = activeType === 'section';
  const sectionOver = isOver && activeDrag?.data?.current?.type === 'section';

  return (
    <div
      ref={setNodeRef}
      data-container-id={container.id}
      data-testid="container-item"
      onClick={onSelect}
      title={collapsed ? container.title : undefined}
      style={
        isDragging ? { opacity: 0.5 } : { transform: CSS.Transform.toString(transform), transition }
      }
      className={`group mb-1 flex cursor-pointer items-center gap-1 rounded-lg text-sm ${
        collapsed ? 'justify-center px-1 py-2' : 'px-2 py-2'
      } ${active ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700 hover:bg-slate-50'} ${
        sectionOver
          ? 'bg-blue-100 outline outline-2 outline-blue-500'
          : eligible
            ? 'outline-2 outline-offset-[-2px] outline-blue-400 outline-dashed'
            : ''
      }`}
    >
      {dndEnabled && !collapsed && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder or move to another collection"
          aria-label="Drag note"
          className="hidden flex-shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing md:flex"
        >
          <GripIcon />
        </button>
      )}

      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white ${noteColor(container.title)}`}
        aria-hidden="true"
      >
        {(container.title.trim()[0] ?? '•').toUpperCase()}
      </span>

      {!collapsed && (
        <>
          <InlineEditableTitle
            value={container.title}
            trigger="dblclick"
            onSave={onRename}
            className="flex-1 truncate"
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-1 flex-shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
            title="Delete note"
            aria-label="Delete note"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

const DESKTOP_QUERY = '(min-width: 1024px)';

/** Chevron pair pointing left (expanded) / right (collapsed) — the collapse toggle. */
const CollapseChevrons = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    className={`h-5 w-5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
    />
  </svg>
);

export function ContainerSidebar({
  collectionId,
  containers,
  selectedContainerId,
  activeType = null
}: {
  collectionId: string;
  containers: NoteContainer[];
  selectedContainerId: string | null;
  activeType?: 'section' | 'container' | null;
}) {
  const navigate = useNavigate();
  const dndEnabled = useDndEnabled();

  // Auto-collapse below the desktop breakpoint (and re-expand above it), like the
  // pre-React app; the toggle still lets the user override either way.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia(DESKTOP_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCollapsed(!e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const createContainer = useCreateContainer();
  const deleteContainer = useDeleteContainer();
  const updateContainer = useUpdateContainer();

  function select(containerId: string) {
    navigate({
      to: '/app/collections/$collectionId/containers/$containerId',
      params: { collectionId, containerId }
    });
  }

  async function handleNew() {
    // Default title ("New Note <date>") is provided by useCreateContainer.
    const created = await createContainer.mutateAsync({ collectionId });
    select(created.id);
  }

  async function handleDelete(container: NoteContainer) {
    if (
      !window.confirm(
        `Delete "${container.title}"? This also deletes all sections inside it. This cannot be undone.`
      )
    )
      return;
    await deleteContainer.mutateAsync({ id: container.id, collectionId });
    if (selectedContainerId === container.id) {
      const next = containers.find((c) => c.id !== container.id);
      if (next) select(next.id);
      else navigate({ to: '/app/collections/$collectionId', params: { collectionId } });
    }
  }

  return (
    <aside
      data-testid="container-sidebar"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={`flex flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56 lg:w-64'
      }`}
    >
      <div
        className={`flex items-center border-b border-slate-100 p-2 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!collapsed && <h2 className="pl-1 text-sm font-semibold text-slate-700">Notes</h2>}
        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <CollapseChevrons collapsed={collapsed} />
        </button>
      </div>
      <div className={`border-b border-slate-100 ${collapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={handleNew}
          disabled={createContainer.isPending}
          title="Create new note"
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 ${
            collapsed ? 'px-0 py-2' : 'px-4 py-2'
          }`}
        >
          {collapsed ? '+' : '+ New Note'}
        </button>
      </div>
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-1.5' : 'p-2'}`}>
        {containers.length === 0 && !collapsed && (
          <p className="px-2 py-4 text-center text-sm text-slate-400">No notes yet</p>
        )}
        <SortableContext items={containers.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {containers.map((c, index) => (
            <SortableContainerItem
              key={c.id}
              container={c}
              index={index}
              collectionId={collectionId}
              active={c.id === selectedContainerId}
              collapsed={collapsed}
              dndEnabled={dndEnabled}
              activeType={activeType}
              onSelect={() => select(c.id)}
              onRename={(title) =>
                updateContainer.mutate({ id: c.id, collectionId, updates: { title } })
              }
              onDelete={() => handleDelete(c)}
            />
          ))}
        </SortableContext>
      </nav>
    </aside>
  );
}
