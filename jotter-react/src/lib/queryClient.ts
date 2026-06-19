import { QueryClient } from '@tanstack/react-query';

/**
 * Cache-as-database QueryClient.
 *
 * Jotter's #1 product principle is "speed above all": reads are instant and
 * synchronous, with no loading spinners. To make TanStack Query behave like the
 * Svelte app's `AppDataManager` cache rather than a refetch-on-everything server
 * cache, we disable automatic staleness/refetching and treat the cache as the
 * source of truth. Freshness is controlled explicitly via invalidation and
 * optimistic `setQueryData` updates.
 *
 * See docs/initiatives/react-migration.md → "Cache primitive".
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // cache never goes stale on its own
      gcTime: 1000 * 60 * 60 * 24, // keep cached data for a day
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1
    },
    mutations: {
      retry: 0
    }
  }
});
