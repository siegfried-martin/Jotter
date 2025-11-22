# AI Agent Instructions for Jotter

**Welcome!** This document contains all the static knowledge you need to work effectively on the Jotter project. Read this document first when starting any new session.

---

## Getting Started

### Step 1: Read These Documents (In Order)

1. **THIS FILE** (`docs/ai_overview.md`) - Project architecture, code conventions, and working instructions (you're reading it now)
2. **`docs/project_overview.md`** - Understand what Jotter is, its goals, and current features
3. **`docs/ai_project_status.md`** - Current initiatives, recent work, and what to work on next

### Step 2: Review Relevant Documentation

Based on your task, read:
- **`docs/initiatives/`** - Detailed initiative documents (Code Quality Foundation, Regression Testing)
- **`docs/functionality/`** - Feature documentation (authentication, collections, containers, sections, editors)
- **`docs/cache_architecture.md`** - Deep dive into cache system (if working on data/state)

### Step 3: Start Working

Follow the instructions in `docs/ai_project_status.md` for current priorities and tasks.

---

## Project Philosophy & Principles

**Vision**: "Notepad++ but better" - Lightning-fast, developer-focused note-taking

**Core Principles**:
- **Speed first** - Instant navigation, no loading spinners, aggressive caching
- **Developer-focused** - Code blocks, diagrams, checklists optimized for technical notes
- **Simplicity** - Clean UI, intuitive workflows, no unnecessary features
- **Quality over quantity** - Small, focused, well-tested codebase

**AI Development Principles**:
- **One session, one focus** - Each session should have a single, clear objective
- **Documentation-driven** - All context and progress tracked in markdown files
- **Human oversight** - AI handles implementation, human reviews and directs
- **Functionality docs drive tests** - `docs/functionality/` is the source of truth for expected behavior

---

## Technical Architecture

### Tech Stack

- **Frontend**: SvelteKit + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel
- **Testing**: Playwright (E2E), Vitest (unit/integration)

### Key Architectural Patterns

#### Cache-as-Database Pattern

**AppDataManager** is the single source of truth for all application data:

```typescript
import { AppDataManager } from '$lib/stores/appDataStore';

// All data flows through AppDataManager
const collections = await AppDataManager.ensureAllCollections();
const { collection, containers } = await AppDataManager.ensureCollectionData(id);
```

**Key Points**:
- Cache is populated synchronously on app startup (all collections + first 10 containers + sections)
- All reads come from cache (instant, no loading spinners)
- All writes update cache immediately (optimistic updates)
- API calls happen in background, rollback on error

#### Optimistic Updates

```typescript
// 1. Update cache immediately
AppDataManager.updateSectionOptimistically(collectionId, containerId, updatedSection);

// 2. API call happens automatically in background
// 3. UI updates reactively via stores
// 4. On error, AppDataManager handles rollback
```

#### Deep Cloning

All data is deep cloned before caching to prevent mutation bugs:

```typescript
// In appDataOperations.ts
function deepCloneObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return deepCloneArray(obj) as T;
  // ... clone object properties
}
```

**Always return deep clones from cache** to prevent accidental mutations.

#### Drag & Drop System

- **Sections**: Custom pointer-based drag & drop (`src/lib/dnd/`)
- **Containers**: svelte-dnd-action library
- **Cross-collection**: HTML5 drag & drop for collection tab targeting

---

## Code Conventions

### File Organization

```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── editors/        # Content editors (code, text, checklist, diagram)
│   │   ├── containers/     # Container-related components
│   │   ├── sections/       # Section-related components
│   │   ├── layout/         # Layout components (sidebar, header)
│   │   └── ui/             # Basic UI elements (buttons, modals)
│   ├── stores/             # Svelte stores and state management
│   │   └── core/          # Core store modules (operations, updates, utils)
│   ├── dnd/                # Drag & drop system
│   ├── services/           # API services (Supabase calls)
│   ├── utils/              # Pure functions and utilities
│   └── types/              # TypeScript type definitions
└── routes/                 # SvelteKit pages and layouts
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ChecklistEditor.svelte`)
- **Files**: kebab-case (e.g., `container-sidebar.ts`)
- **Variables**: camelCase (e.g., `currentContainer`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `AUTO_SAVE_DELAY`)
- **Types/Interfaces**: PascalCase (e.g., `NoteContainer`, `AppData`)

### Component Structure

```svelte
<script lang="ts">
  // 1. Imports
  import { createEventDispatcher } from 'svelte';
  import type { NoteSection } from '$lib/types';

  // 2. Props (exported variables)
  export let section: NoteSection;
  export let isSelected = false;

  // 3. Local state
  let isEditing = false;

  // 4. Reactive statements
  $: displayTitle = section.title || 'Untitled';

  // 5. Event dispatcher
  const dispatch = createEventDispatcher<{
    select: NoteSection;
    delete: string;
  }>();

  // 6. Functions
  function handleClick() {
    dispatch('select', section);
  }
</script>

<!-- 7. Template -->
<div class="section-card" on:click={handleClick}>
  {displayTitle}
</div>

<!-- 8. Scoped styles -->
<style>
  .section-card {
    /* Component-specific styles */
  }
</style>
```

### TypeScript Standards

- **Strict mode enabled** - No `any` types allowed
- **Explicit return types** for exported functions
- **Interface over type** for object shapes (unless using unions/intersections)
- **Proper type imports**: `import type { Thing } from ...`

```typescript
// Good
export async function loadContainer(id: string): Promise<NoteContainer> {
  return await ContainerService.getContainer(id);
}

// Bad - missing return type, uses 'any'
export async function loadContainer(id: any) {
  return await ContainerService.getContainer(id);
}
```

---

## Agent Roles & Specializations

Different types of work call for different approaches. Understand which role fits your current task:

### Architecture & Performance Agent

**Focus**: System architecture, cache management, performance optimization, bug fixes

**Skills**:
- Cache architecture and optimistic updates
- State management and reactive systems
- Performance profiling and optimization
- Complex debugging

**Success Metrics**: Smooth UX, minimal re-renders, instant navigation, zero bugs

### Code Health Agent

**Focus**: Code quality, refactoring, TypeScript cleanup

**Skills**:
- TypeScript strict mode compliance
- Code smell detection and fixing
- Breaking down large files
- DRY principle enforcement

**Success Metrics**: Zero TypeScript errors, clean compilation, reduced complexity

### Testing Specialist Agent

**Focus**: Test generation and testing infrastructure

**Skills**:
- Playwright E2E testing
- Vitest unit/integration testing
- Test fixtures and mocking
- Documentation-driven test creation

**Success Metrics**: 80%+ coverage, reliable tests, comprehensive E2E coverage

### Documentation Agent

**Focus**: Documentation accuracy and completeness

**Skills**:
- Technical writing
- Auditing docs against implementation
- Feature documentation
- Architecture documentation

**Success Metrics**: Accurate docs, complete coverage, ready to drive testing

---

## Quality Standards

### Code Quality

- **ESLint/Prettier**: Code formatting and linting (automated)
- **TypeScript strict**: Zero type errors allowed
- **File size**: Target <300 lines per component (hard limit: 500)
- **Function length**: Target <50 lines per function
- **No commented code**: Delete unused code, don't comment it out
- **No duplication**: Extract common logic to utilities

### Testing Requirements

- **Unit tests**: Pure functions, component logic, data transformations
- **Integration tests**: Component interactions, store updates
- **E2E tests**: Complete user workflows, critical paths
- **Coverage target**: 80% overall, 100% for critical paths

### Commit Standards

Every commit should:
- Have a clear, descriptive message
- Follow conventional commit format: `type: description`
- Include the AI signature footer:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commit types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Git Workflow

- Create feature branches: `feat/description` or `fix/description`
- Commit frequently with clear messages
- Push when work is complete or at good stopping points
- Create PRs with comprehensive descriptions
- **Never** commit credentials, API keys, or sensitive data

---

## Documentation-Driven Development

### Functionality Documentation is Critical

The `docs/functionality/` directory is the **source of truth** for:
- Expected behaviors and edge cases
- User workflows and interactions
- Error scenarios and validation rules
- Feature descriptions and examples

**Files**:
- `authentication.md` - OAuth, session management, protected routes
- `collections.md` - Collection CRUD, navigation, cache behavior
- `containers.md` - Container CRUD, Load More, drag & drop
- `sections.md` - Section CRUD, cross-container moves, reordering
- `editors/checklist.md` - Checklist editor features
- `editors/code.md` - Code editor features
- `editors/diagram.md` - Diagram editor features
- `editors/rich-text.md` - Rich text editor features

### How Docs Drive Development

1. **Code Quality Foundation Initiative**: Audit and update all functionality docs to match current implementation
2. **Regression Testing Initiative**: Use functionality docs to generate test scenarios
3. **Future Features**: Document expected behavior before implementing

**When functionality and docs diverge**: Update docs first, then ensure code matches.

---

## Working Instructions

### Session Workflow

1. **Read required docs**: ai_overview.md (this file), project_overview.md, ai_project_status.md
2. **Check current initiative**: See `docs/ai_project_status.md` for current focus
3. **Work systematically**: Follow initiative phases, don't skip ahead
4. **Test thoroughly**: Manual testing after each change, automated tests when available
5. **Update status doc**: Suggest updating `ai_project_status.md` when completing work
6. **Commit clearly**: Clear messages, AI signature footer

### Updating ai_project_status.md

**CRITICAL**: You must keep `docs/ai_project_status.md` up to date as you work.

**When to update**:
- After completing initiative tasks or phases
- When finishing significant work
- When discovering issues or changing direction
- After each session with meaningful progress

**How to suggest updates**:
```
"I've completed [WORK DESCRIPTION]. Should I update `docs/ai_project_status.md` to reflect this progress?"
```

Wait for user confirmation, then update:
- Check off completed tasks
- Add new session summary to "Recent Work"
- Update initiative status if needed
- Update agent performance metrics
- Update "Last Updated" date

### Common Patterns

#### Reading from Cache

```typescript
// Sync read (if cached)
const data = AppDataManager.getCollectionDataSync(collectionId);
if (data) {
  // Use cached data
}

// Async ensure (will load if not cached)
const data = await AppDataManager.ensureCollectionData(collectionId);
```

#### Updating Data

```typescript
// Optimistic update
AppDataManager.updateSectionOptimistically(collectionId, containerId, updatedSection);

// Create new item
const newSection = await SectionService.createSection(containerId, sectionData);
AppDataManager.addSectionOptimistically(collectionId, containerId, newSection);

// Delete item
await SectionService.deleteSection(sectionId);
const updatedSections = sections.filter(s => s.id !== sectionId);
AppDataManager.updateSectionsOptimistically(collectionId, containerId, updatedSections);
```

#### Event Dispatching

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    select: { id: string };
    delete: string;
  }>();

  function handleAction() {
    dispatch('select', { id: '123' });
  }
</script>
```

---

## Common Issues & Solutions

### Performance

**Issue**: Component re-renders too frequently
**Solution**: Check if component subscribes to entire store vs specific data. Use derived stores or reactive statements to subscribe only to needed data.

**Issue**: Large bundle size
**Solution**: Lazy load heavy libraries (Excalidraw, Quill). Already implemented for editors.

### State Management

**Issue**: Stale data in UI
**Solution**: Ensure reactive statements reset state when IDs change:
```svelte
$: if (containerId) {
  loadData();
}
```

**Issue**: Data mutations causing bugs
**Solution**: Always use deep cloning when reading from or writing to cache.

### Drag & Drop

**Issue**: Drag starts from padding/wrapper
**Solution**: Check `event.target.closest('.actual-card-class')` before starting drag.

**Issue**: Click fires after drag
**Solution**: Use drag threshold and prevent click events after drag operations.

### TypeScript

**Issue**: Type errors from Svelte components
**Solution**: Use `import type` for type-only imports. Ensure proper type definitions in `$lib/types`.

---

## Getting Help

### When Stuck

1. **Check existing code** for similar patterns (use Grep/Read tools)
2. **Review functionality docs** for expected behavior
3. **Check cache_architecture.md** for data flow understanding
4. **Review ai_project_status.md** for context on recent changes
5. **Ask the user** with specific questions and context

### Communication Guidelines

- **Be specific** about what you tried and what failed
- **Include code snippets** for context
- **Reference file names and line numbers**
- **Suggest solutions** when reporting problems
- **Update progress** even for partial completions

---

## Success Criteria

### For Any Work Session

- ✅ All objectives from ai_project_status.md completed
- ✅ Tests passing (manual testing minimum, automated when available)
- ✅ Code follows project conventions
- ✅ TypeScript compiles without errors
- ✅ Functionality preserved (no regressions)
- ✅ ai_project_status.md updated with progress
- ✅ Clear commit messages with AI signature

### For Code Quality Initiative

- ✅ Zero TypeScript errors/warnings
- ✅ All unused files removed
- ✅ No commented-out code
- ✅ Functions <50 lines
- ✅ Clear, descriptive naming
- ✅ Functionality documentation accurate and complete
- ✅ Build completes without warnings

### For Regression Testing Initiative

- ✅ Playwright fully configured
- ✅ 80%+ coverage of critical user flows
- ✅ All drag & drop operations tested
- ✅ Tests driven by functionality documentation
- ✅ Tests pass consistently (no flakiness)
- ✅ CI/CD pipeline running tests on PRs

---

## Key Reminders

- **Read ai_project_status.md** to know what to work on next
- **Update ai_project_status.md** when you complete work
- **Functionality docs drive everything** - they're the source of truth
- **Code Quality Foundation** must complete before **Regression Testing**
- **Keep existing functionality exactly the same** unless explicitly changing it
- **Commit frequently** with clear descriptions
- **Test thoroughly** after every change
- **Ask questions** when unclear

---

**You're ready to start!** Read `docs/project_overview.md` and `docs/ai_project_status.md` next, then begin working on the current initiative.
