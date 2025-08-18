// src/lib/services/noteService.ts
import { supabase } from '$lib/supabase';
import type { NoteContainer, CreateNoteContainer, SequenceUpdate } from '$lib/types';
import { getNextNoteContainerSequence, updateNoteContainerSequences } from './sequenceService';
import { calculateReorderSequences } from '$lib/utils/sequenceUtils';
import { CollectionService } from './collectionService';

export class NoteService {
  // Get all note containers for current user - NOW WITH PROPER USER FILTERING
  static async getNoteContainers(collectionId?: string): Promise<NoteContainer[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

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
      .eq('user_id', user.id) // ← CRITICAL FIX: Filter by user_id
      .order('sequence', { ascending: true });

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

  // Get a single note container by ID - ENHANCED with user ownership check
  static async getNoteContainer(containerId: string): Promise<NoteContainer | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('note_container')
      .select(`
        *,
        collections (
          id,
          name,
          color
        )
      `)
      .eq('id', containerId)
      .eq('user_id', user.id) // Security: Ensure user owns this note
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error loading note container:', error);
      throw error;
    }

    return data;
  }

  // Convenience method: Create a new note container with just title and collection
  static async createSimpleNoteContainer(
    collectionId: string,
    title: string = 'Untitled Note'
  ): Promise<NoteContainer> {
    return await this.createNoteContainer({
      title: title.trim()
    }, collectionId);
  }

  // Create a new note container - ENHANCED with default collection logic
  static async createNoteContainer(
    container: CreateNoteContainer, 
    collectionId?: string
  ): Promise<NoteContainer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // If no collection specified, use user's default collection
    let finalCollectionId = collectionId;
    if (!finalCollectionId) {
      const defaultCollection = await CollectionService.ensureDefaultCollection();
      finalCollectionId = defaultCollection.id;
    }

    // Get next sequence if not provided
    const sequence = container.sequence ?? await getNextNoteContainerSequence(finalCollectionId);

    const newContainer = {
      ...container,
      user_id: user.id,
      collection_id: finalCollectionId, // Now always has a collection
      sequence
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

  // Update note container - ENHANCED with user ownership check
  static async updateNoteContainer(
    id: string, 
    updates: Partial<CreateNoteContainer> & { sequence?: number }
  ): Promise<NoteContainer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('note_container')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // ← SECURITY: Ensure user owns this note
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

  // Update note container title - ENHANCED with user ownership check
  static async updateNoteContainerTitle(
    id: string, 
    title: string
  ): Promise<NoteContainer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('note_container')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // ← SECURITY: Ensure user owns this note
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

  // Delete note container - ENHANCED with user ownership check
  static async deleteNoteContainer(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('note_container')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // ← SECURITY: Ensure user owns this note

    if (error) {
      console.error('Error deleting note container:', error);
      throw error;
    }
  }

  // Move note container to different collection - ENHANCED with ownership checks
  static async moveToCollection(noteId: string, collectionId: string | null): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // If moving to null, use default collection instead
    let finalCollectionId = collectionId;
    if (!finalCollectionId) {
      const defaultCollection = await CollectionService.ensureDefaultCollection();
      finalCollectionId = defaultCollection.id;
    }

    // Verify the target collection belongs to the user
    if (finalCollectionId) {
      const { data: collection } = await supabase
        .from('collections')
        .select('id')
        .eq('id', finalCollectionId)
        .eq('user_id', user.id)
        .single();
      
      if (!collection) {
        throw new Error('Target collection not found or access denied');
      }
    }

    const { error } = await supabase
      .from('note_container')
      .update({ 
        collection_id: finalCollectionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', user.id); // ← SECURITY: Ensure user owns this note

    if (error) {
      console.error('Error moving note to collection:', error);
      throw error;
    }
  }

  // Reorder note containers within a collection - ENHANCED with user filtering
  static async reorderNoteContainers(
    collectionId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<NoteContainer[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get current note containers for this collection (user-filtered)
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

  // Move note container to specific position within collection
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