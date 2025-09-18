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

## Current Status - September 13, 2025

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

### Recent Session Achievements - September 13, 2025

#### Database Schema Fixes

- **Fixed container deletion foreign key constraint**: Modified `user_preferences_last_visited_container_id_fkey` to include `ON DELETE SET NULL`, preventing foreign key violations when deleting currently visited containers

#### Excalidraw Editor Improvements

- **Default font settings**: Changed from handwritten to normal font (Arial) and medium size (20px) for new text elements

#### Checklist System Overhaul

- **Mobile-first redesign**: Progress bar hidden on mobile, full-width items for better space utilization
- **Removed date shortcuts**: Eliminated T/M/W quick date buttons and Ctrl+T/M/W hotkeys
- **Removed date validation**: No min/max restrictions on date inputs for user flexibility
- **Colorblind-friendly priority system**: Changed from red/green to red/yellow/blue priority colors
- **Simplified mobile interface**: Priority and date controls hidden on mobile, only essential elements shown
- **Full-width background coloring**: Priority colors now affect entire checklist item background in both editor and preview
- **Icon cleanup**: Removed priority icons from item display, kept only in dropdown
- **Improved layout**: Reordered controls on desktop (checkbox → date → priority → text → delete) for better visual balance

#### Section Drag & Drop System Restoration

- **Fixed missing DragProvider**: Container deletion accidentally removed DragProvider wrapper from ContainerPageLayout
- **Restored section dragging**: Re-added DragProvider with SectionDragBehavior to container page component
- **Connected drag callbacks**: Linked section reordering and cross-container moves to existing optimistic update handlers

#### CodeMirror Language Selection Fix

- **Fixed language switching errors**: Resolved "Cannot read properties of undefined (reading 'of')" errors
- **Simplified reconfiguration**: Replaced complex compartment system with editor recreation approach
- **Persistent language selection**: Language choice now correctly saves and restores across page refreshes
- **Real-time syntax highlighting**: Language changes now immediately update syntax highlighting

#### Application UI Updates

- **App name change**: Updated displayed name from "Jotter" to "Jotter" in application interface

## Current Issues & Next Session Priorities

### UI/UX Polish Tasks

1. **Mobile drag & drop**: Disable dragging on mobile devices for better touch experience
2. **Mobile section cards**: Reduce card size for mobile viewport optimization

### Known Technical Debt

- **Mixed drag systems**: Two different implementations (custom + svelte-dnd-action)
- **svelte-dnd-action boundaries**: Occasional snap-back behavior near drag boundaries
- **Error boundaries**: Need better error handling for drag system failures
- **Large container page file**: Container +page.svelte has grown to ~400+ lines, could benefit from refactoring

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
- Mobile detection utilities for disabling drag

**Key Components**:

- `SectionGrid.svelte` - Mobile card sizing
- Mobile detection utilities for disabling drag

**Recently Modified Files**:

- `CodeMirrorEditor.svelte` - Language switching system fixed
- `ChecklistEditor.svelte` - Mobile-optimized with priority system
- `SortableChecklistItem.svelte` - Reordered layout and colorblind-friendly colors
- `ChecklistContent.svelte` - Matching priority colors for preview cards
- `ExcalidrawEditor.svelte` - Default font settings updated
- Container page `+page.svelte` - DragProvider restoration and behavior registration

## Next Steps

**Testing Phase**:

- Deploy current version to test users for feedback collection
- Gather usage patterns and identify friction points
- Document bug reports and feature requests from real-world usage

**Domain & Infrastructure**:

- Secure dedicated domain for production deployment (currently on subdomain)
- Update DNS and SSL configuration for new domain
- Plan migration strategy from subdomain to primary domain

**Post-Testing Actions**:

- Prioritize fixes based on user feedback severity and frequency
- Address critical bugs before broader release
- Consider additional UI polish based on user behavior observations

---

**Next Session Focus**: Mobile responsiveness and final UI polish for beta release
