import { Link, useNavigate } from '@tanstack/react-router';
import { useCollections } from '@/lib/data/useCollections';

/**
 * Collection switcher in the container-page header — color-coded tabs on desktop,
 * a dropdown below sm. Navigating to /app/collections/$id lands on that collection's
 * first note (the container route redirects). Cross-collection drag-drop onto tabs
 * is deferred to the DnD phase.
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
              <span
                key={c.id}
                className="max-w-[160px] truncate rounded-t px-3 py-1.5 text-sm font-medium text-slate-900"
                style={{ borderBottom: `3px solid ${c.color}`, backgroundColor: `${c.color}15` }}
              >
                {c.name}
              </span>
            );
          }
          return (
            <Link
              key={c.id}
              to="/app/collections/$collectionId"
              params={{ collectionId: c.id }}
              className="max-w-[160px] truncate rounded-t px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              style={{ borderBottom: `3px solid ${c.color}` }}
            >
              {c.name}
            </Link>
          );
        })}
      </div>
    </>
  );
}
