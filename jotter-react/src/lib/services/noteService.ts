// src/lib/services/noteService.ts
import { supabase, getAuthenticatedUser } from '@/lib/supabase';
import type { NoteContainer, CreateNoteContainer } from '@/lib/types';
import {
  getNextNoteContainerSequence,
  updateNoteContainerSequences
} from '@/lib/services/sequenceService';
import { calculateReorderSequences } from '@/lib/utils/sequenceUtils';
import { CollectionService } from '@/lib/services/collectionService';
import { isDemoMode } from '@/lib/demo/demoMode';
import { DemoNoteService } from '@/lib/services/localStorage/demoStorageService';
import { EventLogService } from '@/lib/services/eventLogService';

export class NoteService {
  // Get all note containers for current user - NOW WITH PROPER USER FILTERING
  static async getNoteContainers(collectionId?: string): Promise<NoteContainer[]> {
    if (isDemoMode()) {
      return DemoNoteService.getNoteContainers(collectionId);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('note_container')
      .select(
        `
        *,
        collections (
          id,
          name,
          color
        )
      `
      )
      .order('sequence', { ascending: true });

    // Scope by collection (access granted via collection membership in RLS) so members
    // see a shared collection's notes. Without a collection, fall back to the caller's
    // own (SELECT is public, so an unscoped query would return everyone's).
    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    console.log('getNoteContainers Query result:', data);

    if (error) {
      console.error('Error loading note containers:', error);
      throw error;
    }

    return data || [];
  }

  // Get a single note container by ID (public SELECT; readable by link/membership).
  static async getNoteContainer(containerId: string): Promise<NoteContainer | null> {
    if (isDemoMode()) {
      return DemoNoteService.getNoteContainer(containerId);
    }

    const { data, error } = await supabase
      .from('note_container')
      .select(
        `
        *,
        collections (
          id,
          name,
          color
        )
      `
      )
      .eq('id', containerId)
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
    if (isDemoMode()) {
      return DemoNoteService.createSimpleNoteContainer(collectionId, title);
    }
    return await this.createNoteContainer(
      {
        title: title.trim()
      },
      collectionId
    );
  }

  // Create a new note container - ENHANCED with default collection logic
  static async createNoteContainer(
    container: CreateNoteContainer,
    collectionId?: string
  ): Promise<NoteContainer> {
    if (isDemoMode()) {
      return DemoNoteService.createNoteContainer(container, collectionId);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // If no collection specified, use user's default collection
    let finalCollectionId = collectionId;
    if (!finalCollectionId) {
      const defaultCollection = await CollectionService.ensureDefaultCollection();
      finalCollectionId = defaultCollection.id;
    }

    // Get next sequence if not provided
    const sequence = container.sequence ?? (await getNextNoteContainerSequence(finalCollectionId));

    const newContainer = {
      ...container,
      user_id: user.id,
      collection_id: finalCollectionId, // Now always has a collection
      sequence
    };

    const { data, error } = await supabase
      .from('note_container')
      .insert(newContainer)
      .select(
        `
        *,
        collections (
          id,
          name,
          color
        )
      `
      )
      .single();

    if (error) {
      console.error('Error creating note container:', error);
      throw error;
    }

    // Log event
    EventLogService.logContainerCreated(data.id, finalCollectionId, data.title);

    return data;
  }

  // Update note container - ENHANCED with user ownership check
  static async updateNoteContainer(
    id: string,
    updates: Partial<CreateNoteContainer> & { sequence?: number }
  ): Promise<NoteContainer> {
    if (isDemoMode()) {
      return DemoNoteService.updateNoteContainer(id, updates);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get original values for change tracking
    const original = await this.getNoteContainer(id);

    const { data, error } = await supabase
      .from('note_container')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // ← SECURITY: Ensure user owns this note
      .select(
        `
        *,
        collections (
          id,
          name,
          color
        )
      `
      )
      .single();

    if (error) {
      console.error('Error updating note container:', error);
      throw error;
    }

    // Log event if there were meaningful changes
    if (original) {
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (updates.title !== undefined && updates.title !== original.title) {
        changes.title = { from: original.title, to: updates.title };
      }
      if (Object.keys(changes).length > 0) {
        EventLogService.logContainerUpdated(id, changes);
      }
    }

    return data;
  }

  // Update note container title - ENHANCED with user ownership check
  static async updateNoteContainerTitle(id: string, title: string): Promise<NoteContainer> {
    if (isDemoMode()) {
      return DemoNoteService.updateNoteContainerTitle(id, title);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get original title for change tracking
    const original = await this.getNoteContainer(id);

    const { data, error } = await supabase
      .from('note_container')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // ← SECURITY: Ensure user owns this note
      .select(
        `
        *,
        collections (
          id,
          name,
          color
        )
      `
      )
      .single();

    if (error) {
      console.error('Error updating note container title:', error);
      throw error;
    }

    // Log event if title actually changed
    if (original && title.trim() !== original.title) {
      EventLogService.logContainerUpdated(id, {
        title: { from: original.title, to: title.trim() }
      });
    }

    return data;
  }

  // Delete note container - ENHANCED with user ownership check
  static async deleteNoteContainer(id: string): Promise<void> {
    if (isDemoMode()) {
      return DemoNoteService.deleteNoteContainer(id);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get container info for logging before deletion
    const container = await this.getNoteContainer(id);
    const containerTitle = container?.title ?? 'Unknown';
    // Count sections (we don't have a direct method, so estimate from cache or use 0)
    const sectionCount = 0; // Could be enhanced to count sections

    const { error } = await supabase
      .from('note_container')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // ← SECURITY: Ensure user owns this note

    if (error) {
      console.error('Error deleting note container:', error);
      throw error;
    }

    // Log event
    EventLogService.logContainerDeleted(id, containerTitle, sectionCount);
  }

  // Move note container to different collection - ENHANCED with ownership checks
  static async moveToCollection(noteId: string, collectionId: string | null): Promise<void> {
    if (isDemoMode()) {
      return DemoNoteService.moveToCollection(noteId, collectionId);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get original collection for logging
    const container = await this.getNoteContainer(noteId);
    const fromCollectionId = container?.collection_id ?? 'unknown';

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

    // Log event
    EventLogService.logContainerMoved(noteId, fromCollectionId, finalCollectionId);
  }

  // Reorder note containers within a collection - ENHANCED with user filtering
  static async reorderNoteContainers(
    collectionId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<NoteContainer[]> {
    if (isDemoMode()) {
      return DemoNoteService.reorderNoteContainers(collectionId, fromIndex, toIndex);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get current note containers for this collection (user-filtered)
    const containers = await this.getNoteContainers(collectionId);
    console.log('🔧 reorderNoteContainers: Current containers from DB:', {
      count: containers.length,
      order: containers.map((c) => ({ id: c.id.slice(0, 8), title: c.title, seq: c.sequence }))
    });

    // Calculate sequence updates
    const updates = calculateReorderSequences(containers, fromIndex, toIndex);
    console.log('🔧 reorderNoteContainers: Sequence updates to apply:', {
      updateCount: updates.length,
      updates: updates.map((u) => ({ id: u.id.slice(0, 8), newSeq: u.sequence }))
    });

    // Apply updates to database
    const success = await updateNoteContainerSequences(updates);
    console.log('🔧 reorderNoteContainers: Database update success:', success);

    if (!success) {
      throw new Error('Failed to update note container sequences');
    }

    // Return updated containers
    const updatedContainers = await this.getNoteContainers(collectionId);
    console.log('🔧 reorderNoteContainers: Updated containers from DB:', {
      count: updatedContainers.length,
      order: updatedContainers.map((c) => ({
        id: c.id.slice(0, 8),
        title: c.title,
        seq: c.sequence
      }))
    });
    return updatedContainers;
  }

  // Move note container to specific position within collection
  static async moveNoteContainerToPosition(
    collectionId: string,
    noteContainerId: string,
    newPosition: number
  ): Promise<NoteContainer[]> {
    const containers = await this.getNoteContainers(collectionId);
    const currentIndex = containers.findIndex((c) => c.id === noteContainerId);

    if (currentIndex === -1) {
      throw new Error('Note container not found');
    }

    return await this.reorderNoteContainers(collectionId, currentIndex, newPosition);
  }
}
