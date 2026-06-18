// Ported from the Svelte app. Application limits — must match the DB constraints/triggers.

export const LIMITS = {
  MAX_COLLECTIONS_PER_USER: 12,
  MAX_CONTAINERS_PER_COLLECTION: 100,
  MAX_SECTIONS_PER_CONTAINER: 50,

  COLLECTION_NAME_MAX_LENGTH: 100,
  COLLECTION_DESCRIPTION_MAX_LENGTH: 500,
  CONTAINER_TITLE_MAX_LENGTH: 200,
  SECTION_TITLE_MAX_LENGTH: 200,
  SECTION_CONTENT_MAX_LENGTH: 1000000,
  CHECKLIST_DATA_MAX_LENGTH: 500000,
  META_MAX_LENGTH: 50000
} as const;

export const DEFAULT_COLLECTION_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#84CC16',
  '#EC4899',
  '#6B7280'
] as const;

export const ERROR_MESSAGES = {
  COLLECTION_LIMIT:
    "You've reached the maximum of 12 collections. Please delete an existing collection to create a new one.",
  CONTAINER_LIMIT: 'This collection has reached the maximum of 100 containers.',
  SECTION_LIMIT: 'This container has reached the maximum of 50 sections.',
  FIELD_TOO_LONG: 'The text you entered is too long. Please shorten it and try again.',
  GENERIC_SAVE_ERROR: 'Failed to save. Please try again.',
  GENERIC_LOAD_ERROR: 'Failed to load data. Please try again.'
} as const;
