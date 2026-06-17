import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NoteService } from '@/lib/services/noteService';
import type { CreateNoteContainer, NoteContainer } from '@/lib/types';
import { sortBySequence } from '@/lib/utils/sequenceUtils';
import { queryKeys } from './queryKeys';

type ContainerUpdates = Partial<CreateNoteContainer> & { sequence?: number };

/** Containers for a collection (sidebar tabs). */
export function useContainers(collectionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.containers(collectionId ?? ''),
    queryFn: () => NoteService.getNoteContainers(collectionId as string),
    enabled: !!collectionId
  });
}

export function useCreateContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, title }: { collectionId: string; title?: string }) =>
      NoteService.createSimpleNoteContainer(collectionId, title ?? 'Untitled Note'),
    onSuccess: (created, { collectionId }) => {
      qc.setQueryData<NoteContainer[]>(queryKeys.containers(collectionId), (old) =>
        sortBySequence(old ? [...old, created] : [created])
      );
    }
  });
}

export function useUpdateContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates
    }: {
      id: string;
      collectionId: string;
      updates: ContainerUpdates;
    }) => NoteService.updateNoteContainer(id, updates),
    onMutate: async ({ id, collectionId, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.containers(collectionId) });
      const prev = qc.getQueryData<NoteContainer[]>(queryKeys.containers(collectionId));
      qc.setQueryData<NoteContainer[]>(queryKeys.containers(collectionId), (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      return { prev };
    },
    onError: (_err, { collectionId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.containers(collectionId), ctx.prev);
    },
    onSuccess: (updated, { collectionId }) => {
      qc.setQueryData<NoteContainer[]>(queryKeys.containers(collectionId), (old) =>
        old?.map((c) => (c.id === updated.id ? updated : c))
      );
    }
  });
}

export function useDeleteContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; collectionId: string }) =>
      NoteService.deleteNoteContainer(id),
    onMutate: async ({ id, collectionId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.containers(collectionId) });
      const prev = qc.getQueryData<NoteContainer[]>(queryKeys.containers(collectionId));
      qc.setQueryData<NoteContainer[]>(queryKeys.containers(collectionId), (old) =>
        old?.filter((c) => c.id !== id)
      );
      return { prev };
    },
    onError: (_err, { collectionId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.containers(collectionId), ctx.prev);
    },
    onSettled: (_data, _err, { id }) => {
      qc.removeQueries({ queryKey: queryKeys.sections(id) }); // sections cascade-deleted server-side
    }
  });
}

export function useReorderContainers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      collectionId,
      fromIndex,
      toIndex
    }: {
      collectionId: string;
      fromIndex: number;
      toIndex: number;
    }) => NoteService.reorderNoteContainers(collectionId, fromIndex, toIndex),
    onSuccess: (containers, { collectionId }) => {
      qc.setQueryData(queryKeys.containers(collectionId), containers);
    }
  });
}
