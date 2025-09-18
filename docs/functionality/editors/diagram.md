# Diagram Editor

## Overview
Excalidraw-based drawing and diagramming tool integrated into Jotter sections.

## Features

### Drawing Tools
- **Shapes**: Rectangle, circle, arrow, line, text
- **Freehand**: Pen tool for sketching
- **Text**: Editable text elements with font options
- **Colors**: Customizable stroke and fill colors
- **Layers**: Z-order management for elements

### Default Settings
- **Font**: Arial (normal, not handwritten)
- **Font Size**: 20px (medium)
- **Stroke**: Standard width and color
- **Background**: Transparent by default

### Integration Features
- **Thumbnail Generation**: Preview images for section grid
- **Full-Screen Mode**: Expanded editing interface
- **Auto-Save**: Seamless background saving
- **Export Options**: PNG, SVG export capabilities

## User Interface

### Toolbar
- Tool selection (select, rectangle, circle, etc.)
- Color picker for stroke and fill
- Font options and text formatting
- Zoom controls and view options
- Undo/redo functionality

### Canvas
- Infinite canvas with pan/zoom
- Grid option for precise alignment
- Snap-to-grid functionality
- Multi-select for bulk operations

### Keyboard Shortcuts
- **V**: Select tool
- **R**: Rectangle tool
- **C**: Circle tool
- **A**: Arrow tool
- **T**: Text tool
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Delete**: Delete selected elements

## Data Storage
- Excalidraw scene JSON format
- Element-based structure
- Preserves all visual properties
- Version-compatible across updates

## Performance Considerations
- Lazy loading of Excalidraw library
- Thumbnail caching for quick previews
- Efficient re-rendering for large diagrams
- Memory management for complex scenes

## Testing Requirements
- [ ] Unit: Scene serialization/deserialization
- [ ] Unit: Thumbnail generation
- [ ] Unit: Default settings application
- [ ] E2E: Drawing basic shapes
- [ ] E2E: Text creation and editing
- [ ] E2E: Color and style changes
- [ ] E2E: Export functionality
- [ ] E2E: Auto-save integration
