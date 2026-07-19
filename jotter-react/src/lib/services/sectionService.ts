// src/lib/services/sectionService.ts
import { supabase, getAuthenticatedUser } from '@/lib/supabase';
import type { NoteSection, CreateNoteSection, ChecklistItem } from '@/lib/types';
import {
  getNextNoteSectionSequence,
  updateNoteSectionSequences
} from '@/lib/services/sequenceService';
import { calculateReorderSequences } from '@/lib/utils/sequenceUtils';
import { isDemoMode } from '@/lib/demo/demoMode';
import { DemoSectionService } from '@/lib/services/localStorage/demoStorageService';
import { EventLogService } from '@/lib/services/eventLogService';

export class SectionService {
  // Get all sections for a note container - ALREADY ORDERED BY SEQUENCE
  static async getSections(noteContainerId: string): Promise<NoteSection[]> {
    if (isDemoMode()) {
      return DemoSectionService.getSections(noteContainerId);
    }

    const { data, error } = await supabase
      .from('note_section')
      .select('*')
      .eq('note_container_id', noteContainerId)
      .order('sequence');

    if (error) {
      console.error('Error loading sections:', error);
      throw error;
    }

    return data || [];
  }

  // Create a new section - NOW WITH ENHANCED SEQUENCE SUPPORT
  static async createSection(section: CreateNoteSection): Promise<NoteSection> {
    if (isDemoMode()) {
      return DemoSectionService.createSection(section);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get next sequence if not provided. Unparented ("quick jot") sections have no
    // container to scope a sequence to, so they default to 0 (the recent list orders
    // by updated_at, not sequence).
    const sequence =
      section.sequence ??
      (section.note_container_id ? await getNextNoteSectionSequence(section.note_container_id) : 0);

    const newSection = {
      ...section,
      user_id: user.id,
      sequence // Ensure sequence is set
    };

    const { data, error } = await supabase
      .from('note_section')
      .insert(newSection)
      .select()
      .single();

    if (error) {
      console.error('Error creating section:', error);
      throw error;
    }

    // Log event
    const language =
      section.meta && typeof section.meta === 'object' && 'language' in section.meta
        ? String(section.meta.language)
        : undefined;
    EventLogService.logSectionCreated(
      data.id,
      section.note_container_id ?? '',
      section.type,
      language
    );

    return data;
  }

  /** Recently-updated sections the user can access (own + shared-with-them) — home feed. */
  static async getRecentSections(limit = 30): Promise<NoteSection[]> {
    if (isDemoMode()) return [];

    // RPC scopes by membership (section_member or collection membership); SELECT is
    // public now, so a plain query can't scope "my data" any more.
    const { data, error } = await supabase.rpc('get_recent_sections', { p_limit: limit });
    if (error) {
      console.error('Error loading recent sections:', error);
      throw error;
    }
    return (data as NoteSection[]) ?? [];
  }

  /** Keyword search over sections the user can access — same membership scoping as the
   *  recent feed. Matches title (all types) plus content for the plain-text types;
   *  structured/JSON types match on title only (see migration 0013). */
  static async searchSections(query: string, limit = 20): Promise<NoteSection[]> {
    if (isDemoMode()) return [];

    const { data, error } = await supabase.rpc('search_sections', {
      p_query: query,
      p_limit: limit
    });
    if (error) {
      console.error('Error searching sections:', error);
      throw error;
    }
    return (data as NoteSection[]) ?? [];
  }

  /** Opening a section you can't already access joins you to it (it becomes unfiled for
   *  you). No-op if you already have access. Returns true if you were newly added. */
  static async openSharedSection(sectionId: string): Promise<boolean> {
    if (isDemoMode()) return false;
    const { data, error } = await supabase.rpc('open_shared_section', { p_section_id: sectionId });
    if (error) {
      console.error('Error joining shared section:', error);
      return false;
    }
    return Boolean(data);
  }

  // Update section content - NOW SUPPORTS SEQUENCE UPDATES
  static async updateSection(
    id: string,
    updates: Partial<CreateNoteSection> & { sequence?: number }
  ): Promise<NoteSection> {
    if (isDemoMode()) {
      return DemoSectionService.updateSection(id, updates);
    }

    // Check if this is a content update (not just sequence reorder)
    const isContentUpdate = updates.content !== undefined || updates.title !== undefined;

    console.log('Updating section:', id, updates);
    const { data, error } = await supabase
      .from('note_section')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating section:', error);
      throw error;
    }

    // Also update the parent container's timestamp
    if (data.note_container_id) {
      await supabase
        .from('note_container')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.note_container_id);
    }

    // Log event if content was updated
    if (isContentUpdate) {
      const contentLength = data.content?.length ?? 0;
      EventLogService.logSectionUpdated(id, data.type, contentLength);
    }

    return data;
  }

  // Update checklist item with enhanced debugging
  static async updateChecklistItem(
    sectionId: string,
    lineIndex: number,
    checked: boolean,
    checklistData: ChecklistItem[]
  ): Promise<void> {
    if (isDemoMode()) {
      return DemoSectionService.updateChecklistItem(sectionId, lineIndex, checked, checklistData);
    }

    if (checklistData[lineIndex]) {
      checklistData[lineIndex].checked = checked;

      const { error } = await supabase
        .from('note_section')
        .update({
          checklist_data: checklistData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId);

      if (error) {
        console.error('Error updating checklist item:', error);
        throw error;
      }
    }
  }

  // Delete section
  static async deleteSection(id: string): Promise<void> {
    if (isDemoMode()) {
      return DemoSectionService.deleteSection(id);
    }

    // "Delete" respects shared ownership: a contributor deletes the shared section; a
    // direct share is merely dismissed (membership removed), GC'd only if orphaned.
    const { error } = await supabase.rpc('leave_section', { p_section_id: id });
    if (error) {
      console.error('Error leaving/deleting section:', error);
      throw error;
    }
  }

  // Get single section (for edit page)
  static async getSection(id: string): Promise<NoteSection | null> {
    if (isDemoMode()) {
      return DemoSectionService.getSection(id);
    }

    const { data, error } = await supabase.from('note_section').select('*').eq('id', id).single();

    if (error) {
      console.error('Error loading section:', error);
      return null;
    }

    return data;
  }

  // NEW: Reorder sections within a note container via drag & drop
  static async reorderSections(
    noteContainerId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<NoteSection[]> {
    if (isDemoMode()) {
      return DemoSectionService.reorderSections(noteContainerId, fromIndex, toIndex);
    }

    // Get current sections for this note container
    const sections = await this.getSections(noteContainerId);

    // Calculate sequence updates
    const updates = calculateReorderSequences(sections, fromIndex, toIndex);

    // Apply updates to database
    const success = await updateNoteSectionSequences(updates);

    if (!success) {
      throw new Error('Failed to update section sequences');
    }

    // Return updated sections
    return await this.getSections(noteContainerId);
  }

  // NEW: Move section to specific position within note container
  static async moveSectionToPosition(
    noteContainerId: string,
    sectionId: string,
    newPosition: number
  ): Promise<NoteSection[]> {
    const sections = await this.getSections(noteContainerId);
    const currentIndex = sections.findIndex((s) => s.id === sectionId);

    if (currentIndex === -1) {
      throw new Error('Section not found');
    }

    return await this.reorderSections(noteContainerId, currentIndex, newPosition);
  }

  // NEW: Insert section at specific position
  static async insertSectionAtPosition(
    noteContainerId: string,
    section: Omit<CreateNoteSection, 'note_container_id' | 'sequence'>,
    position: number
  ): Promise<NoteSection> {
    const sections = await this.getSections(noteContainerId);

    // Calculate sequence for insertion at specific position
    let sequence: number;
    if (position === 0) {
      // Insert at beginning
      sequence = sections.length > 0 ? Math.max(1, sections[0].sequence - 10) : 10;
    } else if (position >= sections.length) {
      // Insert at end
      sequence = sections.length > 0 ? sections[sections.length - 1].sequence + 10 : 10;
    } else {
      // Insert in middle
      const prevSequence = sections[position - 1].sequence;
      const nextSequence = sections[position].sequence;
      sequence = Math.floor((prevSequence + nextSequence) / 2);
    }

    return await this.createSection({
      ...section,
      note_container_id: noteContainerId,
      sequence
    });
  }

  static async updateSectionTitle(id: string, title: string | null): Promise<NoteSection> {
    if (isDemoMode()) {
      return DemoSectionService.updateSectionTitle(id, title);
    }

    const { data, error } = await supabase
      .from('note_section')
      .update({
        title: title,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating section title:', error);
      throw error;
    }

    // Also update the parent container's timestamp
    if (data.note_container_id) {
      await supabase
        .from('note_container')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.note_container_id);
    }

    return data;
  }

  static async moveSectionToContainer(
    sectionId: string,
    newContainerId: string
  ): Promise<NoteSection> {
    if (isDemoMode()) {
      return DemoSectionService.moveSectionToContainer(sectionId, newContainerId);
    }

    // Get original container for logging
    const section = await this.getSection(sectionId);
    const fromContainerId = section?.note_container_id ?? 'unknown';

    const { data, error } = await supabase
      .from('note_section')
      .update({
        note_container_id: newContainerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId)
      .select()
      .single();

    if (error) {
      console.error('Error moving section to container:', error);
      throw error;
    }

    // Update both container timestamps
    const now = new Date().toISOString();

    // Update the new container timestamp
    await supabase.from('note_container').update({ updated_at: now }).eq('id', newContainerId);

    // Log event
    EventLogService.logSectionMoved(sectionId, fromContainerId, newContainerId);

    return data;
  }
}
