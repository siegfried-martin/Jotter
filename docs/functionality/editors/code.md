# Code Editor

## Overview
CodeMirror 6-based editor with syntax highlighting, language selection, and developer-focused features.

## Features

### Language Support
- 50+ programming languages supported
- Dynamic language switching
- Persistent language selection per section
- Real-time syntax highlighting updates

### Editor Features
- **Line Numbers**: Always visible
- **Indentation**: Smart indentation preservation
- **Folding**: Code block folding/expanding
- **Search**: Find/replace functionality
- **Auto-completion**: Context-aware suggestions
- **Bracket Matching**: Highlight matching brackets

### Keyboard Shortcuts
- **Tab**: Indent selection or insert tabs
- **Shift+Tab**: Unindent selection  
- **Ctrl+/**: Toggle line comments
- **Ctrl+F**: Find in document
- **Ctrl+H**: Find and replace

## Language Selection
- Dropdown menu in section header
- Popular languages prioritized
- Search/filter functionality
- Auto-detection based on file extension hints

## Copy to Clipboard
- Button in section header
- Copies raw code content
- Visual feedback on successful copy
- Fallback for unsupported browsers

## Auto-Save Integration
- Real-time content synchronization
- Draft recovery on page reload
- Optimistic updates for smooth UX
- Conflict resolution for concurrent edits

## Technical Implementation

### CodeMirror Configuration
```javascript
{
  extensions: [
    basicSetup,
    languageExtension,
    indentWithTab,
    searchKeymap,
    autocompletion()
  ],
  theme: 'light' | 'dark'
}
```

### Language Switching
- Recreation approach for reliability
- Preserves cursor position and scroll
- Immediate syntax highlighting update
- No compartment system complexity

## Testing Requirements
- [ ] Unit: Language switching functionality
- [ ] Unit: Content serialization  
- [ ] Unit: Auto-save integration
- [ ] E2E: Code editing with syntax highlighting
- [ ] E2E: Language selection and persistence
- [ ] E2E: Copy to clipboard functionality
- [ ] E2E: Keyboard shortcuts
- [ ] E2E: Find/replace functionality
