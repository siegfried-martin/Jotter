// src/lib/services/noteService.ts
import { supabase } from '$lib/supabase';
import type { NoteContainer, CreateNoteContainer, SequenceUpdate } from '$lib/types';
import { getNextNoteContainerSequence, updateNoteContainerSequences } from './sequenceService';
import { calculateReorderSequences } from '$lib/utils/sequenceUtils';

export class NoteService {
  // Get all note containers for current user, optionally filtered by collection - NOW ORDERED BY SEQUENCE
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
      .order('sequence', { ascending: true }); // Changed from updated_at to sequence

    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }

    const { data, error } = await query;
    console.log('getNoteContainers Query result:', data);

    if (error) {
      console.error('Error loading note containers:', error);
      throw error;
    }

    return data || [];
  }

  // Create a new note container - NOW WITH SEQUENCE SUPPORT
  static async createNoteContainer(
    container: CreateNoteContainer, 
    collectionId?: string
  ): Promise<NoteContainer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next sequence if not provided
    const sequence = container.sequence ?? (
      collectionId ? await getNextNoteContainerSequence(collectionId) : 10
    );

    const newContainer = {
      ...container,
      user_id: user.id,
      collection_id: collectionId || null,
      sequence // Add sequence to insert
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

  // Update note container - NOW SUPPORTS SEQUENCE UPDATES
  static async updateNoteContainer(
    id: string, 
    updates: Partial<CreateNoteContainer> & { sequence?: number }
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

    // Update note container title
  static async updateNoteContainerTitle(
    id: string, 
    title: string
  ): Promise<NoteContainer> {
    const { data, error } = await supabase
      .from('note_container')
      .update({
        title: title.trim(),
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
      console.error('Error updating note container title:', error);
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

  // NEW: Reorder note containers within a collection via drag & drop
  static async reorderNoteContainers(
    collectionId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<NoteContainer[]> {
    // Get current note containers for this collection
    const containers = await this.getNoteContainers(collectionId);
    
    // Calculate sequence updates
    const updates = calculateReorderSequences(containers, fromIndex, toIndex);
    
    // Apply updates to database
    const success = await updateNoteContainerSequences(updates);
    
    if (!success) {
      throw new Error('Failed to update note container sequences');
    }
    
    // Return updated containers
    return await this.getNoteContainers(collectionId);
  }

  // NEW: Move note container to specific position within collection
  static async moveNoteContainerToPosition(
    collectionId: string,
    noteContainerId: string,
    newPosition: number
  ): Promise<NoteContainer[]> {
    const containers = await this.getNoteContainers(collectionId);
    const currentIndex = containers.findIndex(c => c.id === noteContainerId);
    
    if (currentIndex === -1) {
      throw new Error('Note container not found');
    }
    
    return await this.reorderNoteContainers(collectionId, currentIndex, newPosition);
  }
}