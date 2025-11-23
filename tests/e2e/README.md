# E2E Testing Documentation

## Overview

This directory contains end-to-end tests for the Jotter application using Playwright. The tests use mock authentication to bypass Google OAuth while maintaining real Supabase connections.

## Current State

### Authentication Setup ✅
- **Mock Auth**: Fully automated authentication using real Supabase tokens injected via localStorage
- **No manual login required**: Tests run completely hands-free
- **Configuration**: Tokens stored in `.env.test`
- **Auth file**: `playwright/.auth/mock-user.json`

### Existing Tests
1. **auth-mock.setup.ts**: Sets up mock authentication (runs before all tests)
2. **smoke.spec.ts**: Basic smoke tests for authenticated navigation
3. **container-drag-drop.spec.ts**: Regression test for BUG-DRAG-001 (currently skips due to insufficient test data)
4. **extract-tokens.spec.ts**: Utility test for extracting auth tokens

### Known Limitations
- Tests currently depend on pre-existing account state
- Container drag-drop test requires 3+ containers but only finds 2
- No automated test data creation/cleanup

## Planned E2E Testing Architecture

### Design Principles
1. **Test Isolation**: Tests create and destroy their own resources
2. **Idempotency**: Tests can run multiple times without side effects
3. **No State Dependencies**: Tests don't rely on pre-existing account data
4. **UI-First**: Focus on testing UI interactions (API seeding is a future goal)

### Test Data Naming Convention

All test resources use a consistent naming pattern for easy identification and cleanup:

```
e2e-test-{timestamp}-{random6digit}
```

**Examples:**
- Collection: `e2e-test-1700000000000-847392`
- Container: `e2e-test-1700000123456-293847`

**Benefits:**
- Easily identifiable as test data
- Unique per test run (timestamp + random number)
- Sortable by creation time
- Can be bulk-deleted by prefix matching

### Cleanup Strategy

**During Tests:**
- Tests clean up resources they create by default
- Use `SKIP_TEST_CLEANUP=1` environment variable to preserve test data for debugging
- Example: `SKIP_TEST_CLEANUP=1 npx playwright test`

**Manual Cleanup:**
- Separate cleanup utility: `npm run test:cleanup`
- Finds and deletes all resources starting with `e2e-test-`
- Should NOT run automatically after every test suite (could mask cleanup failures in tests)

### Planned Test Suite Structure

#### 1. Collection CRUD Tests
```typescript
test.describe('Collection Management', () => {
  let testCollectionId: string;

  test('should create a new collection', async ({ page }) => {
    // Create collection with e2e-test- prefix
    // Store ID for subsequent tests
  });

  test('should navigate to collection', async ({ page }) => {
    // Navigate to created collection
  });

  test('should update collection', async ({ page }) => {
    // Edit name, description, color
  });

  test('should delete collection', async ({ page }) => {
    // Delete and verify removal
  });
});
```

#### 2. Container CRUD Tests
```typescript
test.describe('Container Management', () => {
  let testCollectionId: string;
  let testContainerIds: string[];

  test.beforeAll(async ({ page }) => {
    // Create test collection
  });

  test('should create containers', async ({ page }) => {
    // Create 3+ containers with e2e-test- prefix
  });

  test('should drag and drop containers', async ({ page }) => {
    // Test BUG-DRAG-001 regression
  });

  test.afterAll(async ({ page }) => {
    // Cleanup if SKIP_TEST_CLEANUP != 1
  });
});
```

#### 3. Note CRUD Tests
```typescript
test.describe('Note Management', () => {
  // Create collection → Create container → CRUD notes
});
```

#### 4. Note Checklist Tests
```typescript
test.describe('Note Checklist Functionality', () => {
  // Test BUG-CHECKBOX-001 regression
});
```

### Test Execution Order

1. **auth-mock.setup.ts** - Authenticate
2. **collection-crud.spec.ts** - Collection operations
3. **container-crud.spec.ts** - Container operations (includes drag-drop)
4. **note-crud.spec.ts** - Note operations
5. **checklist.spec.ts** - Checklist functionality

### Implementation Plan

**Phase 1: Test Infrastructure**
1. Create test data helper utilities
   - `generateTestName()` - Creates `e2e-test-{timestamp}-{random}`
   - `shouldCleanup()` - Checks `SKIP_TEST_CLEANUP` env var
2. Implement cleanup script (`tests/scripts/cleanup.ts`)
3. Add npm script: `"test:cleanup": "tsx tests/scripts/cleanup.ts"`

**Phase 2: Collection Tests**
1. Implement collection creation test
2. Implement collection navigation test
3. Implement collection update test
4. Implement collection deletion test
5. Add beforeAll/afterAll cleanup hooks

**Phase 3: Container Tests**
1. Implement container creation test
2. Rewrite container drag-drop test to use created test data
3. Implement container deletion test
4. Add cleanup hooks

**Phase 4: Note Tests**
1. Implement note CRUD operations
2. Implement checklist regression test
3. Add cleanup hooks

**Phase 5: Optimization (Future)**
1. Add API seeding endpoint for test data
   - `POST /api/test/seed-collection`
   - Creates collection with configurable containers/notes
   - Only available in test environments
2. Use API for test setup, UI for test verification

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test container-drag-drop
```

### Headed Mode (Watch Browser)
```bash
npx playwright test container-drag-drop --headed
```

### Debug Mode (Step Through)
```bash
npx playwright test container-drag-drop --debug
```

### With Cleanup Disabled (For Debugging)
```bash
SKIP_TEST_CLEANUP=1 npx playwright test
```

### Manual Cleanup
```bash
npm run test:cleanup
```

## Configuration

### Environment Variables (.env.test)
```bash
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_PROJECT_REF=xxx
TEST_ACCESS_TOKEN=eyJhbGc...  # Fresh token from browser localStorage
TEST_REFRESH_TOKEN=xxx
TEST_USER_ID=xxx
TEST_USER_EMAIL=xxx
SKIP_TEST_CLEANUP=0  # Set to 1 to preserve test data
```

### Playwright Config (playwright.config.ts)
- **Test Dir**: `./tests/e2e`
- **Base URL**: `http://localhost:5174`
- **Projects**:
  - `mock-auth-setup`: Creates authenticated session
  - `chromium`: Runs tests with mock auth
- **Web Server**: Auto-starts dev server (`npm run dev`)

## Troubleshooting

### Tests Skip Due to Insufficient Data
- This is expected in current implementation
- Will be resolved when test data creation is implemented
- Run with `SKIP_TEST_CLEANUP=1` and manually add containers to test collection

### Authentication Failures
- Check that `TEST_ACCESS_TOKEN` in `.env.test` is fresh (tokens expire)
- Get new token from browser localStorage: `sb-{projectRef}-auth-token`
- Update `.env.test` with new token

### Port Conflicts
- If `EADDRINUSE` errors occur, stop other dev servers or Playwright report viewers
- Kill process: `lsof -ti:5174 | xargs kill -9`

## Bug Regression Tests

### BUG-DRAG-001: Container Drag & Drop Persistence
- **File**: `container-drag-drop.spec.ts`
- **Description**: Containers were not persisting reorder after drag-and-drop due to off-by-one error
- **Status**: Test exists but currently skips due to insufficient test data
- **Next Steps**: Implement test data creation in Phase 3

### BUG-CHECKBOX-001: Checklist Checkbox Persistence
- **Status**: Test not yet implemented
- **Next Steps**: Implement in Phase 4

## Future Enhancements

1. **API Test Data Seeding**
   - Endpoint to create collections with configurable test data
   - Faster test setup than clicking through UI
   - Only available in test/dev environments

2. **Visual Regression Testing**
   - Screenshot comparison for UI changes
   - Playwright has built-in visual comparison

3. **Performance Testing**
   - Measure load times for collections with many notes
   - Detect performance regressions

4. **Cross-Browser Testing**
   - Add Firefox and WebKit projects
   - Ensure consistent behavior across browsers

5. **CI/CD Integration**
   - Run tests on every PR
   - Block merges if tests fail
   - Generate test reports in CI
