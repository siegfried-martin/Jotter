import type { QueryClient } from '@tanstack/react-query';
import { CollectionService } from '@/lib/services/collectionService';
import { NoteService } from '@/lib/services/noteService';
import { SectionService } from '@/lib/services/sectionService';
import { queryKeys } from './queryKeys';

const PRELOAD_CONTAINERS_PER_COLLECTION = 10;

/**
 * Warm the cache on app start — mirrors the Svelte AppDataManager preload:
 * all collections + the first 10 containers per collection + those containers'
 * sections. After this resolves, the corresponding `useQuery` reads are instant
 * (the QueryClient is configured cache-as-database, so nothing refetches).
 *
 * Best-effort: a failure in one collection's preload doesn't abort the rest.
 */
export async function preloadAppData(qc: QueryClient): Promise<void> {
  const collections = await qc.fetchQuery({
    queryKey: queryKeys.collections(),
    queryFn: () => CollectionService.getCollections()
  });

  // Seed per-collection caches so useCollection(id) is instant too.
  for (const collection of collections) {
    qc.setQueryData(queryKeys.collection(collection.id), collection);
  }

  await Promise.all(
    collections.map(async (collection) => {
      try {
        const containers = await qc.fetchQuery({
          queryKey: queryKeys.containers(collection.id),
          queryFn: () => NoteService.getNoteContainers(collection.id)
        });

        const firstContainers = containers.slice(0, PRELOAD_CONTAINERS_PER_COLLECTION);
        await Promise.all(
          firstContainers.map((container) =>
            qc
              .fetchQuery({
                queryKey: queryKeys.sections(container.id),
                queryFn: () => SectionService.getSections(container.id)
              })
              .catch((err) => {
                console.warn(`⚠️ Preload sections failed for container ${container.id}:`, err);
              })
          )
        );
      } catch (err) {
        console.warn(`⚠️ Preload containers failed for collection ${collection.name}:`, err);
      }
    })
  );
}
