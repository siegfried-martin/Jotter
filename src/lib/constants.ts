// src/lib/constants.ts
// Application limits - must match database constraints

export const LIMITS = {
  // Row count limits
  MAX_COLLECTIONS_PER_USER: 12,
  MAX_CONTAINERS_PER_COLLECTION: 100,
  MAX_SECTIONS_PER_CONTAINER: 50,

  // Field length limits
  COLLECTION_NAME_MAX_LENGTH: 100,
  COLLECTION_DESCRIPTION_MAX_LENGTH: 500,
  CONTAINER_TITLE_MAX_LENGTH: 200,
  SECTION_TITLE_MAX_LENGTH: 200,
  SECTION_CONTENT_MAX_LENGTH: 1000000, // ~1MB
  CHECKLIST_DATA_MAX_LENGTH: 500000, // ~500KB
  META_MAX_LENGTH: 50000, // ~50KB
} as const;

// Error message patterns from database constraints
export const DB_ERROR_PATTERNS = {
  COLLECTION_LIMIT: /Maximum of 12 collections per user/i,
  CONTAINER_LIMIT: /Maximum of 100 containers per collection/i,
  SECTION_LIMIT: /Maximum of 50 sections per container/i,
  NAME_TOO_LONG: /value too long for type character varying/i,
  CHECK_CONSTRAINT: /violates check constraint/i,
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  COLLECTION_LIMIT: 'You\'ve reached the maximum of 12 collections. Please delete an existing collection to create a new one.',
  CONTAINER_LIMIT: 'This collection has reached the maximum of 100 containers.',
  SECTION_LIMIT: 'This container has reached the maximum of 50 sections.',
  FIELD_TOO_LONG: 'The text you entered is too long. Please shorten it and try again.',
  GENERIC_SAVE_ERROR: 'Failed to save. Please try again.',
  GENERIC_LOAD_ERROR: 'Failed to load data. Please try again.',
} as const;
