// src/lib/services/noteService.ts
import { supabase } from '$lib/supabase';
import type { NoteContainer, CreateNoteContainer } from '$lib/types';

export class NoteService {
  // Get all note containers for current user, optionally filtered by collection
  static async getNoteContainers(collectionId?: string): Promise<NoteContainer[]> {
    let query = supabase
      .from('note_container')
      .select(`
        *,
        collections (
          id,
          name,
          color
        )
      `)
      .order('updated_at', { ascending: false });

    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }

    const { data, error } = await query;
    console.log('getNoteContainers Query result:', data); // Add this

    if (error) {
      console.error('Error loading note containers:', error);
      throw error;
    }

    return data || [];
  }

  // Create a new note container
  static async createNoteContainer(
    container: CreateNoteContainer, 
    collectionId?: string
  ): Promise<NoteContainer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const newContainer = {
      ...container,
      user_id: user.id,
      collection_id: collectionId || null
    };

    const { data, error } = await supabase
      .from('note_container')
      .insert(newContainer)
      .select(`
        *,
        collections (
          id,
          name,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Error creating note container:', error);
      throw error;
    }

    return data;
  }

  // Update note container
  static async updateNoteContainer(
    id: string, 
    updates: Partial<CreateNoteContainer>
  ): Promise<NoteContainer> {
    const { data, error } = await supabase
      .from('note_container')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        collections (
          id,
          name,
          color
        )
      `)
      .single();

    if (error) {
      console.error('Error updating note container:', error);
      throw error;
    }

    return data;
  }

  // Delete note container (cascade will delete sections)
  static async deleteNoteContainer(id: string): Promise<void> {
    const { error } = await supabase
      .from('note_container')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note container:', error);
      throw error;
    }
  }

  // Move note container to different collection
  static async moveToCollection(noteId: string, collectionId: string | null): Promise<void> {
    const { error } = await supabase
      .from('note_container')
      .update({ 
        collection_id: collectionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId);

    if (error) {
      console.error('Error moving note to collection:', error);
      throw error;
    }
  }
}