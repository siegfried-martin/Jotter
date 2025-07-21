// src/lib/utils/sequenceUtils.ts

import type { SequenceUpdate } from '../types';

// Generic interface for any item with sequence
export interface Sequenced {
  id: string;
  sequence: number;
}

/**
 * Calculate the new sequence value for an item being inserted at a specific position
 */
export function calculateInsertSequence<T extends Sequenced>(
  items: T[],
  insertIndex: number
): number {
  if (items.length === 0) return 1;
  
  // Insert at beginning
  if (insertIndex === 0) {
    return Math.max(1, items[0].sequence - 1);
  }
  
  // Insert at end
  if (insertIndex >= items.length) {
    return items[items.length - 1].sequence + 1;
  }
  
  // Insert in middle - average of surrounding sequences
  const prevSequence = items[insertIndex - 1].sequence;
  const nextSequence = items[insertIndex].sequence;
  return Math.floor((prevSequence + nextSequence) / 2);
}

/**
 * Reorder items and return sequence updates needed
 */
export function calculateReorderSequences<T extends Sequenced>(
  items: T[],
  fromIndex: number,
  toIndex: number
): SequenceUpdate[] {
  if (fromIndex === toIndex) return [];
  
  const reorderedItems = [...items];
  const [movedItem] = reorderedItems.splice(fromIndex, 1);
  reorderedItems.splice(toIndex, 0, movedItem);
  
  // Reassign sequences to maintain order
  const updates: SequenceUpdate[] = [];
  reorderedItems.forEach((item, index) => {
    const newSequence = (index + 1) * 10; // Use increments of 10 for easier future insertions
    if (item.sequence !== newSequence) {
      updates.push({ id: item.id, sequence: newSequence });
    }
  });
  
  return updates;
}

/**
 * Get the next sequence number for appending to a list
 */
export function getNextSequence<T extends Sequenced>(items: T[]): number {
  if (items.length === 0) return 10;
  return Math.max(...items.map(item => item.sequence)) + 10;
}

/**
 * Sort items by sequence (helper function)
 */
export function sortBySequence<T extends Sequenced>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sequence - b.sequence);
}

/**
 * Normalize sequences to clean increments (useful for maintenance)
 */
export function normalizeSequences<T extends Sequenced>(items: T[]): SequenceUpdate[] {
  const sorted = sortBySequence(items);
  const updates: SequenceUpdate[] = [];
  
  sorted.forEach((item, index) => {
    const newSequence = (index + 1) * 10;
    if (item.sequence !== newSequence) {
      updates.push({ id: item.id, sequence: newSequence });
    }
  });
  
  return updates;
}