# Note Sections System

## Overview
Note sections are the individual content blocks within containers, supporting different content types (code, rich text, checklists, diagrams).

## Section Types

### Code Sections
- Syntax highlighting with language selection
- Preserve indentation on new lines
- Copy to clipboard functionality
- Line numbers and code folding

### Rich Text Sections  
- Quill-based WYSIWYG editor
- Standard formatting (bold, italic, lists, links)
- Copy formatted content to clipboard

### Checklist Sections
- Task items with checkboxes
- Due dates and priority levels
- Progress tracking with visual indicators
- Drag-and-drop reordering of items

### Diagram Sections
- Excalidraw integration for drawings
- Thumbnail generation for previews
- Full-screen editing mode
- Export capabilities

## User Interface

### Section Grid
- Masonry-style layout for optimal space usage
- Preview cards showing section content
- Hover actions (edit, delete, duplicate)
- Responsive design for mobile devices

### Section Management

#### Create Section
- **Trigger**: Various hotkeys (Ctrl+M, Alt+Shift+N, etc.)
- **Types**: Code (default), rich text, checklist, diagram
- **Placement**: Added to end of container
- **Focus**: Immediately enters edit mode

#### Edit Section Title
- **Behavior**: Inline editing in section header
- **Default**: "Untitled {Type}" for new sections
- **Auto-save**: Updates saved on blur/enter

#### Delete Section
- **Trigger**: Delete button in section header
- **Confirmation**: Required for sections with content
- **Cleanup**: Removes from database and updates cache

## Drag & Drop System

### Within Container
- Custom drag implementation with live preview
- Visual feedback during drag operations
- Optimistic sequence updates
- Smooth animations and transitions

### Cross-Container Moves
- Drag sections between containers
- Updates container_id and sequence
- Cache invalidation for both containers
- Preserves section content and metadata

## Data Model

### Database Schema
```sql
note_section (
  id UUID PRIMARY KEY,
  note_container_id UUID REFERENCES note_container(id),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'code', 'rich_text', 'checklist', 'diagram'
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT,
  sequence INTEGER,
  meta JSONB, -- Language for code, settings for other types
  checklist_data JSONB, -- Structured data for checklist items
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Content Storage
- **Code**: Plain text with language metadata
- **Rich Text**: Quill Delta JSON format  
- **Checklist**: Structured JSON with items array
- **Diagram**: Excalidraw scene data

## Auto-Save System
- Configurable delay (default: 2 seconds)
- Draft recovery for unsaved changes
- Optimistic updates with rollback on error
- Visual indicators for save status

## Testing Requirements
- [ ] E2E: Create all section types
- [ ] E2E: Edit section titles inline  
- [ ] E2E: Delete sections with confirmation
- [ ] E2E: Drag reorder within container
- [ ] E2E: Drag move between containers
- [ ] E2E: Auto-save with draft recovery
- [ ] Unit: Section type validation
- [ ] Unit: Content serialization/deserialization
- [ ] Unit: Sequence management
