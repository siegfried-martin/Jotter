// Central query-key factory for the TanStack Query cache-as-database.
// Keys mirror the data hierarchy so invalidation/preload stay predictable.

export const queryKeys = {
  collections: () => ['collections'] as const,
  collection: (id: string) => ['collection', id] as const,
  containers: (collectionId: string) => ['containers', collectionId] as const,
  containerById: (containerId: string) => ['containerById', containerId] as const,
  sections: (containerId: string) => ['sections', containerId] as const,
  section: (sectionId: string) => ['section', sectionId] as const,
  recentSections: () => ['recentSections'] as const,
  searchSections: (query: string) => ['searchSections', query] as const,
  userPreferences: () => ['userPreferences'] as const
};
