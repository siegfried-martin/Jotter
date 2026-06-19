import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SectionService } from '@/lib/services/sectionService';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
import { sortBySequence } from '@/lib/utils/sequenceUtils';
import { saveUpdate } from '@/lib/offline/sectionSync';
import { showToast } from '@/lib/ui/toast';
import { queryKeys } from './queryKeys';

type SectionUpdates = Partial<CreateNoteSection> & { sequence?: number };

/** Sections for a container. */
export function useSections(containerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.sections(containerId ?? ''),
    queryFn: () => SectionService.getSections(containerId as string),
    enabled: !!containerId
  });
}

/** A single section by id — used by the flat editor route for unfiled sections. */
export function useSection(sectionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.section(sectionId ?? ''),
    queryFn: () => SectionService.getSection(sectionId as string),
    enabled: !!sectionId
  });
}

/** Recently-updated sections for the home feed (parented or unfiled). */
export function useRecentSections(limit = 30) {
  return useQuery({
    queryKey: queryKeys.recentSections(),
    queryFn: () => SectionService.getRecentSections(limit)
  });
}

/** Create an unparented "quick jot" section (no container) from the home page. */
export function useCreateUnparentedSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateNoteSection, 'note_container_id' | 'sequence'>) =>
      SectionService.createSection({ ...input, note_container_id: null, sequence: 0 }),
    onSuccess: (created) => {
      qc.setQueryData<NoteSection[]>(queryKeys.recentSections(), (old) =>
        old ? [created, ...old] : [created]
      );
      qc.setQueryData(queryKeys.section(created.id), created);
    }
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteSection) => SectionService.createSection(input),
    onSuccess: (created) => {
      qc.setQueryData<NoteSection[]>(queryKeys.sections(created.note_container_id ?? ''), (old) =>
        sortBySequence(old ? [...old, created] : [created])
      );
    }
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    // networkMode 'always' so the mutationFn runs even offline — TanStack's default would
    // PAUSE it, defeating our durable outbox. saveUpdate decides online-vs-queue itself.
    networkMode: 'always',
    // Offline-aware: parks the write in the durable outbox when there's no connection and
    // resolves to null (the optimistic cache stands; it syncs on reconnect).
    mutationFn: ({ id, updates }: { id: string; containerId: string; updates: SectionUpdates }) =>
      saveUpdate(id, updates),
    onMutate: async ({ id, containerId, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sections(containerId) });
      const prev = qc.getQueryData<NoteSection[]>(queryKeys.sections(containerId));
      const prevSection = qc.getQueryData<NoteSection>(queryKeys.section(id));
      const prevRecent = qc.getQueryData<NoteSection[]>(queryKeys.recentSections());
      // Apply optimistically across every cache that holds this section, with a bumped
      // timestamp so the recent feed reorders — a queued (offline) save looks identical.
      const patch = { ...updates, updated_at: new Date().toISOString() };
      qc.setQueryData<NoteSection[]>(queryKeys.sections(containerId), (old) =>
        old?.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
      qc.setQueryData<NoteSection>(queryKeys.section(id), (old) =>
        old ? { ...old, ...patch } : old
      );
      qc.setQueryData<NoteSection[]>(queryKeys.recentSections(), (old) =>
        old
          ? old
              .map((s) => (s.id === id ? { ...s, ...patch } : s))
              .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
          : old
      );
      return { prev, prevSection, prevRecent };
    },
    onError: (_err, { containerId, id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.sections(containerId), ctx.prev);
      if (ctx?.prevSection) qc.setQueryData(queryKeys.section(id), ctx.prevSection);
      if (ctx?.prevRecent) qc.setQueryData(queryKeys.recentSections(), ctx.prevRecent);
    },
    onSuccess: (updated, { containerId }) => {
      if (!updated) {
        // Queued offline — optimistic state stands; the outbox syncs it on reconnect.
        showToast('Saved offline — will sync when you reconnect');
        return;
      }
      qc.setQueryData<NoteSection[]>(queryKeys.sections(containerId), (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s))
      );
      // Keep the flat-editor (section) + home-feed (recentSections) caches coherent.
      qc.setQueryData(queryKeys.section(updated.id), updated);
      qc.setQueryData<NoteSection[]>(queryKeys.recentSections(), (old) =>
        old
          ? old
              .map((s) => (s.id === updated.id ? updated : s))
              .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
          : old
      );
    }
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; containerId: string }) => SectionService.deleteSection(id),
    onMutate: async ({ id, containerId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sections(containerId) });
      const prev = qc.getQueryData<NoteSection[]>(queryKeys.sections(containerId));
      const prevRecent = qc.getQueryData<NoteSection[]>(queryKeys.recentSections());
      qc.setQueryData<NoteSection[]>(queryKeys.sections(containerId), (old) =>
        old?.filter((s) => s.id !== id)
      );
      qc.setQueryData<NoteSection[]>(queryKeys.recentSections(), (old) =>
        old?.filter((s) => s.id !== id)
      );
      return { prev, prevRecent };
    },
    onError: (_err, { containerId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.sections(containerId), ctx.prev);
      if (ctx?.prevRecent) qc.setQueryData(queryKeys.recentSections(), ctx.prevRecent);
    },
    onSettled: (_data, _err, { id }) => {
      qc.removeQueries({ queryKey: queryKeys.section(id) });
    }
  });
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [m] = next.splice(from, 1);
  next.splice(to, 0, m);
  return next;
}

export function useReorderSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      containerId,
      fromIndex,
      toIndex
    }: {
      containerId: string;
      fromIndex: number;
      toIndex: number;
    }) => SectionService.reorderSections(containerId, fromIndex, toIndex),
    // Optimistic: apply the move immediately so the drop doesn't snap back.
    onMutate: async ({ containerId, fromIndex, toIndex }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sections(containerId) });
      const prev = qc.getQueryData<NoteSection[]>(queryKeys.sections(containerId));
      if (prev)
        qc.setQueryData(queryKeys.sections(containerId), moveItem(prev, fromIndex, toIndex));
      return { prev };
    },
    onError: (_err, { containerId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.sections(containerId), ctx.prev);
    },
    onSuccess: (sections, { containerId }) => {
      qc.setQueryData(queryKeys.sections(containerId), sections);
    }
  });
}

/** Move a section to a different container (drag onto a sidebar note or collection tab). */
export function useMoveSectionToContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      toContainerId
    }: {
      sectionId: string;
      fromContainerId: string;
      toContainerId: string;
    }) => SectionService.moveSectionToContainer(sectionId, toContainerId),
    onMutate: async ({ sectionId, fromContainerId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sections(fromContainerId) });
      const prev = qc.getQueryData<NoteSection[]>(queryKeys.sections(fromContainerId));
      qc.setQueryData<NoteSection[]>(queryKeys.sections(fromContainerId), (old) =>
        old?.filter((s) => s.id !== sectionId)
      );
      return { prev };
    },
    onError: (_err, { fromContainerId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.sections(fromContainerId), ctx.prev);
    },
    onSuccess: (moved, { toContainerId }) => {
      qc.setQueryData<NoteSection[]>(queryKeys.sections(toContainerId), (old) =>
        old ? sortBySequence([...old.filter((s) => s.id !== moved.id), moved]) : old
      );
      // Keep the flat editor + home feed coherent (the section's container changed).
      qc.setQueryData(queryKeys.section(moved.id), moved);
      qc.setQueryData<NoteSection[]>(queryKeys.recentSections(), (old) =>
        old?.map((s) => (s.id === moved.id ? moved : s))
      );
    },
    onSettled: (_data, _err, { toContainerId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.sections(toContainerId) });
    }
  });
}
