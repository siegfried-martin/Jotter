# E2E Test Coverage Plan

**Generated**: November 24, 2025
**Source**: `docs/functionality/` documentation
**Current Coverage**: 18/18 tests passing (Collections, Containers, Sections CRUD)

---

## Test Coverage Matrix

Legend:
- ✅ Implemented and passing
- ⚠️ Partially implemented or commented out
- ❌ Not implemented
- 🔄 In progress

---

## 1. Collections (`docs/functionality/collections.md`)

### Basic CRUD
- ✅ Create collection with all fields (name, color, description)
- ⚠️ Edit collection (TEST-001 commented out - needs investigation)
- ✅ Delete collection with confirmation
- ✅ Navigate between collections

### Advanced Features
- ❌ **Edit collection validation** - Update name, color, description
- ❌ **Collection name uniqueness** - Validate unique names per user
- ❌ **Default collection behavior** - Cannot delete default, always exists
- ❌ **Cross-collection container drag** - Move containers between collections
- ❌ **Cannot delete with containers** - Validation prevents deletion

**Priority**: High (edit test already exists but commented out)

---

## 2. Containers (`docs/functionality/containers.md`)

### Basic CRUD
- ✅ Create container (Alt+N hotkey)
- ✅ Navigate between containers
- ✅ Delete container
- ✅ Display section grid
- ✅ Multiple container creation

### Title Management
- ❌ **Edit container title inline** - Click title, edit, auto-save
- ❌ **Title validation** - Empty title reverts to "Untitled"
- ❌ **Title persistence** - Verify saves on blur/enter

### Drag & Drop
- ⚠️ **Drag reorder within collection** - Test exists but skips (needs 3+ containers)
- ❌ **Cross-collection moves** - Drag to collection tab
- ❌ **Visual feedback during drag** - Highlight drop zones

**Priority**: High (inline editing is core functionality)

---

## 3. Sections (`docs/functionality/sections.md`)

### Basic CRUD
- ✅ Create text/WYSIWYG section (Alt+T)
- ✅ Create code section (Alt+K)
- ✅ Create draw/diagram section (Alt+D)
- ✅ Create tasks/checklist section (Alt+L)
- ⚠️ Delete section (test found "Delete button not found")

### Title Management
- ❌ **Edit section title inline** - Header editing with auto-save
- ❌ **Default titles** - "Untitled {Type}" for new sections
- ❌ **Title persistence** - Save on blur/enter

### Drag & Drop
- ⚠️ **Reorder within container** - Test found "Drag handles not found"
- ❌ **Cross-container section moves** - Drag between containers
- ❌ **Optimistic updates** - Immediate UI feedback

### Auto-Save
- ❌ **Auto-save with delay** - 2 second default delay
- ❌ **Draft recovery** - Restore unsaved changes on reload
- ❌ **Save status indicators** - Visual feedback

**Priority**: High (delete and drag-drop tests are failing to find elements)

---

## 4. Checklist Editor (`docs/functionality/editors/checklist.md`)

### Item Management
- ❌ **Add checklist items** - Enter key creates new items
- ❌ **Edit item text** - Inline editing
- ❌ **Delete items** - Remove individual items
- ❌ **Toggle completion** - Check/uncheck boxes

### Progress & Priority
- ❌ **Progress calculation** - Track completion percentage
- ❌ **Progress bar display** - Visual progress indicator
- ❌ **Priority levels** - None, Low/Blue, Medium/Yellow, High/Red
- ❌ **Priority colors** - Full-width background coloring

### Dates & Organization
- ❌ **Due date picker** - Optional date selection
- ❌ **Date persistence** - Save and restore dates
- ❌ **Drag reorder items** - Reorder checklist items

### Keyboard Shortcuts
- ❌ **Enter key** - New item below current
- ❌ **Backspace** - Delete empty item
- ❌ **Tab navigation** - Focus next/previous field

**Priority**: Medium (checklist is complete feature)

---

## 5. Code Editor (`docs/functionality/editors/code.md`)

### Language Support
- ❌ **Language selection** - Dropdown menu with 50+ languages
- ❌ **Language persistence** - Save selection per section
- ❌ **Syntax highlighting** - Real-time updates on language change

### Editing Features
- ❌ **Code editing** - Type and modify code
- ❌ **Line numbers** - Always visible
- ❌ **Indentation preservation** - Smart indentation
- ❌ **Copy to clipboard** - Button in header

### Keyboard Shortcuts
- ❌ **Tab/Shift+Tab** - Indent/unindent
- ❌ **Ctrl+/** - Toggle comments
- ❌ **Ctrl+F** - Find in document
- ❌ **Ctrl+H** - Find and replace

**Priority**: Medium (core editor functionality)

---

## 6. Rich Text Editor (`docs/functionality/editors/rich-text.md`)

### Formatting
- ❌ **Text styles** - Bold, italic, underline, strikethrough
- ❌ **Headers** - H1, H2, H3 hierarchy
- ❌ **Lists** - Ordered and unordered
- ❌ **Links** - URL insertion and validation
- ❌ **Alignment** - Left, center, right, justify

### Content Management
- ❌ **Copy formatted text** - Preserve formatting
- ❌ **Paste handling** - Smart paste from external sources
- ❌ **Undo/Redo** - Full editing history

### Keyboard Shortcuts
- ❌ **Ctrl+B** - Bold
- ❌ **Ctrl+I** - Italic
- ❌ **Ctrl+U** - Underline
- ❌ **Ctrl+K** - Insert link
- ❌ **Ctrl+Z/Y** - Undo/Redo

**Priority**: Low (nice to have, not critical path)

---

## 7. Diagram Editor (`docs/functionality/editors/diagram.md`)

### Drawing Tools
- ❌ **Draw shapes** - Rectangle, circle, arrow, line
- ❌ **Freehand drawing** - Pen tool
- ❌ **Text elements** - Editable text with font options
- ❌ **Color selection** - Stroke and fill colors

### Default Settings
- ❌ **Default font** - Arial (normal, not handwritten)
- ❌ **Default size** - 20px medium font
- ❌ **Settings persistence** - Remember defaults

### Integration
- ❌ **Thumbnail generation** - Preview in section grid
- ❌ **Full-screen mode** - Expanded editing
- ❌ **Export options** - PNG, SVG export

**Priority**: Low (complex integration, working but not tested)

---

## Implementation Priority Order

### Phase 1: Fix Existing Test Issues (High Priority)
1. **TEST-001**: Investigate why collection edit test is commented out
2. **Section Delete**: Fix "Delete button not found" issue
3. **Section Drag**: Fix "Drag handles not found" issue
4. **Container Drag**: Create enough test data (3+ containers)

### Phase 2: Core CRUD Enhancements (High Priority)
5. Container title inline editing
6. Section title inline editing
7. Title validation (empty → "Untitled")
8. Collection edit validation

### Phase 3: Drag & Drop (Medium Priority)
9. Container reorder within collection (fix existing test)
10. Section reorder within container
11. Cross-container section moves
12. Cross-collection container moves

### Phase 4: Editor Features (Medium Priority)
13. Checklist item management (add, edit, delete, toggle)
14. Checklist progress and priorities
15. Code editor language selection and syntax highlighting
16. Code editor copy to clipboard

### Phase 5: Advanced Features (Lower Priority)
17. Rich text formatting and shortcuts
18. Diagram drawing and settings
19. Auto-save with draft recovery
20. Advanced keyboard shortcuts across editors

---

## Test Data Considerations

### Naming Convention
All test data uses: `e2e-test-{timestamp}-{random}-{description}`

### Cleanup Strategy
- Tests create their own resources in `beforeEach()`
- Tests clean up in `afterEach()`
- CASCADE DELETE handles sections/containers automatically
- Manual cleanup script for orphaned data: `npm run test:cleanup`

### Test Isolation
- Each test creates fresh collection/container/section
- No dependencies on existing data
- No interference between parallel tests

---

## Next Steps

1. Read existing test files to understand patterns
2. Fix commented out TEST-001 (collection edit)
3. Fix section delete and drag-drop selector issues
4. Implement Phase 1 fixes first
5. Move to Phase 2 core CRUD enhancements
6. Continue through phases based on priority

---

**Last Updated**: November 24, 2025
