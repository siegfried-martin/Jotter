import { Link, useNavigate } from '@tanstack/react-router';
import { useDroppable } from '@dnd-kit/core';
import { useCollections } from '@/lib/data/useCollections';

/** Wraps a desktop tab as a drop target: a container dropped here moves to this
 *  collection; a section dropped here moves to this collection's top note. */
function TabDrop({ collectionId, children }: { collectionId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `collectiontab:${collectionId}`,
    data: { type: 'collectiontab', collectionId }
  });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-t ${isOver ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
    >
      {children}
    </div>
  );
}

/**
 * Collection switcher in the container-page header — color-coded tabs on desktop,
 * a dropdown below sm. Navigating to /app/collections/$id lands on that collection's
 * first note (the container route redirects). Desktop tabs are drop targets for
 * cross-collection container moves and section→collection moves.
 */
export function CollectionTabs({ currentCollectionId }: { currentCollectionId: string }) {
  const { data: collections } = useCollections();
  const navigate = useNavigate();

  if (!collections || collections.length === 0) return null;
  const current = collections.find((c) => c.id === currentCollectionId);

  return (
    <>
      {/* Mobile: dropdown */}
      <select
        value={currentCollectionId}
        onChange={(e) =>
          navigate({
            to: '/app/collections/$collectionId',
            params: { collectionId: e.target.value }
          })
        }
        className="max-w-[160px] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm sm:hidden"
        style={{ borderLeft: `4px solid ${current?.color ?? '#3B82F6'}` }}
      >
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Desktop: tabs */}
      <div className="hidden items-center gap-1 overflow-x-auto sm:flex">
        {collections.map((c) => {
          const active = c.id === currentCollectionId;
          if (active) {
            return (
              <TabDrop key={c.id} collectionId={c.id}>
                <span
                  className="block max-w-[160px] truncate rounded-t px-3 py-1.5 text-sm font-medium text-slate-900"
                  style={{ borderBottom: `3px solid ${c.color}`, backgroundColor: `${c.color}15` }}
                >
                  {c.name}
                </span>
              </TabDrop>
            );
          }
          return (
            <TabDrop key={c.id} collectionId={c.id}>
              <Link
                to="/app/collections/$collectionId"
                params={{ collectionId: c.id }}
                className="block max-w-[160px] truncate rounded-t px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                style={{ borderBottom: `3px solid ${c.color}` }}
              >
                {c.name}
              </Link>
            </TabDrop>
          );
        })}
      </div>
    </>
  );
}
