# Cache Architecture & Performance Technical Details

**Last Updated**: November 17, 2025
**Branch**: `feat/collection-cache-and-preloading` (ready for merge)
**Next Work**: Derived stores refactoring

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

## Planned: Derived Stores Architecture

### Solution Overview

Create **focused, granular stores** that only emit when their specific data changes.

### Implementation Plan

#### Phase 1: Create Derived Stores (30-45 min)

**File**: `src/lib/stores/derived/collections.ts`

```typescript
import { derived } from 'svelte/store';
import { appStore } from '../appDataStore';

// Only emits when allCollections array changes
export const allCollectionsStore = derived(
  appStore,
  $app => $app.allCollections
);

// Only emits when current collection ID changes
export const currentCollectionIdStore = derived(
  appStore,
  $app => $app.currentCollectionId
);

// Only emits when current collection DATA changes
export const currentCollectionStore = derived(
  appStore,
  $app => {
    if (!$app.currentCollectionId) return null;
    return $app.collectionData.get($app.currentCollectionId);
  }
);

// Only emits when current container ID changes
export const currentContainerIdStore = derived(
  appStore,
  $app => $app.currentContainerId
);

// Only emits when current container DATA changes
export const currentContainerStore = derived(
  appStore,
  $app => {
    if (!$app.currentCollectionId || !$app.currentContainerId) return null;
    const collData = $app.collectionData.get($app.currentCollectionId);
    return collData?.containers.find(c => c.id === $app.currentContainerId);
  }
);

// Loading states
export const isLoadingCollectionsStore = derived(
  appStore,
  $app => $app.loading.allCollections
);
```

#### Phase 2: Migrate Components (15 min each)

**Priority Order**:
1. **Header** → Use `allCollectionsStore` only
2. **CollectionTabs** → Use `allCollectionsStore`, `currentCollectionIdStore`
3. **Layout** → Use `currentCollectionStore`
4. **Container components** → Use `currentContainerStore`

**Before**:
```svelte
<!-- Header.svelte -->
<script>
  import { appStore } from '$lib/stores/appDataStore';
</script>

{#each $appStore.allCollections as collection}
  <Tab {collection} active={collection.id === $appStore.currentCollectionId} />
{/each}
```

**After**:
```svelte
<!-- Header.svelte -->
<script>
  import { allCollectionsStore, currentCollectionIdStore } from '$lib/stores/derived/collections';
</script>

{#each $allCollectionsStore as collection}
  <Tab {collection} active={collection.id === $currentCollectionIdStore} />
{/each}
```

#### Phase 3: Additional Derived Stores

Create as needed for other patterns:

```typescript
// src/lib/stores/derived/containers.ts
export const containersForCurrentCollection = derived(
  currentCollectionStore,
  $collection => $collection?.containers ?? []
);

// src/lib/stores/derived/sections.ts
export const sectionsForCurrentContainer = derived(
  [currentCollectionStore, currentContainerIdStore],
  ([$collection, $containerId]) => {
    if (!$collection || !$containerId) return [];
    return $collection.containerSections.get($containerId) ?? [];
  }
);
```

### Expected Results

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Header | Re-renders on every navigation | Only when collections change | ~90% fewer |
| CollectionTabs | Re-renders on every navigation | Only when collections/current ID change | ~80% fewer |
| Layout | Re-renders on every store update | Only when current collection changes | ~95% fewer |
| Container | Re-renders on every store update | Only when current container changes | ~95% fewer |

**Overall**: ~10x reduction in re-renders across the app.

---

## Testing Strategy

### Manual Testing Checklist

After implementing derived stores:

- [ ] Create new collection → Should navigate instantly, no errors
- [ ] Navigate between collection tabs → Should be instant, no flashing
- [ ] Navigate between containers → Should be instant, header doesn't re-render
- [ ] Edit a note → Only affected components update
- [ ] Delete a collection → Header updates, other components stable
- [ ] Refresh page → All data loads correctly
- [ ] Browser DevTools Performance → Verify reduced re-renders

### Debug Tools

Use Svelte DevTools or add temporary logging:

```svelte
<script>
  import { allCollectionsStore } from '$lib/stores/derived/collections';

  $: console.log('Header re-rendered at:', Date.now());
  $: console.log('Collections changed:', $allCollectionsStore.length);
</script>
```

---

## Migration Guidelines

### Do's
✅ Migrate components incrementally (one at a time)
✅ Test each component after migration
✅ Start with high-traffic components (Header, Layout)
✅ Keep appStore for writes, derived stores for reads
✅ Add new derived stores as patterns emerge

### Don'ts
❌ Don't migrate all components at once
❌ Don't remove appStore (still needed for updates)
❌ Don't over-optimize (add derived stores only when needed)
❌ Don't forget to test functionality after changes

---

## Future Optimizations

### After Derived Stores

1. **Memoization** - Cache expensive computations
2. **Virtual Scrolling** - For large lists of containers
3. **Lazy Loading** - Load sections on-demand (already implemented)
4. **Debounced Updates** - Batch rapid state changes
5. **Web Workers** - Offload heavy operations

### Performance Monitoring

Add metrics to track:
- Re-render frequency per component
- Time to interactive
- Navigation latency
- Memory usage

---

## Gotchas & Notes

### Important Behaviors

1. **Deep Cloning**: All data is deep cloned before caching (prevents mutation bugs)
2. **Map Invalidation**: When cache is invalidated, entire Map entry is removed
3. **Preloading Limit**: Only first 10 containers preloaded (adjustable in line 102)
4. **Sections On-Demand**: Section data still loads when viewing a container (not preloaded)
5. **SvelteKit Behavior**: Component instances are reused during navigation within layouts

### Debug Flags

Enable verbose logging:
```typescript
// src/lib/stores/core/appDataOperations.ts
const DEBUG = true;  // Add this flag to see all cache operations
```

### Common Issues

**Issue**: "Collection not found" after creation
**Fix**: Ensure `addCollectionOptimistically()` called before navigation

**Issue**: Stale data in UI
**Fix**: Check reactive statements reset state on ID changes

**Issue**: Re-renders still excessive after derived stores
**Fix**: Verify components subscribe to derived stores, not appStore

---

## For Next Session

### Before Starting Derived Stores Work

1. ✅ Merge `feat/collection-cache-and-preloading` branch
2. ✅ Pull latest main
3. ✅ Create new branch: `refactor/derived-stores-architecture`
4. ✅ Read this document fully
5. ✅ Identify 2-3 components to migrate first (recommend: Header, CollectionTabs, Layout)

### Success Criteria

- All high-traffic components use derived stores
- No more excessive re-renders (verify with DevTools)
- All functionality still works (test navigation, CRUD operations)
- Smoother UX (no flickering/flashing)

### Questions to Resolve

- Should we create a single derived stores file or split by domain?
- Do we need backwards compatibility with old store patterns?
- Should we add performance monitoring during migration?

---

**End of Technical Details**
**For questions**: Review code or ask in next session with this document as context.
