import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { Collection, NoteSection } from '@/lib/types';
import { useCollections } from '@/lib/data/useCollections';
import { useContainer } from '@/lib/data/useContainers';
import {
  useDeleteSection,
  useRecentSections,
  useSearchSections,
  useUpdateSection
} from '@/lib/data/useSections';
import { SectionCard } from '@/components/sections/SectionCard';
import { isSectionEmpty } from '@/lib/util/sectionContent';
import { useDebouncedValue } from '@/lib/util/useDebouncedValue';

/** A recent-feed card with a small location line (collection / note, or "Unfiled"),
 *  since default note names alone don't tell recent sections apart. */
function RecentNoteCard({
  section,
  collections,
  onOpen,
  onDelete,
  onRenameTitle,
  onToggleChecklistItem
}: {
  section: NoteSection;
  collections: Collection[] | undefined;
  onOpen: () => void;
  onDelete: () => void;
  onRenameTitle: (title: string | null) => void;
  onToggleChecklistItem: (index: number, checked: boolean) => void;
}) {
  const { data: container } = useContainer(section.note_container_id);
  const collection = collections?.find((c) => c.id === container?.collection_id) ?? null;
  // Parented in a collection of mine → show the path; parented elsewhere → it's a
  // section shared with me (its collection isn't one I belong to); else unfiled.
  const location = !section.note_container_id
    ? 'Unfiled'
    : collection
      ? `${collection.name} / ${container?.title ?? '…'}`
      : 'Shared with you';

  return (
    <div>
      <div className="mb-1 truncate px-1 text-xs text-slate-400" title={location}>
        {location}
      </div>
      <SectionCard
        section={section}
        onOpen={onOpen}
        onDelete={onDelete}
        onRenameTitle={onRenameTitle}
        onToggleChecklistItem={onToggleChecklistItem}
      />
    </div>
  );
}

export function RecentNotes() {
  const navigate = useNavigate();
  const { data: collections } = useCollections();
  const deleteSection = useDeleteSection();
  const updateSection = useUpdateSection();
  const { data: recent } = useRecentSections();

  // Keyword search over ALL accessible sections (not just the recent 4) — the way to
  // find "lost" jots. Debounced so we don't hit the RPC on every keystroke; while a
  // query is active the results replace the recent feed in the same grid.
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const searching = debouncedQuery !== '';
  const { data: results, isPending: searchPending } = useSearchSections(debouncedQuery);

  function openSection(sectionId: string) {
    navigate({ to: '/app/sections/$sectionId', params: { sectionId } });
  }

  const shown = searching ? (results ?? []) : (recent ?? []).slice(0, 4);
  if ((recent ?? []).length === 0 && !searching && query === '') return null;

  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-slate-500">
          {searching ? 'Search results' : 'Recent notes'}
        </h2>
        <input
          data-testid="section-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder="Search notes…"
          className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none sm:w-72"
        />
      </div>
      {searching && shown.length === 0 && !searchPending && (
        <p data-testid="search-empty" className="px-1 text-sm text-slate-400">
          No notes match &ldquo;{debouncedQuery}&rdquo;.
        </p>
      )}
      <div
        data-testid={searching ? 'search-results' : 'recent-notes'}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      >
        {shown.map((s) => (
          <RecentNoteCard
            key={s.id}
            section={s}
            collections={collections}
            onOpen={() => openSection(s.id)}
            onDelete={() => {
              if (
                !isSectionEmpty(s) &&
                !window.confirm(`Delete this ${s.title || s.type} section? This cannot be undone.`)
              )
                return;
              deleteSection.mutate({ id: s.id, containerId: s.note_container_id ?? '' });
            }}
            onRenameTitle={(title) =>
              updateSection.mutate({
                id: s.id,
                containerId: s.note_container_id ?? '',
                updates: { title }
              })
            }
            onToggleChecklistItem={(index, checked) => {
              const next = (s.checklist_data ?? []).map((it, i) =>
                i === index ? { ...it, checked } : it
              );
              updateSection.mutate({
                id: s.id,
                containerId: s.note_container_id ?? '',
                updates: { checklist_data: next }
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
