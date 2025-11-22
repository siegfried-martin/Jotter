# AI Agent Management Overview

## Strategy & Approach

**Vision**: Use AI agents to handle routine development tasks while maintaining code quality and consistency, allowing human developer to focus on architecture and feature design.

**Core Philosophy**: "AI as specialized team members" - different agents for different specialties, with clear handoffs and progress tracking.

**Key Principles**:

- **One agent, one focus** - Each session should have a single, clear objective
- **Documentation-driven** - All context and progress tracked in markdown files
- **Human oversight** - AI handles implementation, human reviews and directs
- **Iterative improvement** - Learn and refine AI management techniques over time

## Current AI Agent Roles

### Testing Specialist Agent

- **Primary Focus**: Test generation and testing infrastructure
- **Skills**: Vitest, Playwright, @testing-library/svelte
- **Responsibilities**: Unit tests, integration tests, E2E test suites
- **Success Metrics**: Test coverage increase, reliable test execution

### Code Health Agent

- **Primary Focus**: TypeScript cleanup, refactoring, code quality
- **Skills**: TypeScript, ESLint, code splitting, performance optimization
- **Responsibilities**: Fix type errors, break down large files, remove debug statements
- **Success Metrics**: Clean TypeScript compilation, reduced file sizes

### Documentation Agent

- **Primary Focus**: API docs, README updates, feature documentation
- **Skills**: Technical writing, code analysis, markdown generation
- **Responsibilities**: Component API docs, architecture updates, changelog maintenance
- **Success Metrics**: Complete documentation coverage, up-to-date guides

### Architecture & Performance Agent

- **Primary Focus**: System architecture, performance optimization, bug fixes
- **Skills**: Cache management, state optimization, reactive systems, debugging
- **Responsibilities**: Fix architectural bugs, optimize re-renders, improve navigation performance
- **Success Metrics**: Smooth UX, minimal re-renders, instant navigation

## AI Management Workflow

### Session Preparation

1. **Review Progress**: Check `docs/ai-tasks/completed.md` for recent work
2. **Select Task**: Choose next priority from `docs/ai-tasks/backlog.md`
3. **Prepare Context**: Gather relevant files and documentation
4. **Set Clear Objectives**: Define success criteria and acceptance requirements

### Agent Onboarding (First Session)

```markdown
**Standard Onboarding Prompt:**
"You are working on Jotter, a SvelteKit note-taking app. Before starting any work:

1. Read `project_overview.md` for current project status
2. Read `docs/AI_ONBOARDING.md` for development conventions
3. Check `docs/ai-tasks/backlog.md` for task priorities
4. Select a task that matches your capabilities and dependencies

Your role is [TESTING SPECIALIST/CODE HEALTH/DOCUMENTATION].
Focus on tasks in that category. Always update progress in
`docs/ai-tasks/completed.md` when finished."
```

### Task Assignment Patterns

- **Critical Path**: Start with TEST-SETUP-001 (testing infrastructure)
- **Parallel Work**: Code health and documentation can run simultaneously
- **Dependencies**: Check task dependencies before assignment
- **Scope Limits**: Keep tasks focused and completable in one session

### Progress Tracking

- **Before Session**: Note current state and goals
- **During Session**: Agent updates progress in real-time
- **After Session**: Review completed work and update backlog
- **Weekly Review**: Assess overall progress and adjust strategy

## Prompting Techniques & Templates

### Testing Specialist Prompts

#### Test Generation Prompt

```markdown
**Objective**: Generate comprehensive test suite for [COMPONENT_NAME]

**Context**:

- Component file: `src/lib/components/[COMPONENT].svelte`
- Functionality: [BRIEF_DESCRIPTION]
- Dependencies: [LIST_KEY_DEPENDENCIES]

**Requirements**:

- Unit tests for all public methods and props
- Integration tests for user interactions
- Mock external dependencies (Supabase, APIs)
- 80%+ code coverage
- Follow existing test patterns in codebase

**Deliverables**:

- Test file: `src/lib/components/[COMPONENT].test.ts`
- Update progress in `docs/ai-tasks/completed.md`
- Report coverage percentage achieved
```

#### E2E Test Prompt

```markdown
**Objective**: Create end-to-end test for [USER_WORKFLOW]

**User Journey**:

1. [STEP_1]
2. [STEP_2]
3. [STEP_3]

**Requirements**:

- Use Playwright test framework
- Mock authentication flow
- Test across Chrome/Firefox
- Include mobile viewport testing
- Handle async operations properly

**Deliverables**:

- Test file: `tests/e2e/[workflow].spec.ts`
- Update test progress tracking
- Document any discovered edge cases
```

### Code Health Prompts

#### TypeScript Cleanup Prompt

```markdown
**Objective**: Eliminate TypeScript errors in [FILE_OR_DIRECTORY]

**Current Issues**: [LIST_SPECIFIC_ERRORS]

**Requirements**:

- Fix all TypeScript errors and warnings
- Maintain existing functionality exactly
- Add proper type annotations
- Follow project TypeScript conventions
- No use of `any` types

**Approach**:

1. Run `npm run type-check` to identify issues
2. Fix errors systematically
3. Test that functionality still works
4. Commit with clear description of changes

**Deliverables**:

- Clean TypeScript compilation
- Updated progress tracking
- List of changes made
```

#### File Size Reduction Prompt

```markdown
**Objective**: Refactor [LARGE_FILE] to reduce complexity

**Current Size**: [LINE_COUNT] lines
**Target**: <200 lines per component

**Strategy**:

- Extract reusable components
- Move logic to utility functions or stores
- Split styles if very large
- Maintain exact functionality

**Requirements**:

- Preserve all existing behavior
- Update imports/exports appropriately
- Test functionality after refactor
- Follow component naming conventions

**Deliverables**:

- Refactored components
- Updated file structure
- Functionality verification
- Progress documentation update
```

### Documentation Prompts

#### API Documentation Prompt

````markdown
**Objective**: Generate API documentation for [COMPONENT_NAME]

**Requirements**:

- Document all props with types and descriptions
- List all events dispatched
- Describe slots available
- Include usage examples
- Follow JSDoc standards where applicable

**Format**: Save as `docs/components/[COMPONENT_NAME].md`

**Template**:

````markdown
# ComponentName

## Props

- `prop: type` - Description

## Events

- `event: payload` - When dispatched

## Slots

- `slot` - Purpose and content expectations

## Usage

\```svelte
<ComponentName prop="value" on:event={handler} />
\```
````
````

#### Architecture Documentation Prompt

```markdown
**Objective**: Update architecture docs with recent changes

**Recent Changes**: [LIST_MAJOR_CHANGES]

**Files to Update**:

- `docs/architecture/data-flow.md`
- `docs/architecture/component-tree.md`

**Requirements**:

- Reflect current codebase accurately
- Update diagrams and examples
- Note any new patterns or conventions
- Highlight areas needing future attention
```

## Progress Tracking

### Overall AI Integration Progress

#### Setup Phase: 90% Complete

- [x] Documentation structure created
- [x] AI onboarding guide written
- [x] Task management system established
- [x] Initial task backlog defined
- [ ] Testing infrastructure setup (TEST-SETUP-001)

#### Active Development Phase: 0% Complete

- [ ] Critical path testing implemented
- [ ] TypeScript errors eliminated
- [ ] Large file refactoring completed
- [ ] Component documentation generated

#### Optimization Phase: 0% Complete

- [ ] Performance improvements implemented
- [ ] Accessibility compliance achieved
- [ ] Mobile experience optimized
- [ ] Bundle size optimized

### Agent Performance Metrics

#### Testing Specialist

- **Sessions Completed**: 0
- **Tests Generated**: 0
- **Coverage Achieved**: 0%
- **Success Rate**: N/A

#### Code Health Agent

- **Sessions Completed**: 0
- **Files Refactored**: 0
- **TypeScript Errors Fixed**: 0
- **Lines of Code Reduced**: 0

#### Documentation Agent

- **Sessions Completed**: 0
- **Components Documented**: 0
- **Architecture Updates**: 0
- **Guides Created**: 2 (onboarding, this overview)

#### Architecture & Performance Agent

- **Sessions Completed**: 2 (November 17, 2025 + November 20, 2025)
- **Bugs Fixed**: 7 (collection creation infinite loop, navigation errors, sections disappearing, drag area, scrolling, rerender issues, thumbnail flash)
- **Features Added**: 2 (collection preloading, load more containers, delete empty sections on cancel)
- **Performance Improvements**: Eliminated re-fetches, instant navigation, full cache preloading with sections

### Weekly Progress Template

```markdown
## Week of [DATE]

### Achievements

- [List completed tasks and major progress]

### Challenges

- [Issues encountered and how resolved]

### Agent Performance

- [Which agents worked well, which struggled]

### Process Improvements

- [Lessons learned, prompt refinements]

### Next Week Focus

- [Priority tasks and approach adjustments]
```

## Lessons Learned & Best Practices

### Effective Prompting Patterns

#### What Works

- **Specific objectives** with clear deliverables
- **Context files** listed explicitly
- **Success criteria** defined upfront
- **Progress tracking** requirements included
- **Examples** of expected output format

#### What Doesn't Work

- Vague instructions like "improve the code"
- Multiple objectives in one session
- Assuming AI knows project context
- No clear completion criteria
- Forgetting to mention progress updates

### Agent Management Insights

#### Session Management

- **Start each session** with context review
- **End each session** with progress documentation
- **Limit scope** to completable work
- **Check dependencies** before task assignment

#### Quality Control

- **Review all AI-generated code** before merging
- **Test functionality** after changes
- **Verify documentation accuracy**
- **Maintain code style consistency**

### Common Issues & Solutions

#### Issue: AI Creates Tests That Don't Test Real Behavior

**Solution**: Provide specific user scenarios and edge cases in prompts

#### Issue: Refactoring Breaks Functionality

**Solution**: Require explicit testing and verification steps in prompts

#### Issue: Documentation Becomes Outdated

**Solution**: Include documentation updates in feature development tasks

#### Issue: Context Window Limitations with Large Codebases

**Solution**: Use focused documentation and specific file references

## Recent Work

### November 20, 2025: Bug Fixes & Cache Optimization

**Branch**: `fix/multiple-bugs-and-cache-optimization`
**Status**: Committed and ready for PR
**Agent**: Architecture & Performance Agent

#### What Was Fixed
- **BUG-001/002**: Sections disappearing on tab navigation (cache preservation issue)
- **BUG-003**: Click/drag area too large on section cards (now limited to card content)
- **BUG-004**: Scrolling issues on collections page (added scrollable wrapper)
- **BUG-005**: Full cache not preloading (now synchronously loads all collections + 10 containers + sections)
- **BUG-006**: Diagram thumbnail flash (prevented double generation)

#### What Was Added
- **FEATURE-001**: Delete empty sections on cancel from edit modal
- **Load More**: Button to load remaining containers beyond first 10
- **Full Section Preload**: All sections for first 10 containers loaded on app start

#### Files Modified (14 files, 416 insertions, 140 deletions)
- `src/lib/stores/core/appDataOperations.ts` - Cache preservation, section preloading
- `src/routes/app/+layout.svelte` - Synchronous cache loading
- `src/lib/dnd/core/DragDetection.ts` - Restricted drag area
- `src/lib/dnd/components/DragZone.svelte` - Restricted click area
- `src/lib/components/containers/ContainerList.svelte` - Load More functionality
- `src/routes/app/+page.svelte` - Scrollable wrapper
- `src/lib/components/DiagramThumbnail.svelte` - Prevented double generation
- Plus 7 more files for delete empty sections feature

**Documentation**: See `docs/bug-tracking/session-2025-11-20-bugs.md` for detailed bug analysis

### November 17, 2025: Collection Cache & Navigation Fixes

**Branch**: `feat/collection-cache-and-preloading`
**Status**: Merged to main
**Agent**: Architecture & Performance Agent

#### What Was Fixed
- Collection creation infinite loop (optimistic cache updates)
- Collection navigation errors (proper state management)
- Spinner flash on cached navigation (eliminated re-fetches)

#### What Was Added
- Preload first 10 containers for all collections on app startup
- Instant navigation between collections (data already cached)
- Optimistic cache updates for new collections

**Technical Details**: See `docs/cache_architecture.md` for full context

## Current Initiatives

### Code Quality Foundation (Priority 1)

**Document**: `docs/initiatives/code-quality-foundation.md`
**Status**: Not Started
**Estimated Duration**: 1-2 sessions
**Goal**: Clean up codebase to establish solid foundation for testing

#### Objectives
1. Eliminate TypeScript warnings - Achieve zero TS errors/warnings
2. Remove unused code - Delete unused components, utilities, imports
3. Code smell cleanup - Fix duplicated code, long functions, unclear naming
4. Improve maintainability - Make codebase easier to understand and modify

#### Why First?
- Low risk cleanup doesn't change functionality
- High value - makes testing and future development easier
- Quick wins build momentum
- Clean code is easier to test and maintain

### Regression Testing (Priority 2)

**Document**: `docs/initiatives/regression-testing.md`
**Status**: Not Started (depends on Code Quality Foundation)
**Estimated Duration**: 2-3 sessions
**Goal**: Establish automated regression testing to prevent bugs

#### Objectives
1. Setup test infrastructure - Install and configure Playwright
2. Critical path coverage - Test core user flows
3. Achieve 80% coverage - Cover main features and edge cases
4. CI/CD integration - Automate test runs on PRs
5. Prevent regressions - Catch bugs before production

#### Why After Code Quality?
- Testing clean code is easier than testing code with smells
- No TypeScript errors means tests won't break from type issues
- Removed unused code means fewer false test failures
- Understanding clean code structure leads to better test design

## Next Session Priorities

### Immediate Tasks (Next 1-2 Sessions)

**Initiative**: Code Quality Foundation

1. **CLEAN-TS-001**: Run `tsc --noEmit` and fix all TypeScript errors
2. **CLEAN-UNUSED-001**: Identify and remove unused components/utilities
3. **CLEAN-IMPORTS-001**: Clean up unused imports across files
4. **CLEAN-CODE-001**: Fix duplicated code and extract common utilities
5. **CLEAN-FUNCTIONS-001**: Break down functions >50 lines

### Short-term Goals (Next 3-4 Sessions)

**Initiative**: Regression Testing

1. **TEST-SETUP-001**: Set up Playwright and testing infrastructure
2. **TEST-CRITICAL-001**: Test authentication flows
3. **TEST-CRITICAL-002**: Test collection CRUD operations
4. **TEST-CRITICAL-003**: Test container CRUD + drag & drop
5. **TEST-CRITICAL-004**: Test section CRUD + drag & drop
6. **TEST-CI-001**: Configure GitHub Actions for automated testing

### Success Metrics

- **Code Quality**: Zero TypeScript errors, all files <300 lines, no commented code
- **Test Coverage**: 80% overall, 100% for critical paths
- **Code Health**: No duplicated code, clear naming, simple conditionals
- **CI/CD**: All tests passing on every PR

## Management Tools & Scripts

### Progress Reporting

```bash
# Generate progress summary
./scripts/ai-progress-report.sh

# Update task completion rates
./scripts/update-ai-metrics.sh
```

### Agent Session Preparation

```bash
# Prepare context for agent session
./scripts/prepare-agent-context.sh [AGENT_TYPE] [TASK_ID]

# Check task dependencies
./scripts/check-task-deps.sh [TASK_ID]
```

### Quality Assurance

```bash
# Verify AI changes don't break functionality
npm run test
npm run type-check
npm run build

# Update documentation after changes
./scripts/update-docs.sh
```

---

**For Next Chat Session**: Use this overview along with `project_overview.md` to understand current project state and AI integration strategy.

**Important**: The app is in a stable state. Next priorities are:
1. Code Quality Foundation (clean up TS errors, unused code, code smells)
2. Regression Testing (Playwright E2E tests for critical paths)

See initiative documents in `docs/initiatives/` for detailed plans.

**Last Updated**: November 20, 2025
**Next Review**: Weekly (every Sunday)
**Current Phase**: Code Quality & Testing Establishment
