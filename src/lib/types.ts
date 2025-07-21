export interface ChecklistItem {
  text: string;
  checked: boolean;
  date?: string; // ISO date string, optional
}

// Collection interfaces
export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_default: boolean;
  user_id: string;
  sequence: number; // Add sequence support
  created_at: string;
  updated_at: string;
}

export interface CreateCollection {
  name: string;
  description?: string;
  color?: string;
  is_default?: boolean;
  sequence?: number; // Optional - will be auto-assigned if not provided
}

export interface UpdateCollection {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  is_default?: boolean;
  sequence?: number;
}

// Note interfaces
export interface NoteContainer {
  id: string;
  title: string;
  sequence: number; // Add sequence support
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
  checklist_data?: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

// Create interfaces
export interface CreateNoteContainer {
  title: string;
  sequence?: number; // Optional - will be auto-assigned if not provided
}

export interface CreateNoteSection {
  note_container_id: string;
  type: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  content: string;
  sequence?: number; // Optional - will be auto-assigned if not provided
  meta?: Record<string, any>;
  checklist_data?: ChecklistItem[];
}

// Update interfaces
export interface UpdateNoteContainer {
  id: string;
  title?: string;
  sequence?: number;
}

export interface UpdateNoteSection {
  id: string;
  type?: 'checklist' | 'code' | 'wysiwyg' | 'diagram';
  content?: string;
  sequence?: number;
  meta?: Record<string, any>;
  checklist_data?: ChecklistItem[];
}

// Sequence management types
export interface SequenceUpdate {
  id: string;
  sequence: number;
}

export interface ReorderRequest {
  fromIndex: number;
  toIndex: number;
  items: SequenceUpdate[];
}