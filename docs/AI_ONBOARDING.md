# AI Agent Onboarding Guide

## Welcome to Jotter Development

This guide helps AI agents understand the project structure, conventions, and workflow for contributing to Jotter.

## Getting Started

### 1. Essential Reading (Read These First)

- **`docs/project_overview.md`** - Current project status and technical architecture
- **`docs/ai_overview.md`** - AI agent strategy, recent work, and next priorities
- **`docs/initiatives/`** - Current initiatives (Code Quality Foundation, Regression Testing)
- **`docs/functionality/`** - Complete feature documentation (read relevant sections for your task)
- **`docs/cache_architecture.md`** - Cache system architecture and recent updates

### 2. Project Context

- **App Name**: Jotter
- **Purpose**: Lightning-fast, developer-focused note-taking web app
- **Philosophy**: "Notepad++ but better" - speed and simplicity first
- **Tech Stack**: SvelteKit + TypeScript + Supabase + Tailwind CSS

### 3. Architecture Key Points

- **Cache-as-Database**: AppDataManager is single source of truth
- **Optimistic Updates**: UI updates immediately, API calls happen async
- **Drag & Drop**: Hybrid system (custom + svelte-dnd-action)
- **Auto-save**: Debounced saves with draft recovery

## Working with Initiatives

### Current Approach

The project follows an **initiative-based approach** rather than individual task tracking:

1. **Check current initiative** in `docs/initiatives/` directory
2. **Review objectives and phases** for the active initiative
3. **One focus per session** - work systematically through initiative phases
4. **Follow acceptance criteria** for each initiative

### Initiative Execution Pattern

```markdown
1. Read initiative document fully (objectives, phases, success criteria)
2. Review relevant functionality documentation
3. Identify current phase and specific tasks
4. Implement solutions following project patterns
5. Test implementations thoroughly
6. Update initiative document with progress
7. Commit with clear descriptions of what was accomplished
```

### Current Initiatives (Priority Order)

1. **Code Quality Foundation** (`docs/initiatives/code-quality-foundation.md`)
   - TypeScript cleanup, unused code removal, code smells
   - **Include**: Audit and update functionality documentation
   - Duration: 1-2 sessions

2. **Regression Testing** (`docs/initiatives/regression-testing.md`)
   - Playwright E2E tests driven by functionality documentation
   - Duration: 2-3 sessions

### Progress Tracking

Track progress directly in initiative documents by checking off completed tasks. Update `docs/ai_overview.md` with session summaries when major work is completed.

## Code Conventions

### File Organization

```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── editors/        # Content editors (code, text, checklist, diagram)
│   │   ├── layout/         # Layout components (sidebar, header, etc.)
│   │   └── ui/             # Basic UI elements (buttons, modals, etc.)
│   ├── stores/             # Svelte stores and state management
│   ├── utils/              # Pure functions and utilities
│   └── types/              # TypeScript type definitions
└── routes/                 # SvelteKit pages and layouts
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ChecklistEditor.svelte`)
- **Files**: kebab-case (e.g., `container-sidebar.ts`)
- **Variables**: camelCase (e.g., `currentContainer`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `AUTO_SAVE_DELAY`)

### Testing Patterns

- **Unit tests**: `*.test.ts` alongside source files
- **Component tests**: `*.spec.ts` in component directories
- **E2E tests**: `tests/e2e/*.spec.ts`
- **Test utilities**: `tests/utils/` for shared test helpers

### TypeScript Standards

- **Strict mode enabled** - no `any` types allowed
- **Explicit return types** for exported functions
- **Interface over type** for object shapes
- **Generic constraints** where appropriate

## Common Patterns

### Component Structure

```svelte
<script lang="ts">
	// 1. Imports
	import { createEventDispatcher } from 'svelte';

	// 2. Props
	export let required: string;
	export let optional: string = 'default';

	// 3. Local state
	let localVar: string = '';

	// 4. Derived values
	$: computed = required + optional;

	// 5. Event dispatcher
	const dispatch = createEventDispatcher<{
		action: { data: string };
	}>();

	// 6. Functions
	function handleAction() {
		dispatch('action', { data: localVar });
	}
</script>

<!-- Template with clear structure -->
<div class="container">
	<!-- Content -->
</div>

<style>
	/* Component-specific styles */
</style>
```

### API Interaction Pattern

```typescript
// Always through AppDataManager
import { appDataManager } from '$lib/stores/app-data-manager';

// Optimistic updates
async function updateEntity(id: string, changes: Partial<Entity>) {
	try {
		// 1. Update cache immediately
		appDataManager.updateEntity(id, changes);

		// 2. API call happens automatically in background

		// 3. UI updates reactively via stores
	} catch (error) {
		// 4. AppDataManager handles rollback
		console.error('Update failed:', error);
	}
}
```

## Testing Guidelines

### What to Test

- **Unit**: Pure functions, component logic, data transformations
- **Integration**: Component interactions, store updates, API calls
- **E2E**: Complete user workflows, cross-browser compatibility

### Testing Tools

- **Vitest**: Unit and integration tests
- **@testing-library/svelte**: Component testing
- **Playwright**: E2E browser testing

### Mock Strategy

- **Supabase**: Mock client for predictable test data
- **External APIs**: Mock responses for consistent tests
- **File operations**: Mock file system interactions

## Quality Standards

### Code Quality

- **ESLint/Prettier**: Code formatting and linting
- **TypeScript strict**: No type errors allowed
- **Test coverage**: 80% minimum for new code
- **Performance**: Bundle size monitoring

### Component Guidelines

- **Single responsibility**: Each component has one clear purpose
- **Composition over inheritance**: Use slots and props effectively
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Mobile-first**: Responsive design for all screen sizes

## Common Issues & Solutions

### Drag & Drop System

- **Mixed implementations**: Custom (sections) + svelte-dnd-action (containers)
- **Mobile**: Disable drag on touch devices for better UX
- **Boundaries**: svelte-dnd-action can have snap-back issues

### Performance Considerations

- **Large files**: Target <200 lines per component
- **Bundle size**: Lazy load heavy libraries (Excalidraw, Quill)
- **Memory**: Clean up subscriptions and event listeners

### State Management

- **Single source**: All data flows through AppDataManager
- **Optimistic updates**: UI first, API second, rollback on error
- **Cache invalidation**: Handled automatically by data manager

## Documentation-Driven Development

### Functionality Documentation is Key

The `docs/functionality/` directory is the **source of truth** for:
- Expected behaviors and edge cases
- User workflows and interactions
- Error scenarios and validation rules

**Important**: Functionality documentation drives regression testing. When working on Code Quality Foundation, ensure these docs are accurate and complete before moving to Regression Testing initiative.

## Getting Help

### When Stuck

1. **Check existing code** for similar patterns
2. **Review functionality docs** for expected behavior
3. **Look at ai_overview.md** for recent changes and current focus
4. **Check initiative documents** for context and approach
5. **Review cache_architecture.md** for data flow understanding

### Communication

- **Be specific** about what you tried and what failed
- **Include code snippets** for context
- **Reference file names and line numbers** when possible
- **Update progress** even for partial completions

## Success Metrics

### Initiative Completion

- **Objectives achieved**: All initiative objectives met
- **Success criteria satisfied**: All checkboxes in initiative doc marked complete
- **Tests passing**: No broken functionality
- **Code quality**: Follows project conventions
- **Documentation updated**: Initiative docs and ai_overview.md updated

### Code Health Improvements

- **Zero TypeScript errors**: Clean compilation with strict mode
- **Accurate documentation**: Functionality docs match implementation
- **Test coverage**: 80%+ coverage for critical paths
- **Reduced complexity**: Clear code, no duplication, functions <50 lines
- **Performance**: No regression in app speed

---

**Remember**: Work through initiatives systematically, follow established patterns, and test changes thoroughly. Current focus is on **Code Quality Foundation** (clean code, accurate docs) followed by **Regression Testing** (comprehensive E2E coverage). The goal is to improve code quality while maintaining Jotter's core principle of speed and simplicity.

**Key Points**:
- Functionality documentation drives everything
- Code Quality Foundation comes before Regression Testing
- Keep existing functionality exactly the same
- Commit frequently with clear descriptions

Welcome to the team! 🚀
