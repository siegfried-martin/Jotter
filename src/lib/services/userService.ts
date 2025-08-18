// src/lib/services/userService.ts
import { supabase } from '$lib/supabase';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: string;
  default_editor: string;
  auto_save_delay: number;
  keyboard_shortcuts: Record<string, any>;
  last_visited_collection_id?: string;
  last_visited_container_id?: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
  // Get user preferences
  static async getUserPreferences(): Promise<UserPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }

    return data;
  }

  // Create default user preferences if they don't exist
  static async ensureUserPreferences(): Promise<UserPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Try to get existing preferences
    let preferences = await this.getUserPreferences();
    
    if (!preferences) {
      // Create default preferences
      const defaultPreferences = {
        user_id: user.id,
        theme: 'light',
        default_editor: 'wysiwyg',
        auto_save_delay: 2000,
        keyboard_shortcuts: {},
        last_visited_collection_id: null,
        last_visited_container_id: null
      };

      const { data, error } = await supabase
        .from('user_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (error) {
        console.error('Error creating user preferences:', error);
        throw error;
      }

      preferences = data;
    }

    return preferences;
  }

  // Get last visited container ID
  static async getLastVisitedContainerId(): Promise<string | null> {
    console.log('🔍 UserService.getLastVisitedContainerId called');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No authenticated user');
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('last_visited_container_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.log('⚠️ Error getting last visited container:', error);
      if (error.code === 'PGRST116') {
        // No user preferences record exists yet
        console.log('ℹ️ No user preferences found, returning null');
        return null;
      }
      throw error;
    }

    console.log('✅ Last visited container from DB:', data?.last_visited_container_id);
    return data?.last_visited_container_id || null;
  }

  // Update last visited container ID
  static async updateLastVisitedContainer(containerId: string): Promise<void> {
    console.log('🔄 Updating last visited container to:', containerId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure user preferences exist
    await this.ensureUserPreferences();

    const { error } = await supabase
      .from('user_preferences')
      .update({ 
        last_visited_container_id: containerId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating last visited container:', error);
      throw error;
    }

    console.log('✅ Last visited container updated successfully');
  }

  // Check which collection a container belongs to
  static async getContainerCollection(containerId: string): Promise<string | null> {
    console.log('🔍 Checking which collection contains container:', containerId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('note_container')
      .select('collection_id, title')
      .eq('id', containerId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.log('❌ Container not found or error:', error);
      if (error.code === 'PGRST116') {
        // Container doesn't exist or user doesn't have access
        return null;
      }
      throw error;
    }

    console.log('✅ Container belongs to collection:', {
      containerId,
      containerTitle: data.title,
      collectionId: data.collection_id
    });

    return data.collection_id;
  }

  // Get last visited collection ID
  static async getLastVisitedCollectionId(): Promise<string | null> {
    const preferences = await this.getUserPreferences();
    return preferences?.last_visited_collection_id || null;
  }

  // Update last visited collection
  static async updateLastVisitedCollection(collectionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure user preferences exist
    await this.ensureUserPreferences();

    const { error } = await supabase
      .from('user_preferences')
      .update({ 
        last_visited_collection_id: collectionId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating last visited collection:', error);
      throw error;
    }
  }

  // Update both last visited collection and set as default
  static async updateLastVisitedAndDefault(collectionId: string): Promise<void> {
    // Update user preferences
    await this.updateLastVisitedCollection(collectionId);
    
    // Update collection to be default (unset others first)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // First, unset all collections as default
    await supabase
      .from('collections')
      .update({ is_default: false })
      .eq('user_id', user.id);
    
    // Then set this collection as default
    await supabase
      .from('collections')
      .update({ is_default: true })
      .eq('id', collectionId)
      .eq('user_id', user.id);
  }

  // Update user preferences
  static async updateUserPreferences(updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure user preferences exist
    await this.ensureUserPreferences();

    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }

    return data;
  }

  // Clear last visited container (useful when container is deleted)
  static async clearLastVisitedContainer(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_preferences')
      .update({ 
        last_visited_container_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing last visited container:', error);
      throw error;
    }
  }

  // Clear last visited collection (useful when collection is deleted)
  static async clearLastVisitedCollection(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_preferences')
      .update({ 
        last_visited_collection_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing last visited collection:', error);
      throw error;
    }
  }
}