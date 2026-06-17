// Central query-key factory for the TanStack Query cache-as-database.
// Keys mirror the data hierarchy so invalidation/preload stay predictable.

export const queryKeys = {
  collections: () => ['collections'] as const,
  collection: (id: string) => ['collection', id] as const,
  containers: (collectionId: string) => ['containers', collectionId] as const,
  sections: (containerId: string) => ['sections', containerId] as const,
  userPreferences: () => ['userPreferences'] as const
};
