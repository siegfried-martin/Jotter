export interface ChecklistItem {
  text: string;
  checked: boolean;
  date?: string; // ISO date string, optional
}

export interface NoteContainer {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface NoteSection {
  id: string;
  note_container_id: string;
  type: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  content: string;
  sequence: number;
  meta: Record<string, any>;
  checklist_data?: ChecklistItem[]; // New structured field
  created_at: string;
  updated_at: string;
}

// For creating new records (without auto-generated fields)
export interface CreateNoteContainer {
  title: string;
}

export interface CreateNoteSection {
  note_container_id: string;
  type: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  content: string;
  sequence: number;
  meta?: Record<string, any>;
  checklist_data?: ChecklistItem[]; // New structured field
}

// For updates (all fields optional except id)
export interface UpdateNoteContainer {
  id: string;
  title?: string;
}

export interface UpdateNoteSection {
  id: string;
  type?: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  content?: string;
  sequence?: number;
  meta?: Record<string, any>;
  checklist_data?: ChecklistItem[]; // New structured field
}