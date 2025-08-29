// src/lib/services/sectionService.ts
import { supabase } from '$lib/supabase';
import type { NoteSection, CreateNoteSection, ChecklistItem, SequenceUpdate } from '$lib/types';
import { getNextNoteSectionSequence, updateNoteSectionSequences } from './sequenceService';
import { calculateReorderSequences } from '$lib/utils/sequenceUtils';

export class SectionService {
  // Get all sections for a note container - ALREADY ORDERED BY SEQUENCE
  static async getSections(noteContainerId: string): Promise<NoteSection[]> {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next sequence if not provided
    const sequence = section.sequence ?? await getNextNoteSectionSequence(section.note_container_id);

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

    return data;
  }

  // Update section content - NOW SUPPORTS SEQUENCE UPDATES
  static async updateSection(
    id: string, 
    updates: Partial<CreateNoteSection> & { sequence?: number }
  ): Promise<NoteSection> {
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

    return data;
  }

  // Update checklist item
  // Update checklist item with enhanced debugging
static async updateChecklistItem(
    sectionId: string,
    lineIndex: number,
    checked: boolean,
    checklistData: ChecklistItem[]
  ): Promise<void> {
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
    const { error } = await supabase
      .from('note_section')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting section:', error);
      throw error;
    }
  }

  // Get single section (for edit page)
  static async getSection(id: string): Promise<NoteSection | null> {
    const { data, error } = await supabase
      .from('note_section')
      .select('*')
      .eq('id', id)
      .single();

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
    const currentIndex = sections.findIndex(s => s.id === sectionId);
    
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

  static async updateSectionTitle(
    id: string, 
    title: string | null
  ): Promise<NoteSection> {
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
    await supabase
      .from('note_container')
      .update({ updated_at: now })
      .eq('id', newContainerId);

    // Update the old container timestamp (if we can determine it)
    // Note: We could track the old container if needed for more precise updates

    return data;
  }

  
}