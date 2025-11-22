# Cache Architecture & Performance Technical Details

**Last Updated**: November 20, 2025
**Branch**: `fix/multiple-bugs-and-cache-optimization` (includes full section preloading)
**Status**: Stable - cache architecture is complete and working well

---

## Current Cache Architecture

### Overview

Jotter uses a **cache-as-database** pattern for instant UI updates. The core cache is stored in `appStore` and managed by `AppDataManager`.

### Store Structure

```typescript
// src/lib/stores/core/appDataCore.ts
interface AppData {
  // All collections (for header tabs)
  allCollections: Collection[];
  allCollectionsLoaded: boolean;

  // Collection-specific cache
  collectionData: Map<string, {
    collection: Collection;
    containers: NoteContainer[];  // Notes in this collection
    containerSections: Map<string, NoteSection[]>;  // Sections per note
    lastUpdated: number;
  }>;

  // Current navigation context
  currentCollectionId: string | null;
  currentContainerId: string | null;

  // Loading/error states
  loading: { allCollections: boolean; /* ... */ };
  errors: { allCollections: string | null; /* ... */ };
}
```

### Key Files

- **`src/lib/stores/appDataStore.ts`** - AppDataManager class, public API
- **`src/lib/stores/core/appDataCore.ts`** - Store definition and types
- **`src/lib/stores/core/appDataOperations.ts`** - Data loading operations
- **`src/lib/stores/core/appDataUpdates.ts`** - Optimistic cache updates
- **`src/lib/stores/core/appDataUtils.ts`** - Context and utility functions

---

## Recent Fixes (November 17, 2025)

### Bug #1: Collection Creation Infinite Loop

**Problem**: Creating a collection caused infinite loop/errors when navigating to it.

**Root Cause**:
1. Collection created in database ✓
2. Navigation to `/app/collections/{id}` ✓
3. Layout loader checks cache for collection → **NOT FOUND** ✗
4. Returns `fromCache: false`
5. Page detects cache miss → invalidates cache → loads from API
6. After load, re-renders → still sees `fromCache: false` → infinite loop

**Solution**: `addCollectionOptimistically()` in `appDataUpdates.ts:125-175`
- Adds new collection to BOTH `allCollections` AND `collectionData` Map
- Called before navigation in `src/routes/app/+page.svelte:handleCreateCollection()`
- Now cache hit on first render → no loop

### Bug #2: Navigation State Stale UI

**Problem**: Navigating between collections showed wrong `redirectStatus` message.

**Root Cause**: SvelteKit reuses component instances when navigating within same layout. Component state variables (`isRedirecting`, `redirectStatus`) persisted between collections.

**Solution**: Reactive state reset in `+page.svelte:19-24`
```javascript
$: if (data.collectionId) {
  isRedirecting = false;
  redirectStatus = 'Loading...';
  hasTriedFresh = false;
}
```

### Bug #3: Spinner Flash on Navigation

**Problem**: Brief loading spinner when clicking collection tabs, even though data was cached.

**Root Cause**: Redirect logic always set `isRedirecting = true`, triggering loading template.

**Solution**: Fast redirect path for cached data in `+page.svelte:50-56`
```javascript
if (data.fromCache && data.containers && data.containers.length > 0) {
  performRedirect();  // Skip loading state
} else {
  handleCollectionRedirect();  // Show loading
}
```

---

## New Feature: Collection Preloading

### Implementation

**Location**: `src/lib/stores/core/appDataOperations.ts:90-129`

**Flow**:
1. App loads → calls `loadAllCollections()` (line 61)
2. Loads collection metadata from API
3. NEW: Calls `preloadCollectionContainers(collections)` (line 93)
4. For each collection in parallel:
   - Fetches containers via `NoteService.getNoteContainers()`
   - Limits to first 10 containers (line 102)
   - Updates `collectionData` Map in cache (line 105-118)
5. All collections now cached with containers

**Benefits**:
- Zero network requests when navigating between collections
- Instant navigation (no loading states)
- Parallel loading for speed
- Memory-efficient (10 container limit)

**Console Output**:
```
Loading all collections from API...
All collections loaded and cached: 5
🚀 Preloading containers for all collections...
✅ Preloaded 3 containers for: my first collection
✅ Preloaded 0 containers for: test3
🎉 Preloading complete!
```

---

## Current Performance Issues

### Problem: Excessive Re-renders

**Symptoms**:
- UI flashes/flickers during navigation
- Components re-render when unrelated data changes
- Jarring user experience

**Root Cause**: Monolithic store subscriptions

When ANY field in `appStore` updates, ALL components with `$appStore` re-render:

```svelte
<!-- Header.svelte -->
{#each $appStore.allCollections as collection}
  <!-- Re-renders when currentCollectionId changes ❌ -->

<!-- Layout.svelte -->
{@const data = $appStore.collectionData.get($appStore.currentCollectionId)}
  <!-- Re-renders when allCollections updates ❌ -->

<!-- Container.svelte -->
{#each $appStore.collectionData.get(id).containers as container}
  <!-- Re-renders when currentCollectionId changes ❌ -->
```

**Impact**:
- Header re-renders on every collection/container navigation (doesn't need to!)
- Layout re-renders when unrelated collections update
- Performance degrades with more data

---

## Recent Updates (November 20, 2025)

### Full Section Preloading
The cache now preloads **all sections** for the first 10 containers in each collection during app startup. This provides instant navigation with zero loading time for most common use cases.

**Key Changes**:
- `preloadCollectionContainers()` now fetches sections in parallel for each container
- Sections are stored in `containerSections` Map during initial cache population
- Existing sections are preserved when updating cache (prevents disappearing sections bug)

### Load More Functionality
For collections with more than 10 containers, a "Load More" button fetches and caches the remaining containers on demand.

**Implementation**: See `ContainerList.svelte:179-200`

---

## Cache Performance

### Current Behavior
- **App Startup**: Synchronous blocking load of all collections + first 10 containers + all their sections
- **Navigation**: Instant (data already in cache)
- **Load More**: On-demand fetch for containers beyond first 10
- **Re-renders**: Minimal - components only update when relevant data changes

### Preloading Strategy
```typescript
// From appDataOperations.ts:93-150
async function preloadCollectionContainers(collections: Collection[]): Promise<void> {
  const preloadPromises = collections.map(async (collection) => {
    // Fetch first 10 containers
    const containers = await NoteService.getNoteContainers(collection.id);
    const limitedContainers = containers.slice(0, 10);

    // Fetch sections for all 10 containers in parallel
    const sectionPromises = limitedContainers.map(async (container) => {
      const sections = await SectionService.getSections(container.id);
      return { containerId: container.id, sections };
    });

    const sectionResults = await Promise.all(sectionPromises);

    // Store in cache with existing sections preserved
    containerSections.set(containerId, deepCloneArray(sections));
  });

  await Promise.all(preloadPromises);
}
```

---

## Gotchas & Notes

### Important Behaviors

1. **Deep Cloning**: All data is deep cloned before caching (prevents mutation bugs)
2. **Existing Data Preservation**: When updating cache, existing sections are preserved (line 113 in appDataOperations.ts)
3. **Preloading Limit**: First 10 containers preloaded per collection (adjustable)
4. **Section Preloading**: All sections for the 10 containers are preloaded (not on-demand)
5. **SvelteKit Behavior**: Component instances are reused during navigation within layouts

### Debug Flags

Enable verbose logging by checking console output:
```typescript
// Extensive logging already in place
console.log('🚀 Preloading containers for all collections...');
console.log('✅ Preloaded X containers + Y sections for: Collection Name');
```

### Common Issues

**Issue**: "Collection not found" after creation
**Fix**: Ensure `addCollectionOptimistically()` called before navigation (already implemented)

**Issue**: Sections disappearing after tab navigation
**Fix**: Preserve existing sections when updating cache (fixed in line 113)

**Issue**: Drag area too large on section cards
**Fix**: Restrict click/drag detection to `.section-card-base` (fixed in DragDetection.ts and DragZone.svelte)

---

**End of Technical Details**
**For questions**: Review code or ask in next session with this document as context.
