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

- **Sessions Completed**: 1 (November 17, 2025)
- **Bugs Fixed**: 2 (collection creation infinite loop, navigation errors)
- **Features Added**: 1 (collection preloading)
- **Performance Improvements**: Eliminated re-fetches, instant navigation

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

## Recent Work (November 17, 2025)

### Completed: Collection Cache & Navigation Fixes

**Branch**: `feat/collection-cache-and-preloading`
**Status**: Ready for PR review and merge
**Agent**: Architecture & Performance Agent

#### What Was Fixed
- Collection creation now updates cache before navigation (eliminated infinite loop)
- Collection navigation between tabs works smoothly (no errors)
- Eliminated spinner flash when navigating to cached collections

#### What Was Added
- Preload first 10 containers for all collections on app startup
- Instant navigation between collections (data already cached)
- Optimistic cache updates for new collections

#### Files Modified
- `src/lib/stores/core/appDataUpdates.ts` - Added optimistic collection updates
- `src/lib/stores/core/appDataOperations.ts` - Added preloading logic
- `src/lib/stores/appDataStore.ts` - Exposed new cache methods
- `src/routes/app/+page.svelte` - Fixed collection creation handler
- `src/routes/app/collections/[collection_id]/+page.svelte` - Fixed navigation state

**Technical Details**: See `docs/cache_architecture.md` for full context

### Next Planned Work: Derived Stores Refactoring

**Branch**: `refactor/derived-stores-architecture` (not started)
**Priority**: High - Will eliminate excessive re-renders app-wide
**Estimated Impact**: 10x reduction in re-renders, smoother UX

See `docs/cache_architecture.md` section on "Planned: Derived Stores Architecture" for implementation plan.

## Next Session Priorities

### Immediate Tasks (Next 1-2 Sessions)

1. **REFACTOR-STORES-001**: Implement derived stores architecture (see `docs/cache_architecture.md`)
2. **TEST-SETUP-001**: Set up testing infrastructure with first Testing Specialist agent
3. **TEST-AUTH-001**: Generate authentication E2E tests
4. **CLEAN-TS-001**: Begin TypeScript error cleanup with Code Health agent

### Short-term Goals (Next 4 Weeks)

- Complete critical path testing (auth, CRUD operations, drag & drop)
- Eliminate all TypeScript errors
- Refactor largest components (<200 lines each)
- Generate API documentation for core components

### Success Metrics

- **Test Coverage**: 80% overall, 100% for critical paths
- **Code Quality**: Zero TypeScript errors, all files <200 lines
- **Documentation**: Complete API docs, up-to-date architecture
- **Agent Efficiency**: <2 hour average task completion time

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

**Important**: Before starting derived stores refactoring, review `docs/cache_architecture.md` for full technical context, current architecture, and implementation plan.

**Last Updated**: November 17, 2025
**Next Review**: Weekly (every Sunday)
**Current Phase**: Active Development (Architecture & Performance focus)
