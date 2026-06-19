import { useNavigate } from '@tanstack/react-router';
import type { Collection, NoteSection } from '@/lib/types';
import { useCollections } from '@/lib/data/useCollections';
import { useContainer } from '@/lib/data/useContainers';
import { useDeleteSection, useRecentSections, useUpdateSection } from '@/lib/data/useSections';
import { SectionCard } from '@/components/sections/SectionCard';
import { isSectionEmpty } from '@/lib/util/sectionContent';

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
  const location = section.note_container_id
    ? `${collection?.name ?? '…'} / ${container?.title ?? '…'}`
    : 'Unfiled';

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

  function openSection(sectionId: string) {
    navigate({ to: '/app/sections/$sectionId', params: { sectionId } });
  }

  const shown = (recent ?? []).slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-3 text-sm font-semibold text-slate-500">Recent notes</h2>
      <div
        data-testid="recent-notes"
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
