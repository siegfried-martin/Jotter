// src/lib/composables/useNoteOperations.ts
import { goto } from '$app/navigation';
import { NoteService } from '$lib/services/noteService';
import { SectionService } from '$lib/services/sectionService';
import { noteStore, noteActions } from '$lib/stores/noteStore';
import type { CreateNoteSection } from '$lib/types';

export function useNoteOperations() {
  
  /**
   * Create a new note in the current collection
   */
  async function createNewNote(collectionId: string, selectContainerFn: (container: any) => Promise<void>): Promise<void> {
    try {
      const title = `New Note ${new Date().toLocaleDateString()}`;
      const newContainer = await NoteService.createNoteContainer(
        { title }, 
        collectionId
      );
      
      noteActions.addContainer(newContainer);
      await selectContainerFn(newContainer);
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  }

  /**
   * Create a new note with a code section
   */
  async function createNewNoteWithCode(collectionId: string, selectContainerFn: (container: any) => Promise<void>): Promise<void> {
    try {
      const title = `New Note ${new Date().toLocaleDateString()}`;
      const newContainer = await NoteService.createNoteContainer(
        { title }, 
        collectionId
      );
      
      // Create a code section
      const newSection = await SectionService.createSection({
        note_container_id: newContainer.id,
        type: 'code',
        content: '',
        sequence: 0,
        meta: { language: 'plaintext' }
      });
      
      noteActions.addContainer(newContainer);
      await selectContainerFn(newContainer);
      goto(`/app/collections/${collectionId}/edit/${newSection.id}`);
    } catch (error) {
      console.error('Failed to create note with code:', error);
      throw error;
    }
  }

    /**
   * Update note container title
   */
  async function updateNoteTitle(containerId: string, newTitle: string): Promise<void> {
    try {
      const updatedContainer = await NoteService.updateNoteContainerTitle(containerId, newTitle);
      noteActions.updateContainer(updatedContainer);
      console.log('✅ Note title updated successfully');
    } catch (error) {
      console.error('Failed to update note title:', error);
      throw error;
    }
  }

  /**
   * Create a new section in the selected note
   */
  async function createSection(
    sectionType: 'checklist' | 'code' | 'wysiwyg' | 'diagram',
    selectedContainer: any,
    selectedContainerSections: any[],
    collectionId: string,
    selectContainerFn: (container: any) => Promise<void>
  ): Promise<void> {
    if (!selectedContainer) return;
    
    try {
      const defaultContent = {
        checklist: '',
        code: '',
        wysiwyg: '',
        diagram: ''
      };
      
      const newSection: CreateNoteSection = {
        note_container_id: selectedContainer.id,
        type: sectionType,
        content: defaultContent[sectionType],
        sequence: selectedContainerSections.length,
        meta: sectionType === 'code' ? { language: 'plaintext' } : {},
        checklist_data: sectionType === 'checklist' ? [{ text: '', checked: false }] : undefined
      };
      
      const createdSection = await SectionService.createSection(newSection);
      await selectContainerFn(selectedContainer); // Refresh sections
      goto(`/app/collections/${collectionId}/edit/${createdSection.id}`);
    } catch (error) {
      console.error('Failed to create section:', error);
      throw error;
    }
  }

  /**
   * Navigate to edit a section
   */
  function handleEdit(sectionId: string, collectionId: string): void {
    goto(`/app/collections/${collectionId}/edit/${sectionId}`);
  }

  /**
   * Delete a section
   */
  async function deleteSection(sectionId: string, selectedContainer: any, selectContainerFn: (container: any) => Promise<void>): Promise<void> {
    if (!confirm('Are you sure you want to delete this section?')) return;
    
    try {
      await SectionService.deleteSection(sectionId);
      if (selectedContainer) {
        await selectContainerFn(selectedContainer); // Refresh sections
      }
    } catch (error) {
      console.error('Failed to delete section:', error);
      throw error;
    }
  }

  /**
   * Delete a note container
   */
  async function deleteContainer(containerId: string, containers: any[], selectContainerFn: (container: any) => Promise<void>): Promise<void> {
    if (!confirm('Are you sure you want to delete this note and all its sections?')) return;
    
    try {
      await NoteService.deleteNoteContainer(containerId);
      noteActions.removeContainer(containerId);
      
      // Select first available container
      if (containers.length > 0) {
        await selectContainerFn(containers[0]);
      }
    } catch (error) {
      console.error('Failed to delete container:', error);
      throw error;
    }
  }

  /**
   * Handle checklist item checkbox changes
   */
  async function handleCheckboxChange(
    event: CustomEvent<{sectionId: string; checked: boolean; lineIndex: number}>,
    selectedContainerSections: any[],
    selectedContainer: any
  ): Promise<void> {
    const { sectionId, checked, lineIndex } = event.detail;
    const section = selectedContainerSections.find(s => s.id === sectionId);
    if (!section || !section.checklist_data) return;
    
    try {
      // Optimistically update local state first
      section.checklist_data[lineIndex].checked = checked;
      noteActions.setSelectedSections([...selectedContainerSections]);
      
      // Then update server
      await SectionService.updateChecklistItem(
        sectionId, 
        lineIndex, 
        checked, 
        section.checklist_data
      );
      
      // Update container timestamp
      if (selectedContainer) {
        await NoteService.updateNoteContainer(selectedContainer.id, {});
      }
    } catch (error) {
      console.error('Failed to update checkbox:', error);
      // Revert optimistic update on error
      section.checklist_data[lineIndex].checked = !checked;
      noteActions.setSelectedSections([...selectedContainerSections]);
      throw error;
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  function createKeyboardHandler(
    collectionId: string,
    createNoteFn: () => Promise<void>,
    createNoteWithCodeFn: () => Promise<void>
  ) {
    return function handleKeydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'm' || event.key === 'M')) {
        event.preventDefault();
        if (event.shiftKey) {
          createNoteWithCodeFn();
        } else {
          createNoteFn();
        }
      } else if (event.altKey && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        if (event.shiftKey) {
          createNoteWithCodeFn();
        } else {
          createNoteFn();
        }
      }
    };
  }

  /**
   * Handle section title updates - FIXED: No unnecessary refetch
   */
  async function handleSectionTitleSave(
    event: CustomEvent<{ sectionId: string; title: string | null }>,
    selectedContainerSections: any[],
    selectContainerFn: (container: any) => Promise<void>,
    selectedContainer: any
  ): Promise<void> {
    const { sectionId, title } = event.detail;
    
    // Find the section in local state
    const sectionIndex = selectedContainerSections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      console.warn('Section not found in local state:', sectionId);
      return;
    }

    // Store original title for rollback
    const originalTitle = selectedContainerSections[sectionIndex].title;
    
    try {
      // Optimistically update local state first
      selectedContainerSections[sectionIndex].title = title;
      noteActions.setSelectedSections([...selectedContainerSections]);
      
      console.log('🎯 Optimistically updated section title locally');
      
      // Then update server
      const updatedSection = await SectionService.updateSectionTitle(sectionId, title);
      
      // Update with server response (in case server modified the data)
      selectedContainerSections[sectionIndex] = updatedSection;
      noteActions.setSelectedSections([...selectedContainerSections]);
      
      console.log('✅ Section title updated successfully on server');
    } catch (error) {
      console.error('Failed to update section title:', error);
      
      // Rollback optimistic update on error
      selectedContainerSections[sectionIndex].title = originalTitle;
      noteActions.setSelectedSections([...selectedContainerSections]);
      
      throw error;
    }
  }

  /**
   * Handle cross-container section moves
   */
  async function handleCrossContainerMove(
    event: CustomEvent<{ sectionId: string; fromContainer: string; toContainer: string }>,
    selectContainerFn: (container: any) => Promise<void>,
    containers: any[]
  ): Promise<void> {
    const { sectionId, fromContainer, toContainer } = event.detail;
    
    try {
      console.log('🔄 Moving section between containers:', {
        sectionId,
        from: fromContainer,
        to: toContainer
      });
      
      // Move section to new container
      const updatedSection = await SectionService.moveSectionToContainer(sectionId, toContainer);
      
      // Find and select the target container to show the moved section
      const targetContainer = containers.find(c => c.id === toContainer);
      if (targetContainer) {
        await selectContainerFn(targetContainer);
      }
      
      console.log('✅ Section moved successfully to new container');
    } catch (error) {
      console.error('❌ Failed to move section:', error);
      throw error;
    }
  }

  return {
    createNewNote,
    createNewNoteWithCode,
    createSection,
    handleEdit,
    deleteSection,
    deleteContainer,
    handleCheckboxChange,
    createKeyboardHandler,
    updateNoteTitle,
    handleSectionTitleSave,
    handleCrossContainerMove
  };
}