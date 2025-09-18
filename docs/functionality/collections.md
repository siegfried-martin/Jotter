# Collections System

## Overview
Collections are the top-level organizational unit in Jotter, containing multiple note containers.

## User Interface

### Collections Bar
- Horizontal tabs at top of application
- Color-coded collection indicators
- Active collection highlighted
- Click to switch between collections
- Drag containers between collections (cross-collection moves)

### Collection Management

#### Create Collection
- **Trigger**: "+" button in collections bar or hotkey
- **Fields**: 
  - Name (required)
  - Color (color picker)
  - Description (optional)
- **Validation**: Name must be unique per user
- **Result**: New collection created and becomes active

#### Edit Collection  
- **Trigger**: Right-click collection tab or settings menu
- **Fields**: Same as create (name, color, description)
- **Constraints**: Cannot edit if it's the only collection

#### Delete Collection
- **Trigger**: Right-click menu or delete button in edit modal
- **Validation**: Cannot delete if it contains containers
- **Confirmation**: User must confirm deletion
- **Result**: Collection removed, user redirected to default collection

## Data Model

### Database Schema
```sql
collections (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, 
  is_default BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  sequence INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Business Rules
- Each user has at least one collection (default created on signup)
- Collection names must be unique per user
- Default collection cannot be deleted
- Collections maintain sequence order for consistent UI

## Technical Implementation

### Caching
- Collections loaded and cached via AppDataManager
- Optimistic updates for create/edit/delete operations
- Cache invalidation on collection switches

### URL Structure
- `/app` - Default collection
- `/app/collections/{id}` - Specific collection
- Bookmarkable URLs for direct collection access

## Testing Requirements
- [ ] E2E: Create collection with all field types
- [ ] E2E: Edit collection name, color, description
- [ ] E2E: Delete collection with confirmation flow
- [ ] E2E: Navigation between collections preserves state
- [ ] E2E: Cross-collection container drag and drop
- [ ] Unit: Collection validation logic
- [ ] Unit: Default collection behavior
- [ ] Unit: Collection sequence management
