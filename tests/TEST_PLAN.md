# E2E Test Plan & Dependencies

## Test Dependency Hierarchy

This document outlines the dependency tree for E2E tests, showing which tests require other tests' setup to run successfully.

### Level 1: Foundation Tests (No Dependencies)

These tests have no external dependencies and can run independently:

**Authentication**
- ✅ Mock authentication setup
- Purpose: Validates auth token injection system

**Collection CRUD**
- ✅ Create collection
- ✅ Navigate to collection
- ✅ Delete collection
- 💤 Edit collection (TEST-001 - commented out, known issue)
- Dependencies: None
- File: `tests/e2e/collection-crud.spec.ts`

### Level 2: Container Tests (Requires: Collection)

These tests require a collection to exist:

**Container CRUD**
- ✅ Create container
- ✅ Navigate between containers
- ✅ Delete container
- ✅ Display section grid
- ✅ Multiple container creation
- Dependencies: Collection must be created first
- Setup: `beforeEach()` creates test collection
- File: `tests/e2e/container-crud.spec.ts`

### Level 3: Section Tests (Requires: Collection + Container)

These tests require both a collection and a container:

**Section CRUD**
- ✅ Create text (WYSIWYG) section - Alt+T
- ✅ Create code section - Alt+K
- ✅ Create draw (diagram) section - Alt+D
- ✅ Create tasks (checklist) section - Alt+L
- ✅ Create multiple section types
- ✅ Delete section
- ✅ Check for reorder capability
- Dependencies: Collection + Container must exist
- Setup: `beforeEach()` creates collection → container
- File: `tests/e2e/section-crud.spec.ts`

### Level 4: Complex Workflows (Requires: Collection + Multiple Items)

**Container Drag-Drop**
- 🔄 Needs rewrite with test data
- Dependencies: Collection + 2+ containers
- Purpose: Verify container reordering within collection
- File: Needs implementation

**Section Drag-Drop**
- ⏸️ Not yet implemented
- Dependencies: Collection + Container + 2+ sections
- Purpose: Verify section reordering within container

**Cross-Container Section Moves**
- ⏸️ Not yet implemented
- Dependencies: Collection + 2+ containers + sections in each
- Purpose: Verify moving sections between containers

**Checklist Regression Test (BUG-CHECKBOX-001)**
- ⏸️ Not yet implemented
- Dependencies: Collection + Container + Checklist section
- Purpose: Verify checkbox state persistence after refresh
- File: Needs implementation

## Test Setup Patterns

### Pattern 1: Self-Contained Tests (Collection CRUD)

Each test creates its own collection:

```typescript
test('should create collection', async ({ page }) => {
  // Creates collection within test
  const name = generateTestName('collection');
  // ... test logic
});
```

### Pattern 2: Shared Setup with beforeEach (Container, Section)

Uses `beforeEach()` to create dependencies:

```typescript
test.describe('Container CRUD', () => {
  let testCollectionId: string;

  test.beforeEach(async ({ page }) => {
    // Create collection (dependency)
    testCollectionId = await createCollection(page);
  });

  test('should create container', async ({ page }) => {
    // Collection already exists from beforeEach
    // Create container here
  });
});
```

### Pattern 3: Progressive Setup (Section CRUD)

Builds up dependencies in order:

```typescript
test.beforeEach(async ({ page }) => {
  // 1. Create collection
  testCollectionId = await createCollection(page);

  // 2. Create container (requires collection)
  testContainerId = await createContainer(page, testCollectionId);

  // Now ready for section tests
});
```

## Test Data Cleanup

**Naming Convention**: All test data uses `e2e-test-{timestamp}-{random}` pattern

**Cascade Delete** (Automatic):
- Deleting collection → automatically deletes all containers + sections
- Deleting container → automatically deletes all sections

**Manual Cleanup**:
```bash
npm run test:cleanup
```

Deletes all `e2e-test-*` collections and cascades to containers/sections.

## Test Execution Order

Tests can run in **parallel** because each creates its own isolated test data. No shared state between tests.

### Recommended Test Run Order (for clarity)

1. Authentication setup (runs first automatically)
2. Collection CRUD (validates foundation)
3. Container CRUD (validates level 2)
4. Section CRUD (validates level 3)
5. Drag-drop tests (validates complex interactions)
6. Regression tests (validates specific bug fixes)

## Test Status Summary

### Completed & Passing
- ✅ Collection CRUD: 4/4 active tests passing (100%) - 1 test commented out (TEST-001)
- ✅ Container CRUD: 6/6 passing (100%)
- ✅ Section CRUD: 8/8 passing (100%)

### Pending Implementation
- ⏸️ Container drag-drop rewrite
- ⏸️ Section drag-drop tests
- ⏸️ Cross-container section moves
- ⏸️ Checklist persistence regression test (BUG-CHECKBOX-001)

### Known Issues (Commented Out)
- 💤 Collection edit test (TEST-001) - commented out, known UI issue documented in `docs/bug-tracking/`

## Adding New Tests

When creating new tests, consider:

1. **What are the dependencies?** (Collection? Container? Sections?)
2. **How many of each?** (Need 2+ containers for drag-drop)
3. **Use beforeEach() for setup** - keeps tests isolated
4. **Follow naming convention** - use `generateTestName()`
5. **Document in this file** - update the hierarchy

## Helper Functions

Located in `tests/e2e/helpers/test-data.ts`:

- `generateTestName(prefix)` - Creates unique test data names
- `wait(ms)` - Simple delay helper
- `shouldCleanup()` - Checks if test data should be deleted

## Next Session Focus

Based on `docs/functionality/` documentation:
- Review each functionality doc
- Identify missing test scenarios
- Implement tests following this dependency hierarchy
- Document test coverage gaps
