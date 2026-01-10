// src/lib/services/collectionService.ts
import { supabase, getAuthenticatedUser } from '$lib/supabase';
import type { Collection, CreateCollection, SequenceUpdate } from '$lib/types';
import { getNextCollectionSequence, updateCollectionSequences } from './sequenceService';
import { calculateReorderSequences } from '$lib/utils/sequenceUtils';
import { isDemoMode } from '$lib/stores/demoStore';
import { DemoCollectionService } from './localStorage/demoStorageService';
import { EventLogService } from './eventLogService';

export class CollectionService {
  // Get all collections for current user - NOW WITH PROPER USER FILTERING
  static async getCollections(): Promise<Collection[]> {
    if (isDemoMode()) {
      return DemoCollectionService.getCollections();
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user.id) // ← CRITICAL FIX: Filter by user_id
      .order('sequence', { ascending: true });

    if (error) {
      console.error('Error loading collections:', error);
      throw error;
    }

    return data || [];
  }

  // Get single collection by ID - WITH PROPER USER FILTERING
  static async getCollection(collectionId: string): Promise<Collection | null> {
    if (isDemoMode()) {
      return DemoCollectionService.getCollection(collectionId);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .eq('user_id', user.id) // SECURITY: Ensure user owns this collection
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - collection not found or user doesn't have access
        return null;
      }
      console.error('Error loading collection:', error);
      throw error;
    }

    return data;
}

  // Get default collection for current user - NOW WITH PROPER USER FILTERING
  static async getDefaultCollection(): Promise<Collection | null> {
    if (isDemoMode()) {
      return DemoCollectionService.getDefaultCollection();
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user.id) // ← CRITICAL FIX: Filter by user_id
      .eq('is_default', true)
      .order('sequence', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('Error loading default collection:', error);
      return null;
    }

    return data;
  }

  // Create new collection - ENHANCED with default collection logic
  static async createCollection(collection: CreateCollection): Promise<Collection> {
    if (isDemoMode()) {
      return DemoCollectionService.createCollection(collection);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get next sequence if not provided
    const sequence = collection.sequence ?? await getNextCollectionSequence(user.id);

    // If this is the user's first collection, make it default
    const existingCollections = await this.getCollections();
    const isFirstCollection = existingCollections.length === 0;

    const newCollection = {
      ...collection,
      user_id: user.id,
      color: collection.color || '#3B82F6',
      sequence,
      is_default: collection.is_default ?? isFirstCollection // Auto-default first collection
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

    // Log event
    EventLogService.logCollectionCreated(data.id, data.name, data.color);

    return data;
  }

  // Update collection - NOW SUPPORTS SEQUENCE UPDATES
  static async updateCollection(
    id: string,
    updates: Partial<CreateCollection> & { sequence?: number }
  ): Promise<Collection> {
    if (isDemoMode()) {
      return DemoCollectionService.updateCollection(id, updates);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collections')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // ← SECURITY: Ensure user owns this collection
      .select()
      .single();

    if (error) {
      console.error('Error updating collection:', error);
      throw error;
    }

    return data;
  }

  // Delete collection - ENHANCED with orphan note handling
  static async deleteCollection(id: string): Promise<void> {
    if (isDemoMode()) {
      return DemoCollectionService.deleteCollection(id);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get collection name for logging before deletion
    const collection = await this.getCollection(id);
    const collectionName = collection?.name ?? 'Unknown';

    // First, move any notes in this collection to the user's default collection
    const defaultCollection = await this.getDefaultCollection();
    if (defaultCollection && defaultCollection.id !== id) {
      await supabase
        .from('note_container')
        .update({ collection_id: defaultCollection.id })
        .eq('collection_id', id)
        .eq('user_id', user.id); // Ensure we only move user's own notes
    }

    // Delete the collection
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // ← SECURITY: Ensure user owns this collection

    if (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }

    // Log event
    EventLogService.logCollectionDeleted(id, collectionName);
  }

  // NEW: Reorder collections via drag & drop
  static async reorderCollections(
    fromIndex: number,
    toIndex: number
  ): Promise<Collection[]> {
    if (isDemoMode()) {
      return DemoCollectionService.reorderCollections(fromIndex, toIndex);
    }

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Get current collections for this user
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

  // NEW: Ensure user has a default collection
  static async ensureDefaultCollection(): Promise<Collection> {
    if (isDemoMode()) {
      return DemoCollectionService.ensureDefaultCollection();
    }

    let defaultCollection = await this.getDefaultCollection();

    if (!defaultCollection) {
      // Create a default collection for the user
      defaultCollection = await this.createCollection({
        name: 'My Notes',
        description: 'Default collection for your notes',
        color: '#3B82F6',
        is_default: true
      });
    }

    return defaultCollection;
  }
}