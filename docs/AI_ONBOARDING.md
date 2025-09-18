# AI Agent Onboarding Guide

## Welcome to Jotter Development

This guide helps AI agents understand the project structure, conventions, and workflow for contributing to Jotter.

## Getting Started

### 1. Essential Reading (Read These First)

- **`docs/README.md`** - Documentation overview and structure
- **`project_overview.md`** - Current project status and technical architecture
- **`docs/ai-tasks/backlog.md`** - Current task priorities and dependencies
- **`docs/functionality/`** - Complete feature documentation (read relevant sections for your task)

### 2. Project Context

- **App Name**: Jotter (displayed as "Jottr" in UI)
- **Purpose**: Lightning-fast, developer-focused note-taking web app
- **Philosophy**: "Notepad++ but better" - speed and simplicity first
- **Tech Stack**: SvelteKit + TypeScript + Supabase + Tailwind CSS

### 3. Architecture Key Points

- **Cache-as-Database**: AppDataManager is single source of truth
- **Optimistic Updates**: UI updates immediately, API calls happen async
- **Drag & Drop**: Hybrid system (custom + svelte-dnd-action)
- **Auto-save**: Debounced saves with draft recovery

## Working with Tasks

### Task Selection

1. **Always check dependencies** in `docs/ai-tasks/backlog.md`
2. **Start with TEST-SETUP-001** if testing infrastructure isn't ready
3. **One task per session** - focus ensures quality
4. **Read acceptance criteria** carefully before starting

### Task Execution Pattern

```markdown
1. Read task description and acceptance criteria
2. Review relevant functionality documentation
3. Examine existing code files mentioned in task
4. Implement solution following project patterns
5. Test your implementation thoroughly
6. Update progress in docs/ai-tasks/completed.md
```

### Progress Updates

Always update `docs/ai-tasks/completed.md` when finishing tasks using this format:

```markdown
### YYYY-MM-DD

- [x] **TASK-ID**: Task description
  - **Result**: What was accomplished
  - **Files**: Which files were created/modified
  - **Notes**: Any important observations or follow-up needed
  - **Time**: How long it took
  - **Agent**: Claude Code / Other
```

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

## Getting Help

### When Stuck

1. **Check existing code** for similar patterns
2. **Review functionality docs** for expected behavior
3. **Look at project_overview.md** for recent changes and known issues
4. **Update task notes** with specific blockers or questions

### Communication

- **Be specific** about what you tried and what failed
- **Include code snippets** for context
- **Reference file names and line numbers** when possible
- **Update progress** even for partial completions

## Success Metrics

### Task Completion

- **Acceptance criteria met**: All requirements satisfied
- **Tests passing**: No broken functionality
- **Code quality**: Follows project conventions
- **Documentation updated**: Progress tracked appropriately

### Code Health Improvements

- **Reduced file sizes**: Large files broken into manageable components
- **Better type safety**: TypeScript errors eliminated
- **Test coverage**: Increased coverage for modified areas
- **Performance**: No regression in app speed

---

**Remember**: Focus on one task at a time, follow the established patterns, and always test your changes thoroughly. The goal is to improve code quality while maintaining Jotter's core principle of speed and simplicity.

Welcome to the team! 🚀
