// src/lib/services/collectionService.ts
import { supabase } from '$lib/supabase';
import type { Collection, CreateCollection, SequenceUpdate } from '$lib/types';
import { getNextCollectionSequence, updateCollectionSequences } from './sequenceService';
import { calculateReorderSequences } from '$lib/utils/sequenceUtils';

export class CollectionService {
  // Get all collections for current user - NOW ORDERED BY SEQUENCE
  static async getCollections(): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('sequence', { ascending: true }); // Changed from name to sequence

    if (error) {
      console.error('Error loading collections:', error);
      throw error;
    }

    return data || [];
  }

  // Get default collection for user
  static async getDefaultCollection(): Promise<Collection | null> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_default', true)
      .order('sequence', { ascending: true }) // Order by sequence in case multiple defaults
      .limit(1)
      .single();

    if (error) {
      console.error('Error loading default collection:', error);
      return null;
    }

    return data;
  }

  // Create new collection - NOW WITH SEQUENCE SUPPORT
  static async createCollection(collection: CreateCollection): Promise<Collection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next sequence if not provided
    const sequence = collection.sequence ?? await getNextCollectionSequence(user.id);

    const newCollection = {
      ...collection,
      user_id: user.id,
      color: collection.color || '#3B82F6',
      sequence // Add sequence to insert
    };

    const { data, error } = await supabase
      .from('collections')
      .insert(newCollection)
      .select()
      .single();

    if (error) {
      console.error('Error creating collection:', error);
      throw error;
    }

    return data;
  }

  // Update collection - NOW SUPPORTS SEQUENCE UPDATES
  static async updateCollection(
    id: string, 
    updates: Partial<CreateCollection> & { sequence?: number }
  ): Promise<Collection> {
    const { data, error } = await supabase
      .from('collections')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection:', error);
      throw error;
    }

    return data;
  }

  // Delete collection (notes will be moved to null collection)
  static async deleteCollection(id: string): Promise<void> {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  // NEW: Reorder collections via drag & drop
  static async reorderCollections(
    fromIndex: number,
    toIndex: number
  ): Promise<Collection[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get current collections
    const collections = await this.getCollections();
    
    // Calculate sequence updates
    const updates = calculateReorderSequences(collections, fromIndex, toIndex);
    
    // Apply updates to database
    const success = await updateCollectionSequences(updates);
    
    if (!success) {
      throw new Error('Failed to update collection sequences');
    }
    
    // Return updated collections
    return await this.getCollections();
  }

  // NEW: Move collection to specific position
  static async moveCollectionToPosition(
    collectionId: string,
    newPosition: number
  ): Promise<Collection[]> {
    const collections = await this.getCollections();
    const currentIndex = collections.findIndex(c => c.id === collectionId);
    
    if (currentIndex === -1) {
      throw new Error('Collection not found');
    }
    
    return await this.reorderCollections(currentIndex, newPosition);
  }
}