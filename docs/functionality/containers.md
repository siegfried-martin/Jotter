# Note Containers System

## Overview
Note containers hold multiple note sections and represent a single "document" or "note" within a collection.

## User Interface

### Container Sidebar
- Left sidebar showing all containers in current collection
- Containers listed in newest-first order
- Active container highlighted
- Click to switch between containers
- Drag to reorder within collection
- Drag to move between collections

### Container Management

#### Create Container
- **Trigger**: "Add Note" button in sidebar or Alt+N hotkey
- **Behavior**: Creates untitled container, focuses title for editing
- **Sections**: Starts with one empty code section by default
- **Navigation**: Immediately navigates to new container

#### Edit Container Title
- **Trigger**: Click title in sidebar or main view
- **Behavior**: Inline editing with optimistic updates
- **Validation**: Title cannot be empty (reverts to "Untitled")
- **Auto-save**: Changes saved automatically on blur/enter

#### Delete Container
- **Trigger**: Delete button or context menu
- **Confirmation**: Required if container has content
- **Cleanup**: All associated sections deleted
- **Navigation**: Redirects to first available container

### Container Navigation
- URL format: `/app/collections/{collection_id}/containers/{container_id}`
- Bookmarkable URLs for direct container access
- Breadcrumb navigation shows collection → container hierarchy
- Keyboard shortcuts for quick navigation

## Data Model

### Database Schema
```sql
note_container (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  user_id UUID REFERENCES auth.users(id),
  collection_id UUID REFERENCES collections(id),
  sequence INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Relationships
- Belongs to one collection
- Contains multiple note_sections
- Maintains sequence order (newest first by default)
- Cascade delete removes all sections

## Drag & Drop Behavior

### Within Collection
- Reorder containers using svelte-dnd-action
- Visual feedback during drag
- Optimistic sequence updates
- Smooth animations

### Cross-Collection Moves
- Drag container to collection tab
- Updates collection_id and sequence
- Cache invalidation for both collections
- Visual indicators for valid drop targets

## Technical Implementation

### Caching Strategy
- Containers cached per collection in AppDataManager
- Preloading of adjacent containers for fast navigation
- Optimistic updates for all CRUD operations

### Performance
- Lazy loading of container content
- Section previews generated on demand
- Efficient re-rendering with Svelte reactivity

## Testing Requirements
- [ ] E2E: Create container with default section
- [ ] E2E: Edit container title inline
- [ ] E2E: Delete container with confirmation
- [ ] E2E: Navigate between containers preserves state
- [ ] E2E: Drag reorder within collection
- [ ] E2E: Drag move between collections
- [ ] Unit: Container CRUD operations
- [ ] Unit: Sequence management (newest-first)
- [ ] Unit: Title validation and auto-save
