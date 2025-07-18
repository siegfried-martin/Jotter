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
  created_at: string;
  updated_at: string;
}

export class UserService {
  // Get user preferences
  static async getUserPreferences(): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error loading user preferences:', error);
      return null;
    }

    return data;
  }

  // Update last visited collection
  static async updateLastVisitedCollection(collectionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .update({ 
        last_visited_collection_id: collectionId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      console.error('Error updating last visited collection:', error);
      throw error;
    }
  }

  // Get last visited collection ID
  static async getLastVisitedCollectionId(): Promise<string | null> {
    const preferences = await this.getUserPreferences();
    return preferences?.last_visited_collection_id || null;
  }
}