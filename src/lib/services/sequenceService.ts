// src/lib/services/sequenceService.ts
import { supabase } from '$lib/supabase';
import type { SequenceUpdate } from '$lib/types';

/**
 * Get next sequence number for collections (corresponds to get_next_collection_sequence DB function)
 */
export async function getNextCollectionSequence(userId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_next_collection_sequence', { p_user_id: userId });
  
  if (error) {
    console.error('Error getting next collection sequence:', error);
    // Fallback: calculate manually
    const { data: collections } = await supabase
      .from('collections')
      .select('sequence')
      .eq('user_id', userId)
      .order('sequence', { ascending: false })
      .limit(1);
    
    return collections && collections.length > 0 ? collections[0].sequence + 10 : 10;
  }
  
  return data;
}

/**
 * Get next sequence number for note containers (corresponds to get_next_note_container_sequence DB function)
 */
export async function getNextNoteContainerSequence(collectionId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_next_note_container_sequence', { p_collection_id: collectionId });
  
  if (error) {
    console.error('Error getting next note container sequence:', error);
    // Fallback: calculate manually
    const { data: containers } = await supabase
      .from('note_container')
      .select('sequence')
      .eq('collection_id', collectionId)
      .order('sequence', { ascending: false })
      .limit(1);
    
    return containers && containers.length > 0 ? containers[0].sequence + 10 : 10;
  }
  
  return data;
}

/**
 * Get next sequence number for note sections (corresponds to get_next_note_section_sequence DB function)
 */
export async function getNextNoteSectionSequence(noteContainerId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_next_note_section_sequence', { p_note_container_id: noteContainerId });
  
  if (error) {
    console.error('Error getting next note section sequence:', error);
    // Fallback: calculate manually
    const { data: sections } = await supabase
      .from('note_section')
      .select('sequence')
      .eq('note_container_id', noteContainerId)
      .order('sequence', { ascending: false })
      .limit(1);
    
    return sections && sections.length > 0 ? sections[0].sequence + 10 : 10;
  }
  
  return data;
}

/**
 * Batch update collection sequences (for drag & drop reordering)
 */
export async function updateCollectionSequences(updates: SequenceUpdate[]): Promise<boolean> {
  if (updates.length === 0) return true;
  
  try {
    const promises = updates.map(update => 
      supabase
        .from('collections')
        .update({ sequence: update.sequence })
        .eq('id', update.id)
    );
    
    const results = await Promise.all(promises);
    const hasErrors = results.some(result => result.error);
    
    if (hasErrors) {
      console.error('Some sequence updates failed:', results.filter(r => r.error));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating collection sequences:', error);
    return false;
  }
}

/**
 * Batch update note container sequences (for drag & drop reordering)
 */
export async function updateNoteContainerSequences(updates: SequenceUpdate[]): Promise<boolean> {
  if (updates.length === 0) return true;
  
  try {
    const promises = updates.map(update => 
      supabase
        .from('note_container')
        .update({ sequence: update.sequence })
        .eq('id', update.id)
    );
    
    const results = await Promise.all(promises);
    const hasErrors = results.some(result => result.error);
    
    if (hasErrors) {
      console.error('Some note container sequence updates failed:', results.filter(r => r.error));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating note container sequences:', error);
    return false;
  }
}

/**
 * Batch update note section sequences (for drag & drop reordering)
 */
export async function updateNoteSectionSequences(updates: SequenceUpdate[]): Promise<boolean> {
  if (updates.length === 0) return true;
  
  try {
    const promises = updates.map(update => 
      supabase
        .from('note_section')
        .update({ sequence: update.sequence })
        .eq('id', update.id)
    );
    
    const results = await Promise.all(promises);
    const hasErrors = results.some(result => result.error);
    
    if (hasErrors) {
      console.error('Some note section sequence updates failed:', results.filter(r => r.error));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating note section sequences:', error);
    return false;
  }
}