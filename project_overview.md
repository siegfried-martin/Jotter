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
- Drag & Drop: Hybrid system (Custom for sections, svelte-dnd-action for containers)

**Database Schema**:

```sql
-- Core tables with sequence and title support
note_container (id, title, user_id, collection_id, sequence, created_at, updated_at)
note_section (id, note_container_id, user_id, type, title, content, sequence, meta, checklist_data, created_at, updated_at)
collections (id, name, description, color, is_default, user_id, sequence, created_at, updated_at)
user_preferences (id, user_id, theme, default_editor, auto_save_delay, keyboard_shortcuts, last_visited_collection_id, last_visited_container_id, created_at, updated_at)

-- Database functions for sequence management
get_next_collection_sequence(user_id)
get_next_note_container_sequence(collection_id) -- Modified for newest-first ordering
get_next_note_section_sequence(note_container_id)
```

## Current Status - August 31, 2025

### Core Features Completed

- Multi-user authentication with Google OAuth
- Collection-based organization with color-coded tabs
- Real-time note editing with 4 editor types (code, rich text, diagrams, checklists)
- Editable section and container titles with optimistic updates
- Lightning-fast navigation with bookmarkable URLs
- Auto-save with local draft recovery
- Keyboard shortcuts for note creation (Alt+N, Alt+Shift+N, Ctrl+M, Ctrl+Shift+M)

### Cache-as-Database Architecture

- **AppDataManager**: Single source of truth cache system with request deduplication
- **Optimistic updates**: Instant UI feedback for all operations (drag, rename, create, delete)
- **Background preloading**: Collections and containers load automatically for fast navigation
- **Cache invalidation**: Proper cache updates when navigating back from edit pages

### Drag & Drop System (Complete)

- **Sections**: Custom drag system with live preview and optimistic updates
- **Containers**: svelte-dnd-action for within-collection reordering with visual feedback
- **Cross-collection container moves**: Working drag from containers to collection tabs
- **Cross-container section moves**: Drag sections between containers
- **Event chain**: Complete event forwarding through component hierarchy

### Recent Session Achievements - August 31, 2025

#### Compilation Issues Fixed

- Fixed corrupted Unicode characters in console.log statements causing build failures
- Cleaned up duplicate content in CollectionTabs.svelte

#### Cross-Collection Container Drag (Complete)

- Collection tabs are now svelte-dnd-action drop zones accepting containers
- Visual highlighting during drag operations on valid drop targets
- Proper event flow: ContainerList → AppHeader → App Layout → Collection Layout
- API integration with optimistic cache updates and rollback on failure

#### CRUD Operations Completed

- **Section creation**: Fixed container ID passing, proper cache updates, auto-navigation to edit
- **Section editing**: Cache updates when returning from edit page
- **Section deletion**: Confirmation dialogs with optimistic updates and rollback
- **Container creation**: Uses useNoteOperations with date-based titles ("New Note 8/31/2025")
- **Container deletion**: Confirmation, navigation handling, optimistic updates

#### Sequence Management Enhancement

- Modified get_next_note_container_sequence to use MIN(sequence) - 10 instead of MAX + 10
- New containers now appear first in sidebar (newest-first ordering)
- Maintains existing drag-and-drop reordering functionality

#### Keyboard Shortcuts (Complete)

- Collection-scoped shortcuts: Alt+N, Alt+Shift+N, Ctrl+M, Ctrl+Shift+M
- Visual hints displayed next to collection tabs
- Direct navigation to edit page for code sections

## Current Issues & Next Session Priorities

### UI/UX Polish Tasks

1. **Mobile drag & drop**: Disable dragging on mobile devices for better touch experience
2. **Mobile section cards**: Reduce card size for mobile viewport optimization
3. **CodeMirror language selection**: Fix language picker functionality in code editor
4. **Checklist UI improvements**: Better visual design for checklist items
5. **Excalidraw default text**: Change from handwritten to typed text style

### Known Technical Debt

- **Mixed drag systems**: Two different implementations (custom + svelte-dnd-action)
- **svelte-dnd-action boundaries**: Occasional snap-back behavior near drag boundaries
- **Error boundaries**: Need better error handling for drag system failures

## Architecture Notes

**Data Flow**: AppDataManager → Derived Stores → Components (reactive updates)
**Drag Systems**: Custom (sections) + svelte-dnd-action (containers) + HTML5 (cross-collection)
**Navigation**: URL-based context switching with cache preloading
**CRUD Pattern**: Optimistic updates → API call → Cache refresh → Rollback on error

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

## Files for Next Session

**UI Polish Files**:

- Mobile responsiveness in section grid and container layouts
- CodeMirror language selection component
- Checklist item styling and interactions
- Excalidraw editor configuration

**Key Components**:

- `SectionGrid.svelte` - Mobile card sizing
- `CodeEditor.svelte` - Language selection fixes
- `ChecklistEditor.svelte` - UI improvements
- `DiagramEditor.svelte` - Excalidraw text styling
- Mobile detection utilities for disabling drag

---

**Next Session Focus**: UI polish for mobile experience and editor improvements
