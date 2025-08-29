# Jotter - Development Summary & Roadmap

## Project Goals

**Vision**: A lightning-fast, developer-focused note-taking web app that replaces Notepad++ for daily work management and serves as a "better whiteboard for devs."

**Core Philosophy**: "Notepad++ but better" - maintain extreme speed and simplicity while adding just enough structure to be useful.

**Key Values**:

- **Speed above all** - Zero friction, instant access, auto-save everything
- **Developer-centric** - Optimized for pseudocode, algorithms, and structured thinking
- **Minimal but powerful** - No bloat, just essential features done exceptionally well

## Current Architecture

**Tech Stack**:

- Frontend: SvelteKit + TypeScript + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Authentication: Google OAuth via Supabase Auth
- Editors: CodeMirror 6 (code) + Quill (rich text) + Excalidraw (diagrams)
- Drag & Drop: Custom Svelte-native system

**Database Schema**:

```sql
-- Core tables with sequence and title support
note_container (id, title, user_id, collection_id, sequence, created_at, updated_at)
note_section (id, note_container_id, user_id, type, title, content, sequence, meta, checklist_data, created_at, updated_at)
collections (id, name, description, color, is_default, user_id, sequence, created_at, updated_at)
user_preferences (id, user_id, theme, default_editor, auto_save_delay, keyboard_shortcuts, last_visited_collection_id, last_visited_container_id, created_at, updated_at)

-- Database functions for sequence management
get_next_collection_sequence(user_id)
get_next_note_container_sequence(collection_id)
get_next_note_section_sequence(note_container_id)
```

## Current Status - August 29, 2025

### Core Features Completed

- Multi-user authentication with Google OAuth
- Collection-based organization with color-coded tabs
- Real-time note editing with 4 editor types (code, rich text, diagrams, checklists)
- Editable section and container titles with optimistic updates
- Lightning-fast navigation with bookmarkable URLs
- Auto-save with local draft recovery
- Keyboard shortcuts (Ctrl+M, Ctrl+Shift+M, etc.)

### Cache-as-Database Architecture Implementation

- **AppDataManager**: Single source of truth cache system replacing multiple store patterns
- **Request deduplication**: Prevents duplicate API calls during concurrent navigation
- **Optimistic updates**: Instant UI feedback for all edit operations (drag, rename, create)
- **Background preloading**: Collections and top containers load automatically for fast navigation
- **Real-time collaboration ready**: Architecture supports WebSocket integration for multi-user scenarios

### DnD System - Completed Migration

- **Section reordering**: Custom drag system with live preview and optimistic updates
- **Cross-container section moves**: Drag sections between containers with immediate UI updates
- **Container reordering**: New sequence-based ordering (not timestamp-based)
- **Section renaming**: Fixed event chain from editable titles to API persistence
- **Visual drag ghosts**: Working drag previews for all item types

## Recent Session Achievements - August 29, 2025

### Cache System Refactor

- Migrated from multiple competing cache systems to unified AppDataManager
- Implemented request deduplication to prevent duplicate API calls
- Added background collection preloading for instant navigation
- Fixed UI flickering during optimistic updates with server response comparison

### DnD System Completion

- Fixed section drag ghost rendering by registering both container and section behaviors
- Implemented optimistic cross-container moves without cache invalidation
- Resolved stale index issues in cross-container operations by using section IDs
- Changed container sorting from `updated_at` to `sequence` to prevent unwanted reordering

### Bug Fixes

- Section title editing now works end-to-end with proper API parameter passing
- Navigation between containers updates cache context reactively
- Container selection highlights correctly after navigation
- Cross-container moves no longer trigger container reordering side effects

## Next Session Priorities

### Container Drag Issues

**Problem**: Container dragging within sidebar may have issues after cache system changes

**Files to Check**:

- `src/lib/composables/useContainerDragBehaviors.ts` - Container behavior implementation
- `src/lib/dnd/behaviors/ContainerDragBehavior.ts` - Container drag logic
- `src/routes/app/collections/[collection_id]/+layout.svelte` - Container reorder handling

### Cross-Collection Container Movement

**Goal**: Drag containers between collections via header tabs

**Implementation Strategy**:

1. Extend `ContainerDragBehavior` to detect drops on collection tabs
2. Add drop zones to collection tabs in header
3. Implement cross-collection move using existing backend methods
4. Update container lists in both source and target collections

**Key Files**:

- `src/lib/components/containers/ContainerList.svelte` - Current container DnD
- `src/lib/components/layout/CollectionTabs.svelte` - Drop targets for collections
- `src/lib/services/noteService.ts` - Backend `moveToCollection()` method
- `src/lib/dnd/behaviors/ContainerDragBehavior.ts` - Extend for cross-collection drops

### Remaining Legacy DnD

**Items still using svelte-dnd-action**:

- Checklist item reordering within sections
- Collection tabs reordering (if implemented)

## Architecture Notes

**Data Flow**: AppDataManager -> Derived Stores -> Components (reactive updates)
**Drag System**: DragProvider with behavior registry for different item types
**Navigation**: Reactive URL-based context switching with cache preloading
**Real-time Ready**: Optimistic updates + WebSocket integration points prepared

## Deployment Information

**Production Environment**:

- **URL**: https://jotter.marstol.com
- **Server**: Ubuntu DigitalOcean (138.197.71.191)
- **Service**: `jotter.service` (systemd)
- **Database**: Supabase production project

**Management Commands**:

```bash
# Service management
sudo systemctl start jotter
sudo systemctl restart jotter
sudo systemctl status jotter

# View logs
sudo journalctl -u jotter -f

# Update deployment
cd ~/Jotter && git pull && npm run build && sudo systemctl restart jotter
```

---

**Next Session Focus**: Complete container drag functionality and implement cross-collection container movement
