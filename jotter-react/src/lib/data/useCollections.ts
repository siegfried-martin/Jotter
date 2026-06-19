import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CollectionService } from '@/lib/services/collectionService';
import type { Collection, CreateCollection } from '@/lib/types';
import { sortBySequence } from '@/lib/utils/sequenceUtils';
import { queryKeys } from './queryKeys';

type CollectionUpdates = Partial<CreateCollection> & { sequence?: number };

/** All collections for the current user (cache-as-database; instant after preload). */
export function useCollections() {
  return useQuery({
    queryKey: queryKeys.collections(),
    queryFn: () => CollectionService.getCollections()
  });
}

/** A single collection by id. */
export function useCollection(collectionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.collection(collectionId ?? ''),
    queryFn: () => CollectionService.getCollection(collectionId as string),
    enabled: !!collectionId
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCollection) => CollectionService.createCollection(input),
    onSuccess: (created) => {
      qc.setQueryData<Collection[]>(queryKeys.collections(), (old) =>
        sortBySequence(old ? [...old, created] : [created])
      );
      qc.setQueryData(queryKeys.collection(created.id), created);
    }
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CollectionUpdates }) =>
      CollectionService.updateCollection(id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.collections() });
      const prevList = qc.getQueryData<Collection[]>(queryKeys.collections());
      const prevOne = qc.getQueryData<Collection>(queryKeys.collection(id));
      qc.setQueryData<Collection[]>(queryKeys.collections(), (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      qc.setQueryData<Collection>(queryKeys.collection(id), (old) =>
        old ? { ...old, ...updates } : old
      );
      return { prevList, prevOne };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prevList) qc.setQueryData(queryKeys.collections(), ctx.prevList);
      if (ctx?.prevOne) qc.setQueryData(queryKeys.collection(id), ctx.prevOne);
    },
    onSuccess: (updated) => {
      qc.setQueryData<Collection[]>(queryKeys.collections(), (old) =>
        old?.map((c) => (c.id === updated.id ? updated : c))
      );
      qc.setQueryData(queryKeys.collection(updated.id), updated);
    }
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CollectionService.deleteCollection(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.collections() });
      const prevList = qc.getQueryData<Collection[]>(queryKeys.collections());
      qc.setQueryData<Collection[]>(queryKeys.collections(), (old) =>
        old?.filter((c) => c.id !== id)
      );
      return { prevList };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevList) qc.setQueryData(queryKeys.collections(), ctx.prevList);
    },
    onSettled: () => {
      // Deletion reassigns containers to the default collection server-side, so refresh both.
      qc.invalidateQueries({ queryKey: queryKeys.collections() });
      qc.invalidateQueries({ queryKey: ['containers'] });
    }
  });
}

export function useReorderCollections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) =>
      CollectionService.reorderCollections(fromIndex, toIndex),
    onSuccess: (collections) => {
      qc.setQueryData(queryKeys.collections(), collections);
    }
  });
}
