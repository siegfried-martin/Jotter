# Data Flow Architecture

## Overview
Jotter uses a cache-as-database pattern with the AppDataManager as the single source of truth.

## AppDataManager Pattern

### Core Concept
```
API Layer → AppDataManager Cache → Derived Stores → Components
```

### Key Principles
1. **Single Source of Truth**: All data flows through AppDataManager
2. **Optimistic Updates**: UI updates immediately, API calls happen async
3. **Request Deduplication**: Prevents multiple identical API calls
4. **Background Preloading**: Adjacent data loaded proactively

### Cache Invalidation Strategy
- **Create**: Add to cache immediately, sync to API
- **Update**: Modify cache first, then API call
- **Delete**: Remove from cache, then API cleanup
- **Navigation**: Trigger cache refresh for destination data

## Data Entities

### Collections
```javascript
// Cache structure
collections: Map<string, Collection>
userCollections: Collection[]

// Flow
Component → createCollection() → Cache Update → API Call → UI Refresh
```

### Containers
```javascript
// Cache structure  
containers: Map<string, Container>
collectionContainers: Map<collectionId, Container[]>

// Flow
Component → createContainer() → Cache Insert → Navigate → API Sync
```

### Sections
```javascript
// Cache structure
sections: Map<string, Section>  
containerSections: Map<containerId, Section[]>

// Flow
Component → updateSection() → Cache Update → Debounced API Save
```

## State Management

### Svelte Stores
- **Derived stores** subscribe to AppDataManager cache changes
- **Reactive updates** trigger component re-renders automatically
- **Store composition** allows complex data relationships

### Optimistic Updates
```javascript
// Pattern for all mutations
async function updateEntity(id, changes) {
  // 1. Update cache immediately
  cache.update(id, changes);
  
  // 2. Update UI (automatic via stores)
  
  // 3. API call in background
  try {
    await api.update(id, changes);
  } catch (error) {
    // 4. Rollback on failure
    cache.rollback(id);
    showError(error);
  }
}
```

## Navigation & URL State

### URL Structure
```
/app                                    - Default collection
/app/collections/{collectionId}         - Specific collection  
/app/collections/{collectionId}/containers/{containerId} - Container view
/app/collections/{collectionId}/containers/{containerId}/edit - Edit mode
```

### State Synchronization
- URL params drive data loading
- AppDataManager preloads related data
- Browser back/forward preserved
- Bookmarkable URLs maintained

## Auto-Save System

### Debounced Saves
```javascript
// Auto-save configuration
AUTO_SAVE_DELAY = 2000ms; // Configurable per user

// Pattern
onContentChange(content) {
  // 1. Update local state immediately
  localContent = content;
  
  // 2. Debounce API save
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveToAPI(content);
  }, AUTO_SAVE_DELAY);
}
```

### Draft Recovery
- Local storage backup for unsaved changes
- Recovery prompt on page reload
- Merge conflict resolution

## Error Handling

### Network Failures
- Retry with exponential backoff
- Queue operations for offline scenario
- User notification of sync status

### Validation Errors
- Client-side validation first
- Server validation as backup
- Clear error messaging to user

### Cache Consistency
- Periodic cache refresh
- Conflict detection and resolution
- Manual refresh option for users
