// src/lib/services/sectionService.ts
import { supabase } from '$lib/supabase';
import type { NoteSection, CreateNoteSection, ChecklistItem } from '$lib/types';

export class SectionService {
  // Get all sections for a note container
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

  // Create a new section
  static async createSection(section: CreateNoteSection): Promise<NoteSection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const newSection = {
      ...section,
      user_id: user.id
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

  // Update section content
  static async updateSection(
    id: string, 
    updates: Partial<CreateNoteSection>
  ): Promise<NoteSection> {
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
}