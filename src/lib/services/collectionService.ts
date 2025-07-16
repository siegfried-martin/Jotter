// src/lib/services/collectionService.ts
import { supabase } from '$lib/supabase';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_default: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCollection {
  name: string;
  description?: string;
  color?: string;
  is_default?: boolean;
}

export class CollectionService {
  // Get all collections for current user
  static async getCollections(): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

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
      .single();

    if (error) {
      console.error('Error loading default collection:', error);
      return null;
    }

    return data;
  }

  // Create new collection
  static async createCollection(collection: CreateCollection): Promise<Collection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const newCollection = {
      ...collection,
      user_id: user.id,
      color: collection.color || '#3B82F6'
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

  // Update collection
  static async updateCollection(
    id: string, 
    updates: Partial<CreateCollection>
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
}