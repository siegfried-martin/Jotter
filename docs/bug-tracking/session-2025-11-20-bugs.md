# Bug Fixing Session - November 20, 2025

## Session Goals
Fix multiple unconnected bugs in one batch, then user verification round.

## Bug List

### BUG-001: Tab navigation causes full reload
**Status**: Pending
**Priority**: High
**Description**: Travelling back to a different tab and back causes a full reload and rerender
**Related**: BUG-002 (likely same root cause)

### BUG-002: Sections disappear after tab navigation
**Status**: Pending
**Priority**: High
**Description**: Travelling to a different tab and back causes the current note container to have no sections after the reload
**Related**: BUG-001 (likely same root cause)

### BUG-003: Section card click/drag area incorrect
**Status**: Pending
**Priority**: Medium
**Description**: The entire `.section-card-container` is both clickable and draggable, when it should be the child `.section-card-base`

### BUG-004: Scrolling issue on collections page
**Status**: Pending
**Priority**: Medium
**Description**: Removed all overflow from body to prevent double scrollbars in container page, but now collections page has no vertical scrolling. Need either: (a) different fix for double scroll on container page, or (b) parent of collection cards to allow scrolling

### BUG-005: Container card click causes unnecessary rerenders
**Status**: Pending
**Priority**: Medium
**Description**: Clicking a different note container card rerenders both the entire list of note container cards AND the note sections grid. Should only rerender the note sections grid.

### BUG-006: Diagram thumbnails flash after render
**Status**: Pending
**Priority**: Low
**Description**: Thumbnail for diagram type note section cards rerenders (flashes) 1 second after the note section grid renders

### FEATURE-001: Delete empty sections on cancel
**Status**: Pending
**Priority**: Low
**Type**: Feature Request
**Description**: Empty note sections should be deleted if the original content is empty and the user clicks "cancel" from the edit modal

## Progress Tracking

- **Total Issues**: 7 (6 bugs + 1 feature)
- **Completed**: 7
- **In Progress**: 0
- **Pending**: 0

## Session Notes

### Fixes Applied

#### BUG-001 & BUG-002: Tab Navigation Reload and Sections Disappearing
**Root Cause**: Collection tabs always navigated to `/app/collections/{id}`, triggering redirect logic and causing loading states and cache resets.

**Solution**:
- Added `lastVisitedContainerByCollection` Map to AppDataCore to track last visited container per collection
- Modified `CollectionTabs` to navigate directly to the last-visited container (or first container) for cached collections
- This bypasses the collection redirect page entirely, eliminating loading flashes and section disappearance

**Files Modified**:
- `src/lib/stores/core/appDataCore.ts` - Added lastVisitedContainerByCollection to AppData interface
- `src/lib/stores/core/appDataUtils.ts` - Updated setCurrentContext to track last visited per collection, added getLastVisitedContainer function
- `src/lib/stores/appDataStore.ts` - Exposed getLastVisitedContainer through AppDataManager
- `src/lib/components/layout/CollectionTabs.svelte` - Navigate directly to containers instead of collection page

#### BUG-003: Section Card Click/Drag Area
**Root Cause**: Outer wrapper div `.section-card-container` was unnecessary and confused the interaction area.

**Solution**: Removed the outer wrapper, making `.section-card-base` the root element.

**Files Modified**:
- `src/lib/components/sections/shared/SectionCardContainer.svelte` - Removed outer wrapper div, consolidated styles

#### BUG-004: Collections Page Scrolling
**Root Cause**: Collection layout had `overflow-hidden` which prevented the collections page from scrolling vertically.

**Solution**: Added scrollable wrapper with `overflow-y-auto` to the collections page.

**Files Modified**:
- `src/routes/app/+page.svelte` - Added scrollable wrapper with proper height

#### BUG-005: Unnecessary Container Card Rerenders
**Root Cause**: Reactive statement `$: dndContainers = containers.map(container => ({ ...container }))` created new objects on every prop change, causing full list rerenders when only selectedContainer changed.

**Solution**: Removed reactive spreading, only update dndContainers when containers reference actually changes.

**Files Modified**:
- `src/lib/components/containers/ContainerList.svelte` - Changed reactive container copying to reference-based update

#### BUG-006: Diagram Thumbnail Flash
**Root Cause**: Thumbnail generated twice - once on mount (100ms) and again from reactive statement (1500ms).

**Solution**: Added `hasInitialized` flag to prevent reactive statement from triggering until after initial mount generation.

**Files Modified**:
- `src/lib/components/DiagramThumbnail.svelte` - Added initialization tracking to prevent double generation

#### FEATURE-001: Delete Empty Sections on Cancel
**Implementation**: Modified cancel handler to detect empty sections (no content/checklist items) and automatically delete them when user cancels.

**Files Modified**:
- `src/routes/app/collections/[collection_id]/containers/[container_id]/edit/[section_id]/+page.svelte` - Enhanced handleCancel to delete empty sections

### Verification Needed
All 7 issues have been fixed and are ready for user verification.
