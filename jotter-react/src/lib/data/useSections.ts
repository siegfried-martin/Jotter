import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SectionService } from '@/lib/services/sectionService';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
import { sortBySequence } from '@/lib/utils/sequenceUtils';
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
    mutationFn: ({ id, updates }: { id: string; containerId: string; updates: SectionUpdates }) =>
      SectionService.updateSection(id, updates),
    onMutate: async ({ id, containerId, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sections(containerId) });
      const prev = qc.getQueryData<NoteSection[]>(queryKeys.sections(containerId));
      qc.setQueryData<NoteSection[]>(queryKeys.sections(containerId), (old) =>
        old?.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      return { prev };
    },
    onError: (_err, { containerId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.sections(containerId), ctx.prev);
    },
    onSuccess: (updated, { containerId }) => {
      qc.setQueryData<NoteSection[]>(queryKeys.sections(containerId), (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s))
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
      qc.setQueryData<NoteSection[]>(queryKeys.sections(containerId), (old) =>
        old?.filter((s) => s.id !== id)
      );
      return { prev };
    },
    onError: (_err, { containerId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.sections(containerId), ctx.prev);
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
    },
    onSettled: (_data, _err, { toContainerId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.sections(toContainerId) });
    }
  });
}
