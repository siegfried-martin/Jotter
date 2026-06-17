import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SectionService } from '@/lib/services/sectionService';
import type { CreateNoteSection, NoteSection } from '@/lib/types';
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

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteSection) => SectionService.createSection(input),
    onSuccess: (created) => {
      qc.setQueryData<NoteSection[]>(queryKeys.sections(created.note_container_id ?? ''), (old) =>
        old ? [...old, created] : [created]
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
    onSuccess: (sections, { containerId }) => {
      qc.setQueryData(queryKeys.sections(containerId), sections);
    }
  });
}
