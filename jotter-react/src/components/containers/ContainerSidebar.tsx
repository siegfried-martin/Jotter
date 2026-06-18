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

/** One sidebar note: a dnd-kit sortable (for reorder + cross-collection move) that
 *  is simultaneously a drop target for sections being moved between notes. */
function SortableContainerItem({
  container,
  index,
  collectionId,
  active,
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
      style={
        isDragging ? { opacity: 0.5 } : { transform: CSS.Transform.toString(transform), transition }
      }
      className={`group mb-1 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm ${
        active ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700 hover:bg-slate-50'
      } ${
        sectionOver
          ? 'bg-blue-100 outline outline-2 outline-blue-500'
          : eligible
            ? 'outline-2 outline-offset-[-2px] outline-blue-400 outline-dashed'
            : ''
      }`}
    >
      {dndEnabled && (
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
    </div>
  );
}

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
    const created = await createContainer.mutateAsync({ collectionId, title: 'Untitled Note' });
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
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-3">
        <button
          onClick={handleNew}
          disabled={createContainer.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          + New Note
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {containers.length === 0 && (
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
