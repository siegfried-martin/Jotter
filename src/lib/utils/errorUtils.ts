// src/lib/utils/errorUtils.ts
// Utility functions for parsing and handling database errors

import { DB_ERROR_PATTERNS, ERROR_MESSAGES } from '$lib/constants';

export interface ParsedError {
  message: string;
  type: 'limit' | 'validation' | 'network' | 'unknown';
  isUserFacing: boolean;
}

/**
 * Parse a database or API error into a user-friendly message
 */
export function parseError(error: unknown): ParsedError {
  const errorMessage = getErrorMessage(error);

  // Check for collection limit
  if (DB_ERROR_PATTERNS.COLLECTION_LIMIT.test(errorMessage)) {
    return {
      message: ERROR_MESSAGES.COLLECTION_LIMIT,
      type: 'limit',
      isUserFacing: true,
    };
  }

  // Check for container limit
  if (DB_ERROR_PATTERNS.CONTAINER_LIMIT.test(errorMessage)) {
    return {
      message: ERROR_MESSAGES.CONTAINER_LIMIT,
      type: 'limit',
      isUserFacing: true,
    };
  }

  // Check for section limit
  if (DB_ERROR_PATTERNS.SECTION_LIMIT.test(errorMessage)) {
    return {
      message: ERROR_MESSAGES.SECTION_LIMIT,
      type: 'limit',
      isUserFacing: true,
    };
  }

  // Check for field length errors
  if (DB_ERROR_PATTERNS.NAME_TOO_LONG.test(errorMessage) ||
      DB_ERROR_PATTERNS.CHECK_CONSTRAINT.test(errorMessage)) {
    return {
      message: ERROR_MESSAGES.FIELD_TOO_LONG,
      type: 'validation',
      isUserFacing: true,
    };
  }

  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      type: 'network',
      isUserFacing: true,
    };
  }

  // Generic fallback
  return {
    message: ERROR_MESSAGES.GENERIC_SAVE_ERROR,
    type: 'unknown',
    isUserFacing: true,
  };
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    // Supabase error format
    const supabaseError = error as { message?: string; error_description?: string; details?: string };
    return supabaseError.message || supabaseError.error_description || supabaseError.details || String(error);
  }

  return String(error);
}

/**
 * Check if an error is a limit-related error
 */
export function isLimitError(error: unknown): boolean {
  const errorMessage = getErrorMessage(error);
  return DB_ERROR_PATTERNS.COLLECTION_LIMIT.test(errorMessage) ||
         DB_ERROR_PATTERNS.CONTAINER_LIMIT.test(errorMessage) ||
         DB_ERROR_PATTERNS.SECTION_LIMIT.test(errorMessage);
}
