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
        checklist_data: sectionType === 'checklist' ? [{ text: 'New task', checked: false }] : undefined
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
      await SectionService.updateChecklistItem(
        sectionId, 
        lineIndex, 
        checked, 
        section.checklist_data
      );
      
      // Update local state
      section.checklist_data[lineIndex].checked = checked;
      noteActions.setSelectedSections([...selectedContainerSections]);
      
      // Update container timestamp
      if (selectedContainer) {
        await NoteService.updateNoteContainer(selectedContainer.id, {});
      }
    } catch (error) {
      console.error('Failed to update checkbox:', error);
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

  return {
    createNewNote,
    createNewNoteWithCode,
    createSection,
    handleEdit,
    deleteSection,
    deleteContainer,
    handleCheckboxChange,
    createKeyboardHandler
  };
}