# Component Architecture

## Application Structure

```
App.svelte
├── routes/
│   ├── +layout.svelte (auth guard)
│   ├── login/
│   │   └── +page.svelte (LoginPage)
│   └── app/
│       ├── +layout.svelte (AppLayout)
│       ├── +page.svelte (redirect to default collection)
│       └── collections/[id]/
│           ├── +page.svelte (CollectionPage)
│           └── containers/[containerId]/
│               ├── +page.svelte (ContainerPage) 
│               └── edit/
│                   └── +page.svelte (EditPage)
```

## Core Layout Components

### AppLayout
- **Purpose**: Main application shell with collections bar
- **Children**: CollectionsBar, page content
- **State**: Current user, collections list
- **Responsibilities**: Navigation, user menu, global shortcuts

### CollectionPage  
- **Purpose**: Collection view with container sidebar + section grid
- **Children**: ContainerSidebar, SectionGrid, modals
- **State**: Current collection, containers, sections
- **Responsibilities**: Container management, drag & drop coordination

### ContainerPage
- **Purpose**: Individual container view (large file - refactor candidate)
- **Children**: Section management, drag providers, edit controls
- **State**: Current container, sections, drag state
- **Responsibilities**: Section CRUD, drag & drop, navigation

## Content Components

### Section Components
```
SectionGrid.svelte
├── SectionCard.svelte (preview)
│   ├── CodeContent.svelte
│   ├── RichTextContent.svelte  
│   ├── ChecklistContent.svelte
│   └── DiagramContent.svelte
└── SectionEditModal.svelte
    ├── CodeMirrorEditor.svelte
    ├── QuillEditor.svelte
    ├── ChecklistEditor.svelte
    │   └── SortableChecklistItem.svelte
    └── ExcalidrawEditor.svelte
```

### Editor Hierarchy
- **Base**: Common editor interface (save, cancel, shortcuts)
- **Specific**: Type-specific editing logic
- **Content**: Read-only preview components

## Drag & Drop Architecture

### Drag Providers
```
DragProvider.svelte (context)
├── SectionDragBehavior (custom system)
├── ContainerDragBehavior (svelte-dnd-action)  
└── CrossCollectionDropTarget (HTML5)
```

### Event Flow
```
Component Drag → Behavior Handler → Context Update → Parent Handler → Cache Update
```

## State Management Components

### AppDataManager Integration
```
+layout.svelte
├── AppDataManager.init()
├── Derived stores creation  
├── Component subscriptions
└── Cache preloading triggers
```

### Store Composition
- **Entity stores**: collections, containers, sections
- **UI stores**: currentCollection, currentContainer, dragState
- **User stores**: preferences, theme, shortcuts

## Modal System

### Modal Architecture
```
ModalProvider.svelte (portal)
├── ConfirmDialog.svelte
├── CollectionEditModal.svelte
├── ContainerEditModal.svelte
└── SectionEditModal.svelte
    └── [Editor Components]
```

### Modal State Management
- Global modal store
- Component-specific modal triggers
- Keyboard shortcuts (Escape to close)
- Focus management for accessibility

## Component Communication

### Props Down, Events Up
```javascript
// Parent → Child (props)
<SectionCard 
  section={section} 
  onEdit={handleEdit}
  onDelete={handleDelete} />

// Child → Parent (events)  
createEventDispatcher()
dispatch('edit', { sectionId });
```

### Context for Deep Passing
```javascript
// Drag context
setContext('drag', {
  startDrag,
  endDrag, 
  dragState
});

// App context
setContext('app', {
  currentUser,
  preferences,
  dataManager
});
```

## Performance Considerations

### Large Lists
- Virtual scrolling for many containers/sections
- Lazy loading of section content
- Efficient re-rendering with key attributes

### Heavy Components
- Code splitting for editor libraries
- Lazy imports for Excalidraw/Quill
- Preloading critical components

### Memory Management
- Component cleanup on navigation
- Store subscription cleanup
- Cache eviction for unused data

## Refactoring Opportunities

### Large Files (>200 lines)
1. **ContainerPage** (400+ lines) → Split into multiple components
2. **SectionGrid** → Extract section management logic
3. **AppDataManager** → Break into focused modules

### Code Duplication
- Editor wrapper patterns
- Modal trigger patterns  
- Drag & drop event handling
- CRUD operation patterns

### Component Extraction Candidates
- Section header controls
- Drag handle components
- Loading/error boundary wrappers
- Form validation components
