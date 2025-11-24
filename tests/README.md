# Jotter Testing

## Setup

### Install Playwright (Already Done)
```bash
npm install -D @playwright/test
npx playwright install
```

### Install Browser Dependencies (WSL/Linux)
```bash
sudo npx playwright install-deps
```

Or manually:
```bash
sudo apt-get install libnspr4 libnss3 libasound2t64
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (helpful for debugging)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/smoke.spec.ts
```

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests
│   ├── helpers/           # Test utilities and helpers
│   │   └── auth.ts        # Authentication helpers
│   ├── smoke.spec.ts      # Basic smoke tests
│   └── container-drag-drop.spec.ts  # Container DnD regression test
└── README.md              # This file
```

## Authentication for Tests

### How It Works

E2E tests use **real authentication tokens** from a logged-in user session to bypass the Google OAuth flow during tests. This approach:

- ✅ Tests the actual authenticated application flow
- ✅ Bypasses the need for Google OAuth interaction in tests
- ✅ Uses real user permissions and RLS policies
- ⚠️ Requires occasional token updates (see limitations below)

### Token Types

1. **Access Token** (short-lived, ~1 hour)
   - Used for API requests
   - Automatically refreshed when expired
   - Stored in `.env.test` as `TEST_ACCESS_TOKEN`

2. **Refresh Token** (single-use)
   - Used to obtain new access tokens
   - **IMPORTANT**: Can only be used once, then becomes invalid
   - Stored in `.env.test` as `TEST_REFRESH_TOKEN`

### Automatic Token Refresh

The `pretest:e2e` hook runs before every test to check if tokens need refreshing:

```bash
npm run test:refresh-tokens
```

This script:
1. Decodes the JWT access token to check expiration
2. If not expired, skips refresh (prevents consuming the single-use refresh token)
3. If expired, uses the refresh token to get new tokens
4. Automatically updates `.env.test` with new tokens

### When Manual Token Update is Needed

You'll need to manually extract tokens when:

1. **Refresh token exhausted**: The single-use refresh token has already been consumed
2. **First-time setup**: No tokens exist in `.env.test`
3. **Token corruption**: Tokens become invalid for any reason

**Error message**: `AuthApiError: Invalid Refresh Token: Already Used`

### How to Extract Fresh Tokens

**Option 1: Automated Extraction (Recommended)**

```bash
npm run test:extract-tokens
```

This will:
1. Open a browser window
2. Wait for you to log in with Google
3. Automatically extract tokens from localStorage
4. Update `.env.test` with fresh tokens

**Option 2: Manual Extraction**

1. Start the development server: `npm run dev`
2. Log into the app at `http://localhost:5173/app`
3. Open DevTools Console (F12)
4. Run this command:
   ```javascript
   JSON.parse(localStorage.getItem(
     Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
   ))
   ```
5. Copy `access_token` and `refresh_token` to `.env.test`

### Why Not Service Role Key?

Service role keys bypass RLS and have full database access, but:
- Cannot generate JWT tokens for browser sessions
- Would require rewriting the app to support test-mode authentication
- Would not test the real authentication flow

The token-based approach tests the actual application flow while accepting the tradeoff of occasional manual token updates.

### Token Refresh Limitations

Supabase refresh tokens are single-use by design for security:
- Once used, they're immediately invalidated
- A new refresh token is returned with each refresh
- If the refresh fails mid-process, manual intervention is needed

This is a Supabase security feature, not a bug.

## Writing Tests

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/app/feature');
    await expect(page.locator('.element')).toBeVisible();
  });
});
```

## Test Data Management

### Naming Convention

All test-created data uses the pattern: `e2e-test-{timestamp}-{random}`

Example: `e2e-test-20251124-a3f9c`

### Cleanup

```bash
npm run test:cleanup
```

Deletes all test data (collections, containers, sections) created by E2E tests.

**When to run cleanup:**
- Before running full test suite
- After test failures that leave orphaned data
- Periodically to keep test database clean

### Database Schema

**Cascade Delete Hierarchy**:
- Deleting a collection → automatically deletes all containers in that collection
- Deleting a container → automatically deletes all sections in that container

This ensures cleanup is efficient and prevents orphaned data.

## Test Coverage

### Collection CRUD (4/5 passing - 80%)
- ✅ Create collection (`tests/e2e/collection-crud.spec.ts:40`)
- ✅ Navigate to collection (`tests/e2e/collection-crud.spec.ts:87`)
- ❌ Edit collection (TEST-001 - known issue, documented in `docs/bug-tracking/`)
- ✅ Delete collection (`tests/e2e/collection-crud.spec.ts:212`)

### Container CRUD (6/6 passing - 100%)
- ✅ Create container (`tests/e2e/container-crud.spec.ts:42`)
- ✅ Navigate between containers (`tests/e2e/container-crud.spec.ts:69`)
- ✅ Delete container (`tests/e2e/container-crud.spec.ts:119`)
- ✅ Display section grid (`tests/e2e/container-crud.spec.ts:183`)
- ✅ Multiple container creation (`tests/e2e/container-crud.spec.ts:215`)

### Section CRUD (7 tests - ✅ Ready)
- ✅ Create text (WYSIWYG) section - Alt+T (`tests/e2e/section-crud.spec.ts:54`)
- ✅ Create code section - Alt+K (`tests/e2e/section-crud.spec.ts:84`)
- ✅ Create draw (diagram) section - Alt+D (`tests/e2e/section-crud.spec.ts:121`)
- ✅ Create tasks (checklist) section - Alt+L (`tests/e2e/section-crud.spec.ts:149`)
- ✅ Create multiple section types (`tests/e2e/section-crud.spec.ts:185`)
- ✅ Delete section (`tests/e2e/section-crud.spec.ts:220`)
- ✅ Check for reorder capability (`tests/e2e/section-crud.spec.ts:260`)

### Pending Tests
- [ ] Container drag & drop rewrite (needs test data management)
- [ ] Checklist checkbox persistence (BUG-CHECKBOX-001 regression test)

## CI/CD Integration

Tests are configured to run in CI with the `test` script:
```bash
npm test  # Runs both unit tests and E2E tests
```
