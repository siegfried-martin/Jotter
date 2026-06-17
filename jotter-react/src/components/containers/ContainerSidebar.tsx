import { useNavigate } from '@tanstack/react-router';
import type { NoteContainer } from '@/lib/types';
import { useCreateContainer, useDeleteContainer } from '@/lib/data/useContainers';

export function ContainerSidebar({
  collectionId,
  containers,
  selectedContainerId
}: {
  collectionId: string;
  containers: NoteContainer[];
  selectedContainerId: string | null;
}) {
  const navigate = useNavigate();
  const createContainer = useCreateContainer();
  const deleteContainer = useDeleteContainer();

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

  async function handleDelete(containerId: string) {
    await deleteContainer.mutateAsync({ id: containerId, collectionId });
    if (selectedContainerId === containerId) {
      const next = containers.find((c) => c.id !== containerId);
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
        {containers.map((c) => {
          const active = c.id === selectedContainerId;
          return (
            <div
              key={c.id}
              onClick={() => select(c.id)}
              className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                active ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(c.id);
                }}
                className="ml-2 rounded p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                title="Delete note"
                aria-label="Delete note"
              >
                ✕
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
