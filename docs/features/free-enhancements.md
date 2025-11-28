# Free Feature Enhancements

**Status**: Planned
**Priority**: Post-initial release
**Dependencies**: Current release complete, user feedback gathered

---

## Overview

These features enhance Jotter for developers without requiring a backend or payment infrastructure. They build on the existing SvelteKit + Supabase architecture.

---

## Features

### 1. Copy Text as Markdown

**Description**: Add a "Copy as Markdown" option to text (WYSIWYG) sections that converts HTML content to Markdown format.

**User Story**: As a developer, I want to copy my notes as Markdown so I can paste them into GitHub READMEs, documentation, or other Markdown-based tools.

**Implementation Notes**:
- Use `turndown` library for HTML → Markdown conversion
- Add button to section card header (next to existing copy button)
- Alternatively, add to a dropdown menu on the copy button

**Complexity**: Low

**Files Likely Affected**:
- `src/lib/components/sections/SectionCard.svelte`
- `src/lib/components/sections/utils/sectionUtils.ts`

---

### 2. Image Section (Clipboard Paste)

**Description**: New section type that displays images. Users can paste images directly from clipboard (e.g., Windows+Shift+S screenshots).

**User Story**: As a developer, I want to paste screenshots directly into my notes so I can document bugs, UI states, or diagrams quickly.

**Implementation Notes**:
- New section type: `image`
- Storage: Supabase Storage bucket for images
- Section card shows image thumbnail/preview
- Edit page shows full-size image (view only, no editing initially)
- Intercept paste events on the section grid or via dedicated paste zone

**Complexity**: Medium

**Technical Considerations**:
- Image compression before upload (client-side)
- Lazy loading for performance
- Storage quota awareness
- Supported formats: PNG, JPG, GIF, WebP

**Files Likely Affected**:
- `src/lib/types/index.ts` (add image section type)
- New: `src/lib/components/sections/content/ImageContent.svelte`
- New: `src/lib/components/editors/ImageViewer.svelte`
- `src/lib/services/` (new storage service)

---

### 3. Markdown Section with Side-by-Side Editor

**Description**: New section type for Markdown with a split-pane editor showing source on the left and rendered preview on the right.

**User Story**: As a developer, I want to write in Markdown with live preview so I can create well-formatted technical documentation.

**Implementation Notes**:
- New section type: `markdown`
- Consider existing libraries:
  - **bytemd** - lightweight, good side-by-side support
  - **milkdown** - Svelte-friendly, WYSIWYG-ish Markdown
  - **monaco-editor** - powerful but heavy
- Content stored as raw Markdown text (not HTML)
- Section card preview renders Markdown to HTML

**Complexity**: Medium

**Technical Considerations**:
- Bundle size impact of editor library
- Syntax highlighting for code blocks within Markdown
- Mobile experience (side-by-side may need to stack)

**Files Likely Affected**:
- `src/lib/types/index.ts` (add markdown section type)
- New: `src/lib/components/sections/content/MarkdownContent.svelte`
- New: `src/lib/components/editors/MarkdownEditor.svelte`

---

### 4. Advanced Section Picker UI

**Description**: Replace or augment the current "Add Section" buttons with a categorized picker that can accommodate more section types.

**User Story**: As a user, I want an organized way to add different section types so I can quickly find the type I need as more options become available.

**Implementation Notes**:
- Categories:
  - **Basic**: Text, Code, Checklist
  - **Visual**: Diagram, Image
  - **Structured**: Markdown, (future: Table)
- Could be a dropdown, modal, or expandable panel
- Keyboard shortcuts should still work (Alt+T, Alt+C, etc.)

**Complexity**: Low

**Files Likely Affected**:
- `src/lib/components/sections/SectionAddBox.svelte` (or similar)
- May need new component for picker UI

---

### 5. Public Collection Sharing

**Description**: Allow users to mark collections or containers as "public" so they can be accessed via URL without authentication.

**User Story**: As a developer, I want to share my notes publicly via a link so others can view my documentation, tutorials, or code snippets.

**Implementation Notes**:
- Add `is_public` boolean to collections and containers tables
- Add `public_slug` field for friendly URLs (e.g., `/public/my-notes`)
- Update RLS policies to allow read access for public items
- Public view is read-only
- UI toggle in collection/container settings

**Complexity**: Medium

**Technical Considerations**:
- Rate limiting on public routes
- SEO considerations for public pages
- Clear visual indicator when viewing public vs private content
- Slug uniqueness validation

**Database Changes**:
```sql
ALTER TABLE collections ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE collections ADD COLUMN public_slug VARCHAR(100) UNIQUE;

ALTER TABLE note_container ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE note_container ADD COLUMN public_slug VARCHAR(100) UNIQUE;
```

**Files Likely Affected**:
- `src/lib/types/index.ts`
- `src/routes/public/[slug]/` (new routes)
- Collection/container settings UI
- Supabase RLS policies

---

## Implementation Order (Suggested)

1. **Copy as Markdown** - Quick win, immediate value
2. **Advanced Section Picker** - Prepares UI for new section types
3. **Image Section** - High-impact feature for dev workflow
4. **Markdown Section** - Developer favorite
5. **Public Sharing** - Enables growth through sharing

---

## Success Criteria

- All features work on desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile-responsive where applicable
- No regressions in existing functionality
- E2E tests cover new section types
- Documentation updated in `docs/functionality/`
