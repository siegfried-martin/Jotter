// src/lib/utils/sectionTitleUtils.ts
import type { NoteSection } from '$lib/types';

/**
 * Get the display title for a section
 * Returns custom title if set, otherwise falls back to section type
 */
export function getSectionDisplayTitle(section: NoteSection): string {
  if (section.title && section.title.trim() !== '') {
    return section.title;
  }
  
  // Fallback to section type with proper capitalization
  return getSectionTypeDisplayName(section.type);
}

/**
 * Get the default display name for a section type
 */
export function getSectionTypeDisplayName(type: NoteSection['type']): string {
  const typeNames = {
    checklist: 'Checklist',
    code: 'Code',
    wysiwyg: 'Text',
    diagram: 'Diagram'
  };
  
  return typeNames[type] || 'Section';
}

/**
 * Get the default title for a new section
 * For new sections, we default to the section type name
 */
export function getDefaultSectionTitle(type: NoteSection['type']): string {
  return getSectionTypeDisplayName(type);
}

/**
 * Check if a section has a custom title (not just the default type name)
 */
export function hasCustomTitle(section: NoteSection): boolean {
  return !!(section.title && section.title.trim() !== '' && 
           section.title !== getSectionTypeDisplayName(section.type));
}