import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { AppHeader } from '@/components/AppHeader';
import { ContainerSidebar } from '@/components/containers/ContainerSidebar';
import { SectionGrid } from '@/components/sections/SectionGrid';
import {
  useContainers,
  useMoveContainerToCollection,
  useReorderContainers,
  useUpdateContainer
} from '@/lib/data/useContainers';
import { useMoveSectionToContainer, useReorderSections } from '@/lib/data/useSections';
import { queryKeys } from '@/lib/data/queryKeys';
import { NoteService } from '@/lib/services/noteService';
import type { NoteContainer } from '@/lib/types';
import { sortBySequence } from '@/lib/utils/sequenceUtils';
import { showToast } from '@/lib/ui/toast';
import { InlineEditableTitle } from '@/components/ui/InlineEditableTitle';
import { CollectionTabs } from '@/components/layout/CollectionTabs';

export function ContainerPageRoute() {
  return (
    <RequireAuth>
      <ContainerPage />
    </RequireAuth>
  );
}

// Pointer-precise while dragging with a mouse; falls back to closestCenter so the
// keyboard sensor (which has no pointer) still resolves a target.
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length) return pointer;
  const rect = rectIntersection(args);
  if (rect.length) return rect;
  return closestCenter(args);
};

type DragData =
  | { type: 'section'; sectionId: string; containerId: string; index: number; title: string }
  | { type: 'container'; containerId: string; collectionId: string; index: number; title: string }
  | { type: 'collectiontab'; collectionId: string };

/** Compact drag preview rendered in the overlay — just the title, like prod. */
function DragPreview({ data }: { data: DragData }) {
  if (data.type === 'collectiontab') return null;
  return (
    <div className="max-w-[240px] truncate rounded-lg border-2 border-blue-400 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-xl">
      {data.title || 'Untitled'}
    </div>
  );
}

function ContainerPage() {
  const params = useParams({ strict: false });
  const collectionId = params.collectionId as string;
  const containerId = (params.containerId as string | undefined) ?? null;

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: containers, isPending } = useContainers(collectionId);
  const updateContainer = useUpdateContainer();

  const reorderSections = useReorderSections();
  const moveSection = useMoveSectionToContainer();
  const reorderContainers = useReorderContainers();
  const moveContainer = useMoveContainerToCollection();

  // The in-flight drag, used for the overlay preview + lighting up eligible targets.
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const activeType =
    activeDrag?.type === 'section'
      ? 'section'
      : activeDrag?.type === 'container'
        ? 'container'
        : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // No container selected → jump to the first one once containers are known.
  useEffect(() => {
    if (!containerId && containers && containers.length > 0) {
      navigate({
        to: '/app/collections/$collectionId/containers/$containerId',
        params: { collectionId, containerId: containers[0].id },
        replace: true
      });
    }
  }, [containerId, containers, collectionId, navigate]);

  const selected = containers?.find((c) => c.id === containerId) ?? null;

  /** Drop a section on a collection tab → move it to that collection's top note. */
  async function moveSectionToCollectionTop(
    sectionId: string,
    fromContainerId: string,
    toCollectionId: string
  ) {
    let list = qc.getQueryData<NoteContainer[]>(queryKeys.containers(toCollectionId));
    if (!list) {
      list = await NoteService.getNoteContainers(toCollectionId);
      qc.setQueryData(queryKeys.containers(toCollectionId), list);
    }
    const top = sortBySequence(list ?? [])[0];
    if (!top) {
      showToast('That collection has no notes to drop into');
      return;
    }
    if (top.id === fromContainerId) return;
    moveSection.mutate({ sectionId, fromContainerId, toContainerId: top.id });
    showToast('Section moved to collection');
  }

  function onDragStart(e: DragStartEvent) {
    setActiveDrag((e.active.data.current as DragData | undefined) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const a = active.data.current as DragData | undefined;
    const o = over.data.current as DragData | undefined;
    if (!a || !o) return;

    if (a.type === 'section') {
      if (o.type === 'section') {
        if (a.containerId === o.containerId && a.index !== o.index) {
          reorderSections.mutate({
            containerId: a.containerId,
            fromIndex: a.index,
            toIndex: o.index
          });
        }
      } else if (o.type === 'container') {
        if (a.containerId !== o.containerId) {
          moveSection.mutate({
            sectionId: a.sectionId,
            fromContainerId: a.containerId,
            toContainerId: o.containerId
          });
          showToast('Section moved');
        }
      } else if (o.type === 'collectiontab') {
        void moveSectionToCollectionTop(a.sectionId, a.containerId, o.collectionId);
      }
    } else if (a.type === 'container') {
      if (o.type === 'container') {
        if (a.collectionId === o.collectionId && a.index !== o.index) {
          reorderContainers.mutate({
            collectionId: a.collectionId,
            fromIndex: a.index,
            toIndex: o.index
          });
        }
      } else if (o.type === 'collectiontab') {
        if (o.collectionId !== a.collectionId) {
          moveContainer.mutate({
            containerId: a.containerId,
            fromCollectionId: a.collectionId,
            toCollectionId: o.collectionId
          });
          showToast('Note moved to collection');
        }
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <AppHeader>
          <span className="text-slate-300">/</span>
          <CollectionTabs currentCollectionId={collectionId} activeType={activeType} />
        </AppHeader>

        <div className="flex flex-1">
          <ContainerSidebar
            collectionId={collectionId}
            containers={containers ?? []}
            selectedContainerId={containerId}
            activeType={activeType}
          />

          <main className="flex-1 overflow-y-auto p-6">
            {isPending ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : !containers || containers.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-400">
                No notes in this collection yet — create one from the sidebar.
              </div>
            ) : selected ? (
              <>
                <InlineEditableTitle
                  value={selected.title}
                  onSave={(title) =>
                    updateContainer.mutate({ id: selected.id, collectionId, updates: { title } })
                  }
                  className="mb-4 block text-xl font-semibold"
                  inputClassName="mb-4 w-full max-w-lg rounded border border-blue-300 px-1 text-xl font-semibold focus:outline-none"
                />
                <SectionGrid collectionId={collectionId} containerId={selected.id} />
              </>
            ) : (
              <p className="text-sm text-slate-400">Select a note…</p>
            )}
          </main>
        </div>
      </div>

      {/* Compact title-only preview; no drop animation. Section cards are grabbed
          anywhere so we center the preview on the cursor; sidebar notes are grabbed by
          the left-edge handle, where centering would push the preview off-screen, so
          they keep the default top-left anchoring. */}
      <DragOverlay
        dropAnimation={null}
        modifiers={activeDrag?.type === 'section' ? [snapCenterToCursor] : undefined}
      >
        {activeDrag ? <DragPreview data={activeDrag} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
