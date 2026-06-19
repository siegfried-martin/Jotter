import { useEffect, useRef, useState } from 'react';
import type { NoteContainer, NoteSection } from '@/lib/types';
import { useCollections } from '@/lib/data/useCollections';
import { useContainer, useContainers, useCreateContainer } from '@/lib/data/useContainers';
import { useMoveSectionToContainer } from '@/lib/data/useSections';
import { NoteService } from '@/lib/services/noteService';
import { showToast } from '@/lib/ui/toast';

function byRecent(a: NoteContainer, b: NoteContainer) {
  return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
}

/**
 * "Filed in" breadcrumb shown in the section editor: [Collection] / [Note].
 * A note can't be chosen until a collection is. Picking a collection files the
 * section into that collection's most-recent note (creating one if it has none);
 * clicking the note lists the 10 most-recent notes in the collection to switch.
 */
export function SectionFiling({ section }: { section: NoteSection }) {
  const fromContainerId = section.note_container_id;
  const { data: container } = useContainer(fromContainerId);
  const { data: collections } = useCollections();
  const collectionId = container?.collection_id ?? null;
  const collection = collections?.find((c) => c.id === collectionId) ?? null;
  const { data: containersInCollection } = useContainers(collectionId);

  const move = useMoveSectionToContainer();
  const createContainer = useCreateContainer();

  const [menu, setMenu] = useState<'collection' | 'container' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [menu]);

  function assignTo(toContainerId: string) {
    setMenu(null);
    if (toContainerId === fromContainerId) return;
    move.mutate({ sectionId: section.id, fromContainerId: fromContainerId ?? '', toContainerId });
  }

  async function pickCollection(targetCollectionId: string) {
    setMenu(null);
    const list = await NoteService.getNoteContainers(targetCollectionId);
    let target = [...list].sort(byRecent)[0];
    if (!target) target = await createContainer.mutateAsync({ collectionId: targetCollectionId });
    if (target.id !== fromContainerId) {
      move.mutate({
        sectionId: section.id,
        fromContainerId: fromContainerId ?? '',
        toContainerId: target.id
      });
      showToast(
        `Filed in ${collections?.find((c) => c.id === targetCollectionId)?.name ?? 'collection'}`
      );
    }
  }

  const recentContainers = [...(containersInCollection ?? [])].sort(byRecent).slice(0, 10);

  return (
    <div ref={ref} className="relative flex flex-shrink-0 items-center gap-1 text-xs">
      <button
        data-testid="filing-collection"
        onClick={() => setMenu(menu === 'collection' ? null : 'collection')}
        className={`rounded px-1.5 py-0.5 hover:bg-slate-100 ${
          collection ? 'text-slate-700' : 'text-slate-400 italic'
        }`}
      >
        {collection?.name ?? 'Collection'} ▾
      </button>
      <span className="text-slate-300">/</span>
      <button
        data-testid="filing-note"
        onClick={() => collectionId && setMenu(menu === 'container' ? null : 'container')}
        disabled={!collectionId}
        className={`rounded px-1.5 py-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
          container ? 'text-slate-700' : 'text-slate-400 italic'
        }`}
      >
        {container?.title ?? 'Note'} ▾
      </button>

      {menu === 'collection' && (
        <div className="absolute top-full right-0 z-50 mt-1 max-h-60 w-56 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {collections?.length ? (
            collections.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCollection(c.id)}
                className="block w-full truncate px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {c.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-1.5 text-sm text-slate-400">No collections</p>
          )}
        </div>
      )}
      {menu === 'container' && (
        <div className="absolute top-full right-0 z-50 mt-1 max-h-60 w-56 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {recentContainers.length ? (
            recentContainers.map((c) => (
              <button
                key={c.id}
                onClick={() => assignTo(c.id)}
                className="block w-full truncate px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {c.title}
              </button>
            ))
          ) : (
            <p className="px-3 py-1.5 text-sm text-slate-400">No notes</p>
          )}
        </div>
      )}
    </div>
  );
}
